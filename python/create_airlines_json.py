import requests
import csv
import json
import io

# --- Configuration ---
# Source 1: besrourms (Good for Names, IATA, Logos)
BESROURMS_URL = (
    "https://raw.githubusercontent.com/besrourms/airlines/master/airlines.json"
)

# Source 2: OpenFlights (Good for ICAO)
OPENFLIGHTS_URL = (
    "https://raw.githubusercontent.com/jpatokal/openflights/master/data/airlines.dat"
)


def fetch_openflights_icao():
    """
    Fetches OpenFlights CSV and returns a dictionary mapping IATA -> ICAO
    Example: { 'AA': 'AAL', 'DL': 'DAL' }
    """
    print(f"Fetching OpenFlights data from {OPENFLIGHTS_URL}...")
    response = requests.get(OPENFLIGHTS_URL)
    response.raise_for_status()

    # OpenFlights CSV format: ID, Name, Alias, IATA, ICAO, ...
    decoded_content = response.content.decode("utf-8")
    csv_reader = csv.reader(io.StringIO(decoded_content))

    lookup = {}
    for row in csv_reader:
        if len(row) < 5:
            continue

        iata = row[3]
        icao = row[4]
        active = row[7]

        # Filter valid IATA, ICAO and Active airlines
        if iata and iata != "\\N" and icao and icao != "\\N" and active == "Y":
            lookup[iata] = icao

    return lookup


def main():
    # 1. Get the ICAO lookup map
    icao_lookup = fetch_openflights_icao()

    # 2. Get the base list (Names + Logos)
    print(f"Fetching Besrourms data from {BESROURMS_URL}...")
    base_data = requests.get(BESROURMS_URL).json()

    final_airlines = []

    print("Merging data...")
    for entry in base_data:
        iata = entry.get("code")
        name = entry.get("name")
        logo_url = entry.get("logo")

        # Skip if missing essential data
        if not iata or not name:
            continue

        # Find the matching ICAO code, or use None/null if not found
        icao = icao_lookup.get(iata, None)

        # Create the simplified object
        airline_obj = {"name": name, "icao": icao, "iata": iata, "icon": logo_url}

        final_airlines.append(airline_obj)

    # 3. Save to file
    output_filename = "../src/assets/airlines.json"
    with open(output_filename, "w", encoding="utf-8") as f:
        json.dump(final_airlines, f, indent=2)

    print(f"Success! Saved {len(final_airlines)} airlines to {output_filename}")


if __name__ == "__main__":
    main()
