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
import { updateFlightForUser } from "../utils/flightService";
import { useAuth } from "../context/AuthContext.jsx";
import { notifications } from "@mantine/notifications";
import FlightCsvUpload from "./FlightCsvUpload.jsx";
import {
  loadAirlinesInfo,
  loadAirportsInfo,
  type AirlineInfo,
} from "../utils/referenceData";
import { useTranslation } from "react-i18next";

type SelectOption = {
  value: string;
  label: string;
};

interface FlightEntryFormProps {
  onSaved?: () => void;
  flight?: {
    id: string;
    departure_date?: unknown;
    departure_airport_iata?: string;
    arrival_airport_iata?: string;
    airline_iata?: string;
    flight_number?: string;
  } | null;
}

const FlightEntryForm: React.FC<FlightEntryFormProps> = ({
  onSaved,
  flight,
}) => {
  const [airportOptions, setAirportOptions] = useState<SelectOption[]>([]);
  const [airlineOptions, setAirlineOptions] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [addReturn, setAddReturn] = useState(false);
  const { user } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { t } = useTranslation("flights");

  const initialValues = {
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
  };

  const form = useForm({
    initialValues,
    validate: {
      departureDate: (value) =>
        value ? null : t("form.validation.departure_date_required"),
      departureAirport: (value) =>
        value ? null : t("form.validation.departure_airport_required"),
      arrivalAirport: (value, values) => {
        if (!value) return t("form.validation.arrival_airport_required");
        if (value === values.departureAirport)
          return t("form.validation.arrival_differs");
        return null;
      },
      airline: (value) =>
        value ? null : t("form.validation.airline_required"),
      returnDate: (value) =>
        addReturn
          ? value
            ? null
            : t("form.validation.return_date_required")
          : null,
    },
  });

  useEffect(() => {
    const fetchAirportsInfo = async () => {
      try {
        const [airportsInfo, airlinesInfo] = await Promise.all([
          loadAirportsInfo(),
          loadAirlinesInfo(),
        ]);

        const airports: SelectOption[] = airportsInfo
          .map((airport) => ({
            value: airport.iata,
            label: `${airport.iata} - ${airport.airport_name}, ${airport.city}, ${airport.country}`,
          }))
          .sort((a, b) => a.label.localeCompare(b.label));

        const airlines: SelectOption[] = (airlinesInfo as AirlineInfo[])
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

  useEffect(() => {
    // If flight prop changes, update form values accordingly
    if (!flight) return;
    try {
      const depDate =
        flight.departure_date &&
        typeof flight.departure_date.toDate === "function"
          ? flight.departure_date.toDate()
          : flight.departure_date
            ? new Date(flight.departure_date)
            : null;
      form.setValues({
        departureDate: depDate,
        departureTime: "",
        departureAirport: flight.departure_airport_iata || "",
        arrivalAirport: flight.arrival_airport_iata || "",
        airline: flight.airline_iata || "",
        flightNumber: flight.flight_number || "",
        returnDate: null,
        returnTime: "",
        returnFlightNumber: "",
      });
      setAddReturn(false);
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flight]);

  const handleSubmit = async (values: typeof form.values) => {
    setSubmitError(null);
    setLoading(true);
    notifications.show({
      title: t("form.notifications.saving_title"),
      message: t("form.notifications.saving_message"),
      color: "blue",
    });

    try {
      const flightsToInsert: Array<{
        departure_date: Date | null;
        departure_airport_iata: string;
        arrival_airport_iata: string;
        airline_iata: string;
        flight_number: string;
      }> = [
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
        const msg = t("form.labels.not_signed_in");
        setSubmitError(msg);
        notifications.show({
          title: t("form.notifications.error_title"),
          message: msg,
          color: "red",
        });
        setLoading(false);
        return;
      }

      if (flight && flight.id) {
        // Editing a single flight
        const updateData = flightsToInsert[0];
        await updateFlightForUser(uid, flight.id, updateData);

        notifications.show({
          title: t("form.notifications.saving_title"),
          message: t("form.notifications.success_single"),
          color: "green",
        });
      } else {
        // Create new flights
        for (const f of flightsToInsert) {
          await addFlightForUser(uid, f);
        }

        notifications.show({
          title: t(
            "form.notifications.saving_title",
          ) /* re-use saving title for brevity */,
          message: addReturn
            ? t("form.notifications.success_multiple")
            : t("form.notifications.success_single"),
          color: "green",
        });
      }

      form.reset();
      setAddReturn(false);

      if (onSaved) onSaved();
    } catch (error: unknown) {
      console.error("Error saving flight:", error);
      const msg = error instanceof Error ? error.message : String(error);
      setSubmitError(msg);
      notifications.show({
        title: t("form.notifications.error_title"),
        message: t("form.notifications.error_save", { msg }),
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = form.onSubmit(async (values) => {
    setSubmitError(null);
    form.validate();
    const errorMessages = Object.values(form.errors).filter(
      Boolean,
    ) as string[];
    const hasErrors = errorMessages.length > 0;
    if (hasErrors) {
      const msg =
        errorMessages.join("; ") ||
        t("form.notifications.validation_error_generic");
      setSubmitError(msg);
      notifications.show({
        title: t("form.notifications.validation_error_title"),
        message: msg,
        color: "red",
      });
      return;
    }

    await handleSubmit(values);
  });

  const isEditing = Boolean(flight && flight.id);

  // Manual entry panel JSX - reused for both edit mode (rendered directly) and tabs mode
  const manualPanel = (
    <Stack>
      <form onSubmit={handleFormSubmit}>
        <Stack>
          <Group grow>
            <DatePickerInput
              label={t("form.labels.departure_date")}
              placeholder={t("form.placeholders.select_date")}
              required
              clearable={false}
              {...form.getInputProps("departureDate")}
            />
            <TextInput
              label={t("form.labels.departure_time")}
              placeholder={t("form.placeholders.time_example")}
              {...form.getInputProps("departureTime")}
            />
          </Group>

          <Select
            label={t("form.labels.departure_airport")}
            placeholder={t("form.placeholders.search_airports")}
            searchable
            limit={5}
            required
            data={airportOptions}
            maxDropdownHeight={280}
            nothingFoundMessage={t("form.placeholders.no_matching_airports")}
            {...form.getInputProps("departureAirport")}
            clearable={true}
          />

          <Select
            label={t("form.labels.arrival_airport")}
            placeholder={t("form.placeholders.search_airports")}
            searchable
            limit={5}
            required
            data={airportOptions}
            maxDropdownHeight={280}
            nothingFoundMessage={t("form.placeholders.no_matching_airports")}
            {...form.getInputProps("arrivalAirport")}
            clearable={true}
          />

          <Group grow>
            <Select
              label={t("form.labels.airline")}
              placeholder={t("form.placeholders.search_airlines")}
              searchable
              limit={5}
              required
              data={airlineOptions}
              maxDropdownHeight={280}
              nothingFoundMessage={t("form.placeholders.no_matching_airlines")}
              {...form.getInputProps("airline")}
              clearable={true}
            />
            <TextInput
              label={t("form.labels.flight_number")}
              placeholder={t("form.placeholders.flight_number_example")}
              {...form.getInputProps("flightNumber")}
            />
          </Group>

          {/* Only show addReturn toggle when creating a new flight */}
          {!isEditing && (
            <>
              <Switch
                label={t("form.labels.add_return")}
                checked={addReturn}
                onChange={(event) => setAddReturn(event.currentTarget.checked)}
                mt="md"
              />

              {addReturn && (
                <Stack mt="xs" p="xs" style={{ borderRadius: 8 }}>
                  <Title order={5}>{t("form.labels.return_flight")}</Title>
                  <Group grow>
                    <DatePickerInput
                      label={t("form.labels.return_date")}
                      placeholder={t("form.placeholders.select_date")}
                      required
                      clearable={false}
                      {...form.getInputProps("returnDate")}
                    />
                    <TextInput
                      label={t("form.labels.return_time")}
                      placeholder={t("form.placeholders.time_example")}
                      {...form.getInputProps("returnTime")}
                    />
                  </Group>
                  <Group grow>
                    <Select
                      label={t("form.labels.airline")}
                      placeholder={t("form.placeholders.search_airlines")}
                      searchable
                      limit={5}
                      required
                      data={airlineOptions}
                      maxDropdownHeight={280}
                      nothingFoundMessage={t(
                        "form.placeholders.no_matching_airlines",
                      )}
                      {...form.getInputProps("airline")}
                      disabled
                    />
                    <TextInput
                      label={t("form.labels.flight_number")}
                      placeholder={t("form.placeholders.flight_number_example")}
                      {...form.getInputProps("returnFlightNumber")}
                    />
                  </Group>
                  <TextInput
                    label={t("form.labels.departure_airport")}
                    value={form.values.arrivalAirport}
                    disabled
                  />
                  <TextInput
                    label={t("form.labels.arrival_airport")}
                    value={form.values.departureAirport}
                    disabled
                  />
                </Stack>
              )}
            </>
          )}

          {!user && (
            <div style={{ marginTop: 8 }}>
              <div style={{ color: "orange" }}>
                {t("form.labels.not_signed_in")}
              </div>
            </div>
          )}

          {submitError && (
            <div style={{ marginTop: 8 }}>
              <div style={{ color: "red" }}>{submitError}</div>
            </div>
          )}

          <Group justify="flex-end" mt="md">
            <Button type="submit" loading={loading} disabled={!user}>
              {isEditing
                ? t("form.buttons.update") || "Update"
                : addReturn
                  ? t("form.buttons.save_multiple")
                  : t("form.buttons.save_single")}
            </Button>
          </Group>
        </Stack>
      </form>
    </Stack>
  );

  return (
    <Paper p="md" withBorder>
      {isEditing ? (
        // When editing, render only the manual panel without the Tabs header or CSV option
        manualPanel
      ) : (
        <Tabs defaultValue="manual">
          <Tabs.List>
            <Tabs.Tab value="manual">{t("form.tabs.manual")}</Tabs.Tab>
            <Tabs.Tab value="csv">{t("form.tabs.csv")}</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="manual" pt="xs">
            {manualPanel}
          </Tabs.Panel>

          <Tabs.Panel value="csv" pt="xs">
            <FlightCsvUpload onComplete={onSaved} />
          </Tabs.Panel>
        </Tabs>
      )}
    </Paper>
  );
};

export default FlightEntryForm;
