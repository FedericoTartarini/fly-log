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
    df_iata[["IATA", "ICAO"]],
    df_coords,
    left_on="ICAO",
    right_on="ident"
)


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
        return airport["latitude_deg"], airport["longitude_deg"]
    except IndexError:
        return None


# Load flights data
df_flights = pd.read_csv("./python/flights.csv")
flight_records = df_flights.to_dict("records")

# Enrich flights with coordinates, distance, and estimated time
enriched_flights = []
for flight in flight_records:
    dep_coords = get_airport_coordinates(flight["departure"])
    arr_coords = get_airport_coordinates(flight["arrival"])
    distance = haversine(dep_coords, arr_coords)
    flight_time = estimate_flight_time(distance)

    flight["departure_coordinates"] = dep_coords
    flight["arrival_coordinates"] = arr_coords
    flight["distance_km"] = distance
    flight["flight_time"] = flight_time

    enriched_flights.append(flight)

# Save enriched flight data to JSON
with open("./python/flights_with_coordinates.json", "w") as f:
    json.dump(enriched_flights, f, indent=2)
