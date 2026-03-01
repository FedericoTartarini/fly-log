import type { FC } from "react";

export interface FlightCsvUploadProps {
  onComplete?: () => void;
}

declare const FlightCsvUpload: FC<FlightCsvUploadProps>;

export default FlightCsvUpload;
