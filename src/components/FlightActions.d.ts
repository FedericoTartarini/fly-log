import type { enhancedFlight } from "../types/enhancedFlight";

export interface FlightActionsProps {
  flight: enhancedFlight;
  onEdit?: (flight: enhancedFlight) => void;
}

declare const FlightActions: React.FC<FlightActionsProps>;

export default FlightActions;
