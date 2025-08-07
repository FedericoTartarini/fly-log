import React, { useState, useEffect } from "react";
import {
  TextInput,
  Select,
  Button,
  Group,
  Title,
  Paper,
  Stack,
  Tabs,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import airportsInfo from "../../python/airports_info.json";
import airlinesInfo from "../../python/airlines.json";
import { supabaseClient } from "../supabaseClient";
import { notifications } from "@mantine/notifications";
import FlightCsvUpload from "./FlightCsvUpload.jsx";

function FlightEntryForm({ onSaved }) {
  const [airportOptions, setAirportOptions] = useState([]);
  const [airlineOptions, setAirlineOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Initialize form with validation
  const form = useForm({
    initialValues: {
      departureDate: null,
      departureAirport: "",
      arrivalAirport: "",
      airline: "",
      flightNumber: "",
    },
    validate: {
      departureDate: (value) => (value ? null : "Departure date is required"),
      departureAirport: (value) =>
        value ? null : "Departure airport is required",
      arrivalAirport: (value) => {
        if (!value) return "Arrival airport is required";
        if (value === form.values.departureAirport)
          return "Arrival and departure airports must be different";
        return null;
      },
      airline: (value) => (value ? null : "Airline is required"),
    },
  });

  // Process airports and airlines data
  useEffect(() => {
    const fetchAirportsInfo = async () => {
      try {
        // Format airports for select dropdown
        /** @type {import('../types').Airport[]} */
        const airports = airportsInfo
          .map((airport) => ({
            value: airport.iata,
            label: `${airport.iata} - ${airport.airport_name}, ${airport.city}, ${airport.country}`,
          }))
          .sort((a, b) => a.label.localeCompare(b.label));

        // Format airlines for select dropdown
        /** @type {import('../types').Airline[]} */
        const airlines = airlinesInfo
          .map((airline) => ({
            value: airline.iata,
            label: `${airline.iata} - ${airline.name}`,
          }))
          .sort((a, b) => a.label.localeCompare(b.label));

        setAirportOptions(airports);
        setAirlineOptions(airlines);
      } catch (error) {
        console.error("Error processing airports data:", error);
      }
    };
    fetchAirportsInfo();
  }, []);

  const handleSubmit = async (values) => {
    setLoading(true);

    try {
      // Prepare data for submission to Supabase
      /** @type {import('../types').AirportTableRow} */
      const flightData = {
        departure_date: values.departureDate,
        departure_airport_iata: values.departureAirport,
        arrival_airport_iata: values.arrivalAirport,
        airline_iata: values.airline,
        flight_number: values.flightNumber,
      };

      // Save to Supabase
      const { error } = await supabaseClient
        .from("flights")
        .insert([flightData]);

      if (error) throw error;

      // Success notification
      notifications.show({
        title: "Success",
        message: "Flight saved successfully",
        color: "green",
      });

      // Reset form
      form.reset();

      // Trigger callback to refresh data
      if (onSaved) onSaved();
    } catch (error) {
      console.error("Error saving flight:", error);
      notifications.show({
        title: "Error",
        message: `Could not save flight: ${error.message}`,
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper p="md" withBorder>
      <Tabs defaultValue="manual">
        <Tabs.List>
          <Tabs.Tab value="manual">Manual Entry</Tabs.Tab>
          <Tabs.Tab value="csv">CSV Upload</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="manual" pt="xs">
          <Stack>
            <Title order={4}>Add New Flight</Title>

            <form onSubmit={form.onSubmit(handleSubmit)}>
              <Stack>
                <Group grow>
                  <DatePickerInput
                    label="Departure Date"
                    placeholder="Select date"
                    required
                    clearable={false}
                    {...form.getInputProps("departureDate")}
                  />
                  <TextInput
                    label="Departure Time"
                    placeholder="e.g., 14:30"
                    required
                    {...form.getInputProps("departureTime")}
                  />
                </Group>

                <Select
                  label="Departure Airport"
                  placeholder="Search airports"
                  searchable
                  required
                  data={airportOptions}
                  maxDropdownHeight={280}
                  nothingFoundMessage="No matching airports"
                  {...form.getInputProps("departureAirport")}
                />

                <Select
                  label="Arrival Airport"
                  placeholder="Search airports"
                  searchable
                  required
                  data={airportOptions}
                  maxDropdownHeight={280}
                  nothingFoundMessage="No matching airports"
                  {...form.getInputProps("arrivalAirport")}
                />

                <Group grow>
                  <Select
                    label="Airline"
                    placeholder="Search airlines"
                    searchable
                    required
                    data={airlineOptions}
                    maxDropdownHeight={280}
                    nothingFoundMessage="No matching airlines"
                    {...form.getInputProps("airline")}
                  />
                  <TextInput
                    label="Flight Number"
                    placeholder="e.g., 123"
                    {...form.getInputProps("flightNumber")}
                  />
                </Group>

                <Group justify="flex-end" mt="md">
                  <Button type="submit" loading={loading}>
                    Save Flight
                  </Button>
                </Group>
              </Stack>
            </form>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="csv" pt="xs">
          <FlightCsvUpload onComplete={onSaved} />
        </Tabs.Panel>
      </Tabs>
    </Paper>
  );
}

export default FlightEntryForm;
