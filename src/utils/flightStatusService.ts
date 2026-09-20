import { parseToDate } from "./dateUtils";
import { updateFlightForUser } from "./flightService";
import type { enhancedFlight } from "../types/enhancedFlight";

type FlightLeg = {
  status?: string;
  departure?: { airport?: { iata?: string } };
  arrival?: { airport?: { iata?: string } };
  [key: string]: unknown;
};

export class FlightStatusError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "FlightStatusError";
    this.status = status;
  }
}

// departure_date is stored/read as a UTC calendar date (see the fix in #60);
// AeroDataBox's date param expects that same calendar date.
const toIsoDate = (flight: enhancedFlight): string | null => {
  const d = parseToDate(flight.departure_date);
  if (!d) return null;
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

// A flight number/date can match more than one leg near a date boundary
// (e.g. QF1 SIN->LHR departing just before/after midnight UTC on either
// side of the requested date) - the airports pin down the right one.
const findMatchingLeg = (
  legs: FlightLeg[],
  flight: enhancedFlight,
): FlightLeg | null =>
  legs.find(
    (leg) =>
      leg.departure?.airport?.iata === flight.departure_airport_iata &&
      leg.arrival?.airport?.iata === flight.arrival_airport_iata,
  ) ?? null;

/**
 * Fetches live status for a flight through the flight-status proxy function
 * and persists the matching leg onto the flight's Firestore document.
 */
export async function checkFlightStatus(
  uid: string,
  flight: enhancedFlight,
): Promise<FlightLeg> {
  if (!flight.flight_number) {
    throw new FlightStatusError("Flight has no flight number", 400);
  }

  const date = toIsoDate(flight);
  if (!date) {
    throw new FlightStatusError("Flight has no valid departure date", 400);
  }

  const flightNumber = `${flight.airline_iata}${flight.flight_number}`;
  const response = await fetch(
    `/.netlify/functions/flight-status?flightNumber=${encodeURIComponent(flightNumber)}&date=${encodeURIComponent(date)}`,
  );

  if (!response.ok) {
    throw new FlightStatusError(
      `Flight status request failed (${response.status})`,
      response.status,
    );
  }

  // The proxy forwards AeroDataBox's body verbatim, so a 2xx is not a promise
  // that the body is the array of legs we expect. Without this guard a
  // malformed body reaches legs.find() and surfaces a raw TypeError in a
  // notification instead of a FlightStatusError the UI knows how to phrase.
  const legs = await response.json();
  if (!Array.isArray(legs)) {
    throw new FlightStatusError("Unexpected flight status response", 502);
  }

  const match = findMatchingLeg(legs as FlightLeg[], flight);
  if (!match) {
    throw new FlightStatusError("No matching flight found", 404);
  }

  await updateFlightForUser(uid, flight.id, {
    flight_status: match,
    flight_status_checked_at: new Date().toISOString(),
  });

  return match;
}
