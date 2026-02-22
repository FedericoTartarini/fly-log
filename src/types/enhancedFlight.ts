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
  flight_time: number | null;
  departure_country: string | null;
  arrival_country: string | null;
  international: boolean;
  airline_name: string | null;
  airline_icon_path: string | null;
  aircraft_type_name?: string | null;
}
