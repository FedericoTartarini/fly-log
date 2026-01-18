#!/usr/bin/env python3
"""
migrate_supabase_to_firestore.py

Migrate exported Supabase CSV flight records into Firestore under the path:
  /flights/{uid}/records/{autoDocId}

Usage:
  python migrate_supabase_to_firestore.py \
    --csv python/flighty_export.csv \
    --service-account /path/to/serviceAccount.json \
    --target-uid SOME_UID

You can instead tell the script to preserve the original user id from a column in the CSV
(e.g. `supabase_user_id`) by passing `--user-field supabase_user_id`. When `--user-field` is
used the script will look for that column on each row and use its value as the target uid for
that row. If a row has no value for that column it will skip the row (or you can provide
`--fallback-uid`).

Options:
  --csv PATH                Path to CSV file (default: python/flighty_export.csv)
  --service-account PATH    Path to Firebase service account JSON file (required)
  --project-id ID           Optional Firebase project id
  --target-uid UID          Target Firestore user id to import all rows under (mutually exclusive with --user-field)
  --user-field FIELDNAME    Name of the CSV column that stores the original user id to preserve (mutually exclusive with --target-uid)
  --fallback-uid UID        If using --user-field and a row is missing the user field, use this uid instead
  --batch-size N            Number of writes per batch commit (default: 450)
  --dry-run                 Parse and show what would be written but don't call Firestore
  --limit N                 Limit number of rows processed (for quick tests)
  --verbose                 Print more logging and row-level details

Notes:
- The script converts ISO-like `departure_date` strings into Python datetime objects so Firestore
  will store them as timestamps.
- Output documents will include a `created_at` field set to Firestore server timestamp.
- Make sure the service account JSON has Firestore access and the project matches the target Firestore.

"""

import argparse
import csv
import sys
import os
from datetime import datetime
from typing import Any, Dict, Optional

try:
    import firebase_admin
    from firebase_admin import credentials, initialize_app, firestore
except Exception as e:
    print("Missing python package 'firebase-admin'. Install with: pip install firebase-admin")
    raise

try:
    from dateutil import parser as date_parser
except Exception:
    print("Missing python package 'python-dateutil'. Install with: pip install python-dateutil")
    raise


def parse_args():
    p = argparse.ArgumentParser(description="Migrate Supabase-exported flights CSV into Firestore")
    p.add_argument("--csv", default="python/flighty_export.csv", help="Path to CSV file")
    p.add_argument("--service-account", required=True, help="Path to Firebase service account JSON file")
    p.add_argument("--project-id", default=None, help="Optional Firebase project id")
    group = p.add_mutually_exclusive_group(required=True)
    group.add_argument("--target-uid", help="Write all flights under this single user id")
    group.add_argument("--user-field", help="CSV column name that contains the user id per row")
    p.add_argument("--fallback-uid", default=None, help="When using --user-field, fallback uid for rows missing that field")
    p.add_argument("--batch-size", type=int, default=450, help="Batch commit size (max 500)")
    p.add_argument("--dry-run", action="store_true", help="Do not write to Firestore; only show what would be written")
    p.add_argument("--limit", type=int, default=0, help="Limit number of rows processed (0 == all)")
    p.add_argument("--verbose", action="store_true", help="Verbose logging")
    return p.parse_args()


def init_firestore(sa_path: str, project_id: Optional[str] = None):
    if not os.path.exists(sa_path):
        raise FileNotFoundError(f"Service account file not found: {sa_path}")

    cred = credentials.Certificate(sa_path)
    opts = {}
    if project_id:
        opts["projectId"] = project_id

    app = initialize_app(cred, opts) if not firebase_admin._apps else firebase_admin.get_app()
    db = firestore.client()
    return db


def parse_date(value: Any) -> Optional[datetime]:
    if value is None or (isinstance(value, str) and value.strip() == ""):
        return None
    if isinstance(value, datetime):
        return value
    try:
        dt = date_parser.parse(str(value))
        return dt
    except Exception:
        return None


