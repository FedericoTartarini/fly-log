// Helper to validate and normalize IATA codes against local assets
// Exports: validateAndNormalizeCsvRows(rows) -> { errors: string[], normalizedRows: Array }

import { airportsInfo } from "./airportsInfo";
// Import airlines JSON as JSON module
import airlinesData from "../assets/airlines.json" with { type: "json" };

const buildSets = () => {
  const airportsSet = new Set();
  if (Array.isArray(airportsInfo)) {
    airportsInfo.forEach((a) => {
      if (a && a.iata) airportsSet.add((a.iata || "").toUpperCase());
    });
  }

  const airlinesSet = new Set();
  if (Array.isArray(airlinesData)) {
    airlinesData.forEach((a) => {
      if (a && a.iata) airlinesSet.add((a.iata || "").toUpperCase());
    });
  }

  return { airportsSet, airlinesSet };
};

export function validateAndNormalizeCsvRows(rows) {
  if (!Array.isArray(rows)) {
    throw new TypeError("rows must be an array");
  }
  const { airportsSet, airlinesSet } = buildSets();
  const errors = [];
  const normalizedRows = [];

  rows.forEach((rawRow, index) => {
    const rowNum = index + 1;
    // Normalize fields (trim + uppercase where appropriate)
    const departure_airport_iata = rawRow.departure_airport_iata
      ? String(rawRow.departure_airport_iata).trim().toUpperCase()
      : "";
    const arrival_airport_iata = rawRow.arrival_airport_iata
      ? String(rawRow.arrival_airport_iata).trim().toUpperCase()
      : "";
    const airline_iata = rawRow.airline_iata
      ? String(rawRow.airline_iata).trim().toUpperCase()
      : "";

    // Missing-field checks (only for the three IATA fields)
    if (!departure_airport_iata) {
      errors.push(`Row ${rowNum}: missing field 'departure_airport_iata'`);
    }
    if (!arrival_airport_iata) {
      errors.push(`Row ${rowNum}: missing field 'arrival_airport_iata'`);
    }
    if (!airline_iata) {
      errors.push(`Row ${rowNum}: missing field 'airline_iata'`);
    }

    // Existence checks (only if value present)
    if (departure_airport_iata && !airportsSet.has(departure_airport_iata)) {
      errors.push(
        `Row ${rowNum}: unknown departure_airport_iata '${departure_airport_iata}' (not found in airports list)`,
      );
    }
    if (arrival_airport_iata && !airportsSet.has(arrival_airport_iata)) {
      errors.push(
        `Row ${rowNum}: unknown arrival_airport_iata '${arrival_airport_iata}' (not found in airports list)`,
      );
    }
    if (airline_iata && !airlinesSet.has(airline_iata)) {
      errors.push(
        `Row ${rowNum}: unknown airline_iata '${airline_iata}' (not found in airlines list)`,
      );
    }

    // Build normalized row preserving other fields
    const normalized = {
      ...rawRow,
      departure_airport_iata,
      arrival_airport_iata,
      airline_iata,
    };

    normalizedRows.push(normalized);
  });

  return { errors, normalizedRows };
}
