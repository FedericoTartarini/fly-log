import type { FC } from "react";
import type { enhancedFlight } from "../types/enhancedFlight";

export interface FlightActionsProps {
  flight: enhancedFlight;
  onEdit?: (flight: enhancedFlight) => void;
}

declare const FlightActions: FC<FlightActionsProps>;

export default FlightActions;
