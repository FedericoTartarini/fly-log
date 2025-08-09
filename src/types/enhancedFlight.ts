/**
 * Represents a flight record.
 */
export interface enhancedFlight {
  // Basic flight information
  id: string;
  user_id: string;
  departure_date: string; // ISO date string
  departure_time: string | null;
  departure_airport_iata: string;
  arrival_airport_iata: string;
  airline_iata: string;
  flight_number: string;
  created_at: string; // ISO datetime string
  departure_coordinates: [number, number];
  arrival_coordinates: [number, number];
  distance_km: number;
  flight_time: number;
  departure_country: string;
  arrival_country: string;
  international: boolean;
  airline_name: string;
  airline_primary_color: string | null;
  airline_icon_path: string;
  aircraft_type_name?: string; // Optional, as seen in the card
}
