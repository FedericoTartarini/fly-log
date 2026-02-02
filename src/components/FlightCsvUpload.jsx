/* eslint-disable react-refresh/only-export-components */
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
import { useAuth } from "../context/AuthContext.jsx";
import { addFlightsForUser } from "../firebaseClient";
import { notifications } from "@mantine/notifications";
import Papa from "papaparse";
import { useTranslation } from "react-i18next";
import { validateAndNormalizeCsvRows } from "../utils/iataValidation";

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
  const { user } = useAuth();
  const { t } = useTranslation("flights");

  const handleUpload = async () => {
    if (!file) {
      setError(t("csv.errors.no_file"));
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

          // todo I should check that the airport exists in the database otherwise throw error

          // Validate and normalize IATA codes against local assets
          const { errors: iataErrors, normalizedRows } =
            validateAndNormalizeCsvRows(flightData);

          if (iataErrors.length > 0) {
            setError(iataErrors.join("\n"));
            setParsing(false);
            return;
          }

          const formattedFlights = normalizedRows.map((flight) => ({
            departure_date: flight.departure_date,
            departure_time: flight.departure_time,
            departure_airport_iata: flight.departure_airport_iata,
            arrival_airport_iata: flight.arrival_airport_iata,
            airline_iata: flight.airline_iata,
            flight_number: flight.flight_number || null,
          }));

          let lastProgress = 0;
          await addFlightsForUser(uid, formattedFlights, (p) => {
            if (p !== lastProgress) {
              lastProgress = p;
              setUploadProgress(p);
            }
          });

          const successCount = formattedFlights.length;
          const errorCount = 0;

          // Show completion notification
          notifications.show({
            title: t("csv.notification.title"),
            message: t("csv.notification.message", {
              success: successCount,
              failed: errorCount,
            }),
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
          setError(`${t("csv.errors.no_file")} - ${error}`);
          setParsing(false);
        },
      });
    } catch (e) {
      setError(`${t("csv.errors.no_file")} - ${e.message}`);
      setParsing(false);
    }
  };

  return (
    <Paper p="md" withBorder>
      <Stack>
        <Text size="lg" fw={500}>
          {t("csv.title")}
        </Text>

        <Text size="sm" c="dimmed">
          {t("csv.description")}
        </Text>

        <FileInput
          accept=".csv"
          placeholder={t("csv.file_input.placeholder")}
          label={t("csv.file_input.label")}
          description={t("csv.file_input.description")}
          icon={<IconUpload size={14} />}
          value={file}
          onChange={setFile}
          disabled={parsing}
        />

        {error && (
          <Alert
            color="red"
            title={t("csv.errors.no_file")}
            icon={<IconAlertCircle size={16} />}
          >
            {error}
          </Alert>
        )}

        {parsing && (
          <Progress
            value={uploadProgress}
            size="sm"
            label={`${uploadProgress}%`}
            color={uploadProgress === 100 ? "green" : "blue"}
          />
        )}

        <Group justify="flex-end">
          <Button onClick={handleUpload} loading={parsing} disabled={!file}>
            {t("csv.upload_button")}
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
};

export default FlightCsvUpload;
