import { useMemo } from "react";

// Compute summary stats for the current filtered flights collection.
export const useFlightStats = (filteredFlights) => {
  return useMemo(() => {
    // Calculate total distance and flight time
    const { totalDistance, totalFlightTime } = filteredFlights.reduce(
      (acc, flight) => {
        acc.totalDistance += flight.distance_km || 0;
        acc.totalFlightTime += flight.flight_time || 0;
        return acc;
      },
      { totalDistance: 0, totalFlightTime: 0 },
    );

    // Calculate unique counts
    const airports = new Set();
    const airlines = new Set();
    const countries = new Set();

    filteredFlights.forEach((flight) => {
      if (flight.departure_airport_iata)
        airports.add(flight.departure_airport_iata);
      if (flight.arrival_airport_iata)
        airports.add(flight.arrival_airport_iata);
      if (flight.airline_name) airlines.add(flight.airline_name);
      if (flight.departure_country) countries.add(flight.departure_country);
      if (flight.arrival_country) countries.add(flight.arrival_country);
    });

    // Calculate flight categories
    const domesticFlights = filteredFlights.filter(
      (flight) => flight.departure_country === flight.arrival_country,
    );
    const internationalFlights = filteredFlights.filter(
      (flight) => flight.departure_country !== flight.arrival_country,
    );
    const longHaulFlights = filteredFlights.filter(
      (flight) => flight.distance_km >= 5000,
    );
    const westBoundFlights = filteredFlights.filter((flight) => {
      try {
        const depLon = flight.departure_coordinates[1];
        const arrLon = flight.arrival_coordinates[1];
        // Handle crossing the antimeridian
        if (Math.abs(depLon - arrLon) > 180) {
          return depLon < arrLon;
        }
        return depLon > arrLon;
      } catch (error) {
        console.warn(
          `Flight ${flight.flight_number} from ${flight.departure_airport_iata} to ${flight.arrival_airport_iata} caused an error in westBound calculation: ${error.message}. Please edit this flight.`,
        );
        return false;
      }
    });

    // Find shortest and longest flights
    const shortestFlight = filteredFlights.reduce(
      (shortest, flight) =>
        !shortest || flight.distance_km < shortest.distance_km
          ? flight
          : shortest,
      null,
    );

    const longestFlight = filteredFlights.reduce(
      (longest, flight) =>
        !longest || flight.distance_km > longest.distance_km ? flight : longest,
      null,
    );

    return {
      airlines: airlines.size,
      airports: airports.size,
      countries: countries.size,
      domesticFlights: domesticFlights.length,
      internationalFlights: internationalFlights.length,
      longHaulFlights: longHaulFlights.length,
      longestFlight: longestFlight,
      shortestFlight: shortestFlight,
      totalDistance: totalDistance,
      totalFlightTime: totalFlightTime,
      westBoundFlights: westBoundFlights.length,
    };
  }, [filteredFlights]);
};
