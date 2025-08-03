// src/utils/flightUtils.js
/**
 * Filters flights based on the selected year or category.
 * @param {import('../types').Flight[]} allFlights - The array of all flights.
 * @param {string} selectedYear - The selected year or category ('all', 'upcoming', or a specific year).
 * @returns {import('../types').Flight[]} The filtered array of flights.
 */
export function getFilteredFlights(allFlights, selectedYear) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const pastFlights = allFlights.filter(
    (flight) => new Date(flight.date) <= today,
  );
  const upcomingFlights = allFlights.filter(
    (flight) => new Date(flight.date) > today,
  );

  if (selectedYear === "all") {
    return pastFlights;
  }
  if (selectedYear === "upcoming") {
    return upcomingFlights;
  }
  return pastFlights.filter(
    (flight) => new Date(flight.date).getFullYear().toString() === selectedYear,
  );
}
