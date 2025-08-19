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
import { supabaseClient } from "../supabaseClient";
import { notifications } from "@mantine/notifications";
import FlightCsvUpload from "./FlightCsvUpload.jsx";
import { airlinesInfo } from "../utils/airlinesInfo";
import { airportsInfo } from "../utils/airportsInfo";

type SelectOption = {
  value: string;
  label: string;
};

interface FlightEntryFormProps {
  onSaved?: () => void;
}

const FlightEntryForm: React.FC<FlightEntryFormProps> = ({ onSaved }) => {
  const [airportOptions, setAirportOptions] = useState<SelectOption[]>([]);
  const [airlineOptions, setAirlineOptions] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      departureDate: null as Date | null,
      departureTime: "",
      departureAirport: "",
      arrivalAirport: "",
      airline: "",
      flightNumber: "",
    },
    validate: {
      departureDate: (value) => (value ? null : "Departure date is required"),
      departureAirport: (value) =>
        value ? null : "Departure airport is required",
      arrivalAirport: (value, values) => {
        if (!value) return "Arrival airport is required";
        if (value === values.departureAirport)
          return "Arrival and departure airports must be different";
        return null;
      },
      airline: (value) => (value ? null : "Airline is required"),
    },
  });

  useEffect(() => {
    const fetchAirportsInfo = async () => {
      try {
        const airports: SelectOption[] = airportsInfo
          .map((airport) => ({
            value: airport.iata,
            label: `${airport.iata} - ${airport.airport_name}, ${airport.city}, ${airport.country}`,
          }))
          .sort((a, b) => a.label.localeCompare(b.label));

        const airlines: SelectOption[] = (airlinesInfo as any[])
          .map((airline) => ({
            value: airline.iata,
            label: `${airline.iata} - ${airline.name}`,
          }))
          .sort((a, b) => a.label.localeCompare(b.label));

        setAirportOptions(airports);
        setAirlineOptions(airlines);
      } catch (error) {
        console.error("Error processing airports or airport data:", error);
      }
    };
    fetchAirportsInfo();
  }, []);

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);

    try {
      const flightData = {
        departure_date: values.departureDate,
        departure_airport_iata: values.departureAirport,
        arrival_airport_iata: values.arrivalAirport,
        airline_iata: values.airline,
        flight_number: values.flightNumber,
      };

      const { error } = await supabaseClient
        .from("flights")
        .insert([flightData]);

      if (error) {
        notifications.show({
          title: "Error",
          message: `Could not save flight: ${error.message}`,
          color: "red",
        });
        setLoading(false);
        return;
      }

      notifications.show({
        title: "Success",
        message: "Flight saved successfully",
        color: "green",
      });

      form.reset();

      if (onSaved) onSaved();
    } catch (error: any) {
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
};

export default FlightEntryForm;
