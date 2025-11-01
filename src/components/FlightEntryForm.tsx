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
  Switch,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { addFlightForUser } from "../firebaseClient";
import { useAuth } from "../context/AuthContext";
import { notifications } from "@mantine/notifications";
import FlightCsvUpload from "./FlightCsvUpload";
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
  const [addReturn, setAddReturn] = useState(false);
  const { user } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm({
    initialValues: {
      departureDate: null as Date | null,
      departureTime: "",
      departureAirport: "",
      arrivalAirport: "",
      airline: "",
      flightNumber: "",
      // Return flight fields
      returnDate: null as Date | null,
      returnTime: "",
      returnFlightNumber: "",
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
      // Only validate return fields if addReturn is true
      ...(addReturn && {
        returnDate: (value) => (value ? null : "Return date is required"),
      }),
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
    setSubmitError(null);
    setLoading(true);
    console.log("FlightEntryForm: submit clicked", { values });
    notifications.show({
      title: "Saving",
      message: "Saving flight(s)...",
      color: "blue",
    });

    try {
      const flightsToInsert = [
        {
          departure_date: values.departureDate,
          departure_airport_iata: values.departureAirport,
          arrival_airport_iata: values.arrivalAirport,
          airline_iata: values.airline,
          flight_number: values.flightNumber,
        },
      ];

      if (addReturn) {
        flightsToInsert.push({
          departure_date: values.returnDate,
          departure_airport_iata: values.arrivalAirport,
          arrival_airport_iata: values.departureAirport,
          airline_iata: values.airline,
          flight_number: values.returnFlightNumber,
        });
      }

      const uid = user?.uid || null;
      if (!uid) {
        const msg = "You must be signed in to save flights";
        setSubmitError(msg);
        notifications.show({ title: "Error", message: msg, color: "red" });
        setLoading(false);
        return;
      }

      // Save each flight under the user's Firestore collection
      for (const [idx, f] of flightsToInsert.entries()) {
        console.log(`Saving flight ${idx + 1}/${flightsToInsert.length}`, f);
        await addFlightForUser(uid, f);
      }

      notifications.show({
        title: "Success",
        message: addReturn
          ? "Flights saved successfully"
          : "Flight saved successfully",
        color: "green",
      });

      form.reset();
      setAddReturn(false);

      if (onSaved) onSaved();
    } catch (error: any) {
      console.error("Error saving flight:", error);
      const msg = error?.message || String(error) || "Unknown error";
      setSubmitError(msg);
      notifications.show({
        title: "Error",
        message: `Could not save flight(s): ${msg}`,
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  // Wrapper for the Save button: validate form first and show notification on errors
  const handleSaveClick = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("FlightEntryForm: save clicked");
    // Reset previous submit errors
    setSubmitError(null);
    // Run validation (mutates form.errors). Mantine's validate may return boolean or object,
    // so check errors directly for robustness.
    form.validate();
    const errorMessages = Object.values(form.errors).filter(
      Boolean,
    ) as string[];
    const hasErrors = errorMessages.length > 0;
    if (hasErrors) {
      const msg = errorMessages.join("; ") || "Please check required fields";
      setSubmitError(msg);
      notifications.show({
        title: "Validation error",
        message: msg,
        color: "red",
      });
      return;
    }

    await handleSubmit(form.values);
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
                  limit={5}
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
                  limit={5}
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
                    limit={5}
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

                <Switch
                  label="Add return flight"
                  checked={addReturn}
                  onChange={(event) =>
                    setAddReturn(event.currentTarget.checked)
                  }
                  mt="md"
                />

                {addReturn && (
                  <Stack mt="xs" p="xs" style={{ borderRadius: 8 }}>
                    <Title order={5}>Return Flight</Title>
                    <Group grow>
                      <DatePickerInput
                        label="Return Date"
                        placeholder="Select date"
                        required
                        clearable={false}
                        {...form.getInputProps("returnDate")}
                      />
                      <TextInput
                        label="Return Time"
                        placeholder="e.g., 18:45"
                        {...form.getInputProps("returnTime")}
                      />
                    </Group>
                    <Group grow>
                      <Select
                        label="Airline"
                        placeholder="Search airlines"
                        searchable
                        limit={5}
                        required
                        data={airlineOptions}
                        maxDropdownHeight={280}
                        nothingFoundMessage="No matching airlines"
                        {...form.getInputProps("airline")}
                        disabled
                      />
                      <TextInput
                        label="Flight Number"
                        placeholder="e.g., 456"
                        {...form.getInputProps("returnFlightNumber")}
                      />
                    </Group>
                    <TextInput
                      label="Departure Airport"
                      value={form.values.arrivalAirport}
                      disabled
                    />
                    <TextInput
                      label="Arrival Airport"
                      value={form.values.departureAirport}
                      disabled
                    />
                  </Stack>
                )}

                {!user && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ color: "orange" }}>
                      You are not signed in. Please sign in to save flights.
                    </div>
                  </div>
                )}

                {submitError && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ color: "red" }}>{submitError}</div>
                  </div>
                )}

                <Group justify="flex-end" mt="md">
                  <Button
                    type="button"
                    onClick={handleSaveClick}
                    loading={loading}
                    disabled={!user}
                  >
                    Save Flight{addReturn ? "s" : ""}
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
