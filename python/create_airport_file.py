import requests
import csv
import json
import io
import os

# --- Configuration ---
AIRPORTS_URL = "https://davidmegginson.github.io/ourairports-data/airports.csv"
COUNTRIES_URL = "https://davidmegginson.github.io/ourairports-data/countries.csv"

# Filter Settings: Only keep these types
# 'large_airport': Major hubs
# 'medium_airport': Regional commercial airports
ALLOWED_TYPES = {"large_airport", "medium_airport"}


def fetch_country_names():
    print(f"Fetching countries from {COUNTRIES_URL}...")
    response = requests.get(COUNTRIES_URL)
    response.raise_for_status()
    csv_reader = csv.DictReader(io.StringIO(response.content.decode("utf-8")))
    return {row["code"]: row["name"] for row in csv_reader if row.get("code")}


def main():
    country_lookup = fetch_country_names()

    print(f"Fetching airports from {AIRPORTS_URL}...")
    response = requests.get(AIRPORTS_URL)
    response.raise_for_status()

    csv_reader = csv.DictReader(io.StringIO(response.content.decode("utf-8")))

    final_airports = []

    print("Filtering and processing airports...")
    for row in csv_reader:
        iata = (row.get("iata_code") or "").strip()
        airport_type = (row.get("type") or "").strip()

        # 1. Filter by Type (Major airports only)
        if airport_type not in ALLOWED_TYPES:
            continue

        # 2. Filter by IATA existence (Must have a commercial booking code)
        if not iata:
            continue

        # Resolve Country Name and ISO code
        iso_code = (row.get("iso_country") or "").strip()
        full_country_name = country_lookup.get(iso_code, iso_code or "")

        # Parse numeric fields safely
        try:
            lat = float(row.get("latitude_deg") or 0.0)
        except (ValueError, TypeError):
            lat = 0.0
        try:
            lon = float(row.get("longitude_deg") or 0.0)
        except (ValueError, TypeError):
            lon = 0.0
        try:
            elev = int(row.get("elevation_ft") or 0)
        except (ValueError, TypeError):
            elev = 0

        # Build object in the exact schema expected by the app
        airport_obj = {
            "iata": iata,
            "airport_name": (row.get("name") or "").strip(),
            "city": (row.get("municipality") or "").strip(),
            "country": full_country_name,
            "lat": lat,
            "lon": lon,
            "iso_country": iso_code,
            "iso_region": (row.get("iso_region") or "").strip(),
            "elevation": elev,
        }

        final_airports.append(airport_obj)

    # Sort alphabetically by IATA code for easier debugging/searching
    final_airports.sort(key=lambda x: x["iata"])

    # Write to python/airports_info.json (the file imported by src/utils/airportsInfo.ts)
    output_filename = "../src/assets/major_airports.json"
    with open(output_filename, "w", encoding="utf-8") as f:
        json.dump(final_airports, f, indent=2, ensure_ascii=False)

    print(f"Success! Saved {len(final_airports)} major airports to {output_filename}")


if __name__ == "__main__":
    main()
