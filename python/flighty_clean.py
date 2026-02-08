"""Convert flighty_export.csv into a cleaned CSV with columns:
departure_date,departure_time,departure_airport_iata,arrival_airport_iata,airline_iata,flight_number

Rules:
- Prefer the "Gate Departure (Scheduled)" datetime to extract date/time; if missing, fall back to "Date" and leave time empty.
- Convert Airline column (which may contain ICAO codes) into IATA using src/assets/airlines.json mapping.
- Keep rows even if some optional fields are missing, but skip rows missing From/To or Airline.

Usage:
    python python/flighty_clean.py

Writes: python/flighty_clean_import.csv
"""
from __future__ import annotations
import csv
import os
import json
from datetime import datetime
from dateutil import parser as dateparser

INPUT_CSV = os.path.join(os.path.dirname(__file__), "flighty_export.csv")
OUTPUT_CSV = os.path.join(os.path.dirname(__file__), "flighty_clean_import.csv")
AIRLINES_JSON = os.path.join(os.path.dirname(__file__), "..", "src", "assets", "airlines.json")

# Column names in the source CSV (as seen in flighty_export.csv)
COL_DATE = "Date"
COL_AIRLINE = "Airline"
COL_FLIGHT = "Flight"
COL_FROM = "From"
COL_TO = "To"
COL_GATE_DEPART_SCHEDULED = "Gate Departure (Scheduled)"
COL_GATE_DEPART_ACTUAL = "Gate Departure (Actual)"

OUTPUT_FIELDS = [
    "departure_date",
    "departure_time",
    "departure_airport_iata",
    "arrival_airport_iata",
    "airline_iata",
    "flight_number",
]


def load_airlines_mapping(path: str) -> dict:
    """Load airlines.json and return mappings:
    - icao_to_iata: maps ICAO (3-letter) upper -> IATA (2-letter) upper
    - name_to_iata: maps airline name lower -> IATA
    """
    icao_to_iata = {}
    name_to_iata = {}
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
            for entry in data:
                iata = (entry.get("iata") or "").strip().upper()
                icao = (entry.get("icao") or "").strip().upper()
                name = (entry.get("name") or entry.get("airline_name") or "").strip().lower()
                if icao and iata:
                    icao_to_iata[icao] = iata
                if name and iata:
                    name_to_iata[name] = iata
    except FileNotFoundError:
        print(f"Warning: airlines info file not found at {path}. ICAO->IATA conversion will be skipped.")
    except Exception as e:
        print(f"Warning: failed to load airlines mapping: {e}")
    return {"icao_to_iata": icao_to_iata, "name_to_iata": name_to_iata}


def parse_date_time(row: dict) -> tuple[str, str]:
    """Return (date_str, time_str) where date_str is YYYY-MM-DD and time_str is HH:MM.
    Prefer the scheduled gate departure datetime; if not present, fall back to Date column (date only).
    """
    dt_text = (row.get(COL_GATE_DEPART_SCHEDULED) or "").strip()

    if not dt_text:
        # try actual gate departure
        dt_text = (row.get(COL_GATE_DEPART_ACTUAL) or "").strip()

    if dt_text:
        try:
            dt = dateparser.parse(dt_text)
            date_str = dt.date().isoformat()
            time_str = dt.time().strftime("%H:%M") if dt.time() else ""
            return date_str, time_str
        except Exception:
            pass

    # fallback to Date column (may be YYYY-MM-DD). If present, return date and empty time
    date_only = (row.get(COL_DATE) or "").strip()
    if date_only:
        try:
            d = dateparser.parse(date_only)
            return d.date().isoformat(), ""
        except Exception:
            # As last resort, try to trim to first 10 chars
            return date_only[:10], ""

    return "", ""


def normalize_airline(airline_raw: str, mappings: dict) -> str:
    """Normalize the airline field to a 2-letter IATA code.
    - If airline_raw is already 2 letters, return uppercased value.
    - If 3 letters, treat as ICAO and try to map to IATA via mappings['icao_to_iata'].
    - Otherwise, try to match by airline name (case-insensitive) using mappings['name_to_iata'].
    - If no mapping found, return original trimmed value (uppercased) or empty string.
    """
    if not airline_raw:
        return ""
    v = airline_raw.strip()
    if not v:
        return ""
    up = v.upper()
    # If already 2-letter code, assume it's IATA
    if len(up) == 2 and up.isalpha():
        return up
    # If looks like ICAO (3 letters) try mapping
    if len(up) == 3 and up.isalpha():
        mapped = mappings.get("icao_to_iata", {}).get(up)
        if mapped:
            return mapped
        # also try partial lookup: sometimes the CSV uses a combined prefix
    # Try name-based mapping (lowercased)
    name_key = v.lower()
    mapped_by_name = mappings.get("name_to_iata", {}).get(name_key)
    if mapped_by_name:
        return mapped_by_name

    # As a last resort, return original trimmed uppercase if it looks like letters, otherwise empty
    return up if up.isalpha() and len(up) <= 3 else ""


def convert(input_path: str = INPUT_CSV, output_path: str = OUTPUT_CSV) -> None:
    mappings = load_airlines_mapping(AIRLINES_JSON)
    processed = 0
    skipped = 0

    with open(input_path, newline="", encoding="utf-8") as inf, open(
        output_path, "w", newline="", encoding="utf-8"
    ) as outf:
        reader = csv.DictReader(inf)
        writer = csv.DictWriter(outf, fieldnames=OUTPUT_FIELDS)
        writer.writeheader()

        for i, row in enumerate(reader, start=1):
            # Basic required fields
            dep_airport = (row.get(COL_FROM) or "").strip()
            arr_airport = (row.get(COL_TO) or "").strip()
            airline = (row.get(COL_AIRLINE) or "").strip()
            flight_num = (row.get(COL_FLIGHT) or "").strip()

            if not dep_airport or not arr_airport or not airline:
                skipped += 1
                print(f"Skipping row {i}: missing dep/arr/airline -> {dep_airport!r}/{arr_airport!r}/{airline!r}")
                continue

            date_str, time_str = parse_date_time(row)

            airline_iata = normalize_airline(airline, mappings)
            if not airline_iata:
                print(f"Warning: row {i}: could not normalize airline '{airline}'. Leaving blank.")

            out_row = {
                "departure_date": date_str,
                "departure_time": time_str,
                "departure_airport_iata": dep_airport,
                "arrival_airport_iata": arr_airport,
                "airline_iata": airline_iata,
                "flight_number": flight_num,
            }

            writer.writerow(out_row)
            processed += 1

    print(f"Done. Processed {processed} rows, skipped {skipped} rows. Output -> {output_path}")


if __name__ == "__main__":
    if not os.path.exists(INPUT_CSV):
        print(f"Input file not found: {INPUT_CSV}")
    else:
        convert()
