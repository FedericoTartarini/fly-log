import pandas as pd
import math
import json


def haversine(coord1, coord2):
    """
    Calculate the great-circle distance between two points on the Earth surface.

    Args:
        coord1 (tuple): (latitude, longitude) of the first point in decimal degrees.
        coord2 (tuple): (latitude, longitude) of the second point in decimal degrees.

    Returns:
        float: Distance in kilometers between the two points.
    """
    if not coord1 or not coord2:
        return None

    R = 6371  # Earth radius in kilometers
    lat1, lon1 = coord1
    lat2, lon2 = coord2

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = (
        math.sin(dphi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def estimate_flight_time(distance_km, avg_speed_kmh=900):
    """
    Estimate flight time based on distance and average speed.

    Args:
        distance_km (float): Distance in kilometers.
        avg_speed_kmh (float): Average speed in km/h (default: 900).

    Returns:
        float: Estimated flight time in hours, or None if distance is None.
    """
    if distance_km is None:
        return None
    return distance_km / avg_speed_kmh


# Load airport data
df_iata = pd.read_csv("./python/airports_iata.csv")
df_coords = pd.read_csv("./python/airports_coordinates.csv")

# Merge IATA/ICAO codes with coordinates
df_airports = pd.merge(
    df_iata, df_coords, left_on="ICAO", right_on="ident"
)
df_airports = df_airports.rename(
    columns={"latitude_deg": "lat", "longitude_deg": "lon"}
)

df_airports = df_airports[['IATA', 'Airport name', 'Country', 'City',
       'type', "lat", 'lon',
       'elevation_ft', 'iso_country', 'iso_region']]
# remove closed airports
df_airports = df_airports[df_airports["type"] != "closed"]
df_airports = df_airports[df_airports["type"] != "heliport"]


custom_data = {"IATA": "TFU", "lat": 30.31, "lon": 104.44, "iso_country": "CN"}
df_airports = pd.concat([df_airports, pd.DataFrame([custom_data])], ignore_index=True)

df_airports.columns = [
    col.replace(" ", "_").lower() for col in df_airports.columns
]
df_airports["elevation"] = df_airports["elevation_ft"] / 3.28084  # Convert feet to meters
df_airports = df_airports.drop(columns=["elevation_ft", "type"])

df_airports = df_airports.fillna("null")
with open("./python/airports_info.json", "w") as f:
    json.dump(df_airports.to_dict("records"), f, indent=2)

print(f"There are {len(df_airports)} airports in the dataset.")


def get_airport_coordinates(iata_code):
    """
    Retrieve the (latitude, longitude) tuple for a given airport IATA code.

    Args:
        iata_code (str): IATA code of the airport.

    Returns:
        tuple: (latitude, longitude) if found, else None.
    """
    try:
        airport = df_airports[df_airports["IATA"] == iata_code].iloc[0]
        return airport["lat"], airport["lon"]
    except IndexError:
        return None


def get_iso_country(iata_code):
    """
    Retrieve the ISO country code for a given airport IATA code.

    Args:
        iata_code (str): IATA code of the airport.

    Returns:
        str: ISO country code if found, else None.
    """
    try:
        airport = df_airports[df_airports["IATA"] == iata_code].iloc[0]
        return airport["iso_country"]
    except IndexError:
        return None


# Load flights data
df_flights = pd.read_csv("./python/flights_export.csv")
df_flights = df_flights.fillna("null")

# drop columns that are not needed
columns_to_drop = [
    "Dep Terminal",
    "Dep Gate",
    "Arr Terminal",
    "Arr Gate",
    "Canceled",
    "Diverted To",
    "Gate Departure (Scheduled)",
    "Gate Departure (Actual)",
    "Take off (Scheduled)",
    "Take off (Actual)",
    "Landing (Scheduled)",
    "Landing (Actual)",
    "Gate Arrival (Scheduled)",
    "Gate Arrival (Actual)",
    "Tail Number",
    "PNR",
    "Seat",
    "Seat Type",
    "Cabin Class",
    "Flight Reason",
    "Notes",
    "Flight Flighty ID",
    "Airline Flighty ID",
    "Departure Airport Flighty ID",
    "Arrival Airport Flighty ID",
    "Diverted To Airport Flighty ID",
    "Aircraft Type Flighty ID",
]
df_flights = df_flights.drop(columns=columns_to_drop)
df_flights.columns = [
    col.replace(" ", "_").lower() for col in df_flights.columns
]
df_flights = df_flights.rename(columns={"flight": "flight_number"})

flight_records = df_flights.to_dict("records")

# Load airlines.json
with open("./python/airlines.json", "r") as f:
    airlines = json.load(f)

# Build lookup by ICAO code
airline_lookup = {a["icao"]: a for a in airlines}

# Enrich flights with coordinates, distance, and estimated time
enriched_flights = []
for flight in flight_records:
    dep_coords = get_airport_coordinates(flight["from"])
    dep_country = get_iso_country(flight["from"])
    arr_coords = get_airport_coordinates(flight["to"])
    arr_country = get_iso_country(flight["to"])
    distance = haversine(dep_coords, arr_coords)
    flight_time = estimate_flight_time(distance)
    icao = flight["airline"]
    airline_info = airline_lookup.get(icao)

    if dep_coords is None or arr_coords is None:
        print(
            f"Warning: Coordinates not found for flight {flight['Flight']}, form {flight['from']} to {flight['to']}. Skipping this flight."
        )
        continue

    flight["departure_coordinates"] = dep_coords
    flight["arrival_coordinates"] = arr_coords
    flight["distance_km"] = distance
    flight["flight_time"] = flight_time
    flight["departure_country"] = dep_country
    flight["arrival_country"] = arr_country
    if dep_country != arr_country:
        flight["international"] = True
    else:
        flight["international"] = False

    if airline_info:
        airline_name = airline_info["name"]
        flight["airline_name"] = airline_name
        flight["airline_primary_color"] = airline_info["branding"]["primary_color"]
        # Compose icon path (e.g., src/assets/airlines_logos/JST/icon.png)
        icon_name = airline_name.replace(" ", "-").lower()
        icon_type = airline_info["branding"]["variations"]
        if "logo" in icon_type:
            icon_path = f"{icon_name}.svg"
        elif "logo_mono" in icon_type:
            icon_path = f"{icon_name}_mono.svg"
        else:
            icon_name = None
        flight["airline_icon_path"] = icon_path
    else:
        flight["airline_name"] = None
        flight["airline_primary_color"] = None
        flight["airline_icon_path"] = None

    enriched_flights.append(flight)

# Save enriched flight data to JSON
with open("./python/flights_with_coordinates.json", "w") as f:
    json.dump(enriched_flights, f, indent=2)
