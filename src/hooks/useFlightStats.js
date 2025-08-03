import { useMemo } from "react";

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
      if (flight.from) airports.add(flight.from);
      if (flight.to) airports.add(flight.to);
      if (flight.airline) airlines.add(flight.airline);
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
    const westBoundFlights = filteredFlights.filter(
      (flight) =>
        flight.departure_coordinates[1] > flight.arrival_coordinates[1],
    );

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
      totalDistance,
      totalFlightTime,
      airports: airports.size,
      airlines: airlines.size,
      countries: countries.size,
      domesticFlights: domesticFlights.length,
      internationalFlights: internationalFlights.length,
      longHaulFlights: longHaulFlights.length,
      westBoundFlights: westBoundFlights.length,
      shortestFlight,
      longestFlight,
    };
  }, [filteredFlights]);
};
