import React, { useState } from "react";
import {
  Button,
  Group,
  Text,
  Stack,
  FileInput,
  Paper,
  Alert,
  Progress,
} from "@mantine/core";
import { IconUpload, IconAlertCircle, IconCheck } from "@tabler/icons-react";
import { supabaseClient } from "../supabaseClient";
import { notifications } from "@mantine/notifications";
import Papa from "papaparse";

export const validateCsvData = (data) => {
  const errors = [];
  const requiredFields = [
    "departure_date",
    "departure_airport_iata",
    "arrival_airport_iata",
    "airline_iata",
  ];

  data.forEach((row, index) => {
    // Check for missing fields
    const missingFields = requiredFields.filter((field) => !row[field]);
    if (missingFields.length > 0) {
      errors.push(
        `Row ${index + 1}: Missing fields - ${missingFields.join(", ")}`,
      );
    }

    // Validate departure_date
    if (row.departure_date && !/^\d{4}-\d{2}-\d{2}$/.test(row.departure_date)) {
      errors.push(
        `Row ${index + 1}: Invalid departure_date format (YYYY-MM-DD expected)`,
      );
    }

    // Validate departure_time
    if (row.departure_time && !/^\d{2}:\d{2}$/.test(row.departure_time)) {
      errors.push(
        `Row ${index + 1}: Invalid departure_time format (HH:mm expected)`,
      );
    }

    // Validate IATA codes
    if (row.departure_airport_iata && row.departure_airport_iata.length !== 3) {
      errors.push(
        `Row ${index + 1}: Invalid departure_airport_iata (3-letter IATA code expected)`,
      );
    }
    if (row.arrival_airport_iata && row.arrival_airport_iata.length !== 3) {
      errors.push(
        `Row ${index + 1}: Invalid arrival_airport_iata (3-letter IATA code expected)`,
      );
    }
    if (row.airline_iata && row.airline_iata.length !== 2) {
      errors.push(
        `Row ${index + 1}: Invalid airline_iata (2-letter IATA code expected)`,
      );
    }

    // Optional: Validate flight_number
    if (row.flight_number && !/^[a-zA-Z0-9]+$/.test(row.flight_number)) {
      errors.push(
        `Row ${index + 1}: Invalid flight_number (alphanumeric expected)`,
      );
    }
  });

  return errors;
};

const FlightCsvUpload = ({ onComplete }) => {
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a CSV file");
      return;
    }

    setParsing(true);
    setError(null);

    try {
      // Parse the CSV file
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const validationErrors = validateCsvData(results.data);
          if (validationErrors.length > 0) {
            setError(validationErrors.join("\n"));
            setParsing(false);
            return;
          }

          const flightData = results.data;

          // // Validate required fields
          // const requiredFields = [
          //   "departure_date",
          //   "departure_time",
          //   "departure_airport_iata",
          //   "arrival_airport_iata",
          //   "airline_iata",
          // ];
          //
          // const missingFields = requiredFields.filter(
          //   (field) =>
          //     !flightData[0] || !Object.keys(flightData[0]).includes(field),
          // );
          //
          // if (missingFields.length > 0) {
          //   setError(`Missing required fields: ${missingFields.join(", ")}`);
          //   setParsing(false);
          //   return;
          // }

          // Upload flights one by one with progress tracking
          let successCount = 0;
          let errorCount = 0;

          for (let i = 0; i < flightData.length; i++) {
            const flight = flightData[i];

            // Format the data
            const formattedFlight = {
              departure_date: flight.departure_date,
              departure_time: flight.departure_time,
              departure_airport_iata: flight.departure_airport_iata,
              arrival_airport_iata: flight.arrival_airport_iata,
              airline_iata: flight.airline_iata,
              flight_number: flight.flight_number || null,
            };

            try {
              const { error: insertError } = await supabaseClient
                .from("flights")
                .insert(formattedFlight);

              if (insertError) {
                errorCount++;
                console.error("Error inserting flight:", insertError);
              } else {
                successCount++;
              }
            } catch (e) {
              errorCount++;
              console.error("Exception while inserting flight:", e);
            }

            // Update progress
            setUploadProgress(Math.round(((i + 1) / flightData.length) * 100));
          }

          // Show completion notification
          notifications.show({
            title: "CSV Upload Complete",
            message: `Successfully added ${successCount} flights. Failed: ${errorCount}`,
            color: errorCount > 0 ? "orange" : "green",
            icon:
              errorCount > 0 ? (
                <IconAlertCircle size={16} />
              ) : (
                <IconCheck size={16} />
              ),
          });

          setParsing(false);
          if (onComplete) {
            onComplete();
          }
        },
        error: (error) => {
          setError(`Failed to parse CSV: ${error}`);
          setParsing(false);
        },
      });
    } catch (e) {
      setError(`Error processing file: ${e.message}`);
      setParsing(false);
    }
  };

  return (
    <Paper p="md" withBorder>
      <Stack>
        <Text size="lg" fw={500}>
          Upload Flight Data from CSV
        </Text>

        <Text size="sm" c="dimmed">
          Your CSV must include these columns: departure_date, departure_time,
          departure_airport_iata, arrival_airport_iata, airline_iata. Optional:
          flight_number.
        </Text>

        <FileInput
          accept=".csv"
          placeholder="Select CSV file"
          label="Flight data CSV"
          description="Upload your flight data in CSV format"
          icon={<IconUpload size={14} />}
          value={file}
          onChange={setFile}
          disabled={parsing}
        />

        {error && (
          <Alert color="red" title="Error" icon={<IconAlertCircle size={16} />}>
            {error}
          </Alert>
        )}

        {parsing && (
          <Progress
            value={uploadProgress}
            animate
            size="sm"
            label={`${uploadProgress}%`}
            color={uploadProgress === 100 ? "green" : "blue"}
          />
        )}

        <Group justify="flex-end">
          <Button onClick={handleUpload} loading={parsing} disabled={!file}>
            Upload Flights
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
};

export default FlightCsvUpload;
