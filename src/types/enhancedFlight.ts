import type { DateLike } from "../utils/dateUtils";

/**
 * Represents a flight record.
 */
export interface enhancedFlight {
  // Basic flight information
  id: string;
  user_id?: string;
  departure_date: DateLike;
  departure_time?: string | null;
  departure_airport_iata: string;
  arrival_airport_iata: string;
  airline_icao: string | null;
  airline_iata: string;
  flight_number?: string | null;
  created_at?: string | null;
  departure_coordinates: [number, number] | null;
  arrival_coordinates: [number, number] | null;
  distance_km: number | null;
  /** Estimated emissions in kg CO2e, computed when the flight is enriched. */
  co2_kg?: number;
  flight_time: number | null;
  departure_country: string | null;
  arrival_country: string | null;
  international: boolean;
  airline_name: string | null;
  airline_icon_path: string | null;
  aircraft_type_name?: string | null;
  /** Raw AeroDataBox response for the matching leg, or null if never checked. */
  flight_status?: Record<string, unknown> | null;
  /** ISO timestamp of the last successful status check. */
  flight_status_checked_at?: string | null;
}