def convert_row_to_doc(row: Dict[str, Any], verbose: bool = False) -> Dict[str, Any]:
    # Normalize keys to lower-case trimmed
    data = {}
    for k, v in row.items():
        if k is None:
            continue
        key = k.strip()
        if key == "":
            continue
        key_norm = key.lower()
        data[key_norm] = v.strip() if isinstance(v, str) else v

    doc: Dict[str, Any] = {}

    # Map known fields (best-effort). Keep all unknown fields too.
    # Known fields: departure_date, departure_time, departure_airport_iata, arrival_airport_iata, airline_iata, flight_number
    if "departure_date" in data:
        d = parse_date(data["departure_date"]) or data["departure_date"]
        doc["departure_date"] = d
    if "departure_time" in data:
        doc["departure_time"] = data["departure_time"]
    if "departure_airport_iata" in data:
        doc["departure_airport_iata"] = data["departure_airport_iata"]
    if "arrival_airport_iata" in data:
        doc["arrival_airport_iata"] = data["arrival_airport_iata"]
    if "airline_iata" in data:
        doc["airline_iata"] = data["airline_iata"]
    if "flight_number" in data:
        doc["flight_number"] = data["flight_number"]

    # Include any other fields present (keep original keys)
    for k, v in data.items():
        if k not in doc and k not in ("supabase_user_id", "user_id"):
            doc[k] = v

    if verbose:
        print("Converted doc:", doc)
    return doc


def commit_batch(db, batch_ops):
    # batch_ops is list of (doc_ref, data)
    batch = db.batch()
    for doc_ref, data in batch_ops:
        batch.set(doc_ref, data)
    batch.commit()


def main():
    args = parse_args()

    csv_path = args.csv
    sa_path = args.service_account
    project_id = args.project_id
    target_uid = args.target_uid
    user_field = args.user_field
    fallback_uid = args.fallback_uid
    batch_size = max(1, min(args.batch_size, 450))
    dry_run = args.dry_run
    limit = args.limit
    verbose = args.verbose

    if not os.path.exists(csv_path):
        print(f"CSV file not found: {csv_path}")
        sys.exit(1)

    if dry_run:
        print("DRY RUN mode - no writes will be sent to Firestore")

    print(f"Reading CSV: {csv_path}")

    db = None
    if not dry_run:
        print("Initializing Firestore client...")
        db = init_firestore(sa_path, project_id)
        print("Firestore initialized")

    total_rows = 0
    success = 0
    skipped = 0
    errors = 0

    batch_ops = []

    with open(csv_path, newline="", encoding="utf-8") as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            if limit and total_rows >= limit:
                break
            total_rows += 1

            # Determine uid for this row
            if user_field:
                uid = None
                # try a few common key variants
                for candidate in (user_field, user_field.lower(), user_field.upper()):
                    if candidate in row and row[candidate] and row[candidate].strip() != "":
                        uid = row[candidate].strip()
                        break
                if not uid:
                    uid = fallback_uid
                if not uid:
                    print(f"Row {total_rows}: no user id found in field '{user_field}', skipping")
                    skipped += 1
                    continue
            else:
                uid = target_uid

            try:
                doc = convert_row_to_doc(row, verbose=verbose)
                # Add created_at server timestamp sentinel
                if not dry_run:
                    # Firestore Python admin accepts datetime objects and will store as timestamp
                    # For server timestamp, use firestore.SERVER_TIMESTAMP
                    doc["created_at"] = firestore.SERVER_TIMESTAMP
                    # Convert departure_date if it's datetime-like; convert_row_to_doc returns datetime or string
                    if isinstance(doc.get("departure_date"), datetime):
                        pass  # Firestore will accept datetime
                    # Prepare doc ref under flights/{uid}/records/{autoId}
                    doc_ref = db.collection("flights").document(uid).collection("records").document()
                    batch_ops.append((doc_ref, doc))

                    # Commit when batch full
                    if len(batch_ops) >= batch_size:
                        commit_batch(db, batch_ops)
                        success += len(batch_ops)
                        print(f"Committed batch of {len(batch_ops)} (total success: {success})")
                        batch_ops = []
                else:
                    # Dry run: print sample
                    print(f"[DRY] Row {total_rows} -> uid={uid} doc={doc}")
                    success += 1
            except Exception as e:
                print(f"Row {total_rows} error: {e}")
                errors += 1

    # Final commit remaining
    if not dry_run and batch_ops:
        try:
            commit_batch(db, batch_ops)
            success += len(batch_ops)
            print(f"Committed final batch of {len(batch_ops)} (total success: {success})")
        except Exception as e:
            print(f"Error committing final batch: {e}")
            errors += len(batch_ops)

    print("--- Summary ---")
    print(f"Rows processed: {total_rows}")
    print(f"Success: {success}")
    print(f"Skipped: {skipped}")
    print(f"Errors: {errors}")


if __name__ == "__main__":
    main()

