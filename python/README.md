Migration helper: Supabase CSV -> Firestore

This folder contains a script to import Supabase exported CSV flights into Firestore.

Prerequisites
- Python 3.8+
- A Firebase service account JSON with Firestore permissions

Install dependencies

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Dry run to preview operations without writing:

```bash
python python/migrate_supabase_to_firestore.py --csv python/flighty_export.csv --service-account /path/to/serviceAccount.json --target-uid YOUR_UID --dry-run --limit 10 --verbose
```

Example usage

```bash
python migrate_supabase_to_firestore.py \
  --csv flighty_export.csv \
  --service-account /path/to/serviceAccount.json \
  --target-uid NEW_FIRESTORE_USER_ID
```

To preserve original user ids stored in a CSV column named `supabase_user_id`:

```bash
python migrate_supabase_to_firestore.py \
  --csv flighty_export.csv \
  --service-account /path/to/serviceAccount.json \
  --user-field supabase_user_id \
  --fallback-uid SOME_FALLBACK_UID
```

Notes
- Script writes flight documents under `flights/{uid}/records/{docId}`
- Created documents will have a `created_at` server timestamp assigned by Firestore
- Use `--dry-run` to preview operations without writing

