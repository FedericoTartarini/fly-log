export const getDeparturesByCountry = (flights) => {
  const departuresByCountry = flights.reduce((acc, flight) => {
    const country = flight.departure_country;
    if (country) {
      acc[country] = (acc[country] || 0) + 1;
    }
    return acc;
  }, {});

  return Object.entries(departuresByCountry)
    .map(([country, count]) => ({
      country,
      departures: count,
    }))
    .sort((a, b) => b.departures - a.departures);
};

export const getFlightsByTimeGrouping = (flights, timeGrouping) => {
  const grouping = {};

  flights.forEach((flight) => {
    console.log(flight);

    if (!flight.departure_date) return;

    const date = new Date(flight.departure_date);
    let key;

    switch (timeGrouping) {
      case "dayOfWeek":
        key = date.toLocaleDateString("en-US", { weekday: "long" });
        break;
      case "year":
        key = date.getFullYear().toString();
        break;
      case "month":
        key = date.toLocaleDateString("en-US", { month: "long" });
        break;
      default:
        key = "Unknown";
    }

    grouping[key] = (grouping[key] || 0) + 1;
  });

  // Define order for consistent display
  let order;
  switch (timeGrouping) {
    case "dayOfWeek":
      order = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ];
      break;
    case "month":
      order = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];
      break;
    default:
      order = Object.keys(grouping).sort();
  }

  return order
    .filter((key) => grouping[key])
    .map((key) => ({
      period: key,
      flights: grouping[key] || 0,
    }));
};
