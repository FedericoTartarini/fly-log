import React, { useState, useEffect } from "react";
import {
  TextInput,
  Select,
  Button,
  Group,
  Title,
  Stack,
  Tabs,
  Paper,
  ActionIcon,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { randomId } from "@mantine/hooks";
import { IconArrowBackUp, IconPlus, IconTrash } from "@tabler/icons-react";
import { addFlightForUser } from "../firebaseClient";
import { updateFlightForUser } from "../utils/flightService";
import { parseToDate, normalizeTimeString } from "../utils/dateUtils";
import { useAuth } from "../context/AuthContext.jsx";
import { notifications } from "@mantine/notifications";
import FlightCsvUpload from "./FlightCsvUpload.jsx";
import FlightChatInput from "./FlightChatInput";
import type { ParsedFlight } from "../utils/flightAiParser";
import {
  loadAirlinesInfo,
  loadAirportsInfo,
  type AirlineInfo,
} from "../utils/referenceData";
import { useTranslation } from "react-i18next";
import { FLIGHT_ENTRY_TABS, type FlightEntryTab } from "../constants/tabs";

type SelectOption = {
  value: string;
  label: string;
};

/** One flight (leg) of a possibly multi-city trip, as held by the form. */
type Leg = {
  key: string;
  departureDate: Date | null;
  departureTime: string;
  departureAirport: string;
  arrivalAirport: string;
  airline: string;
  flightNumber: string;
};

const newLeg = (overrides: Partial<Leg> = {}): Leg => ({
  key: randomId(),
  departureDate: null,
  departureTime: "",
  departureAirport: "",
  arrivalAirport: "",
  airline: "",
  flightNumber: "",
  ...overrides,
});

/** Legs index from a Mantine list path such as "legs.2.arrivalAirport". */
const legIndex = (path: string) => Number(path.split(".")[1]);

interface FlightEntryFormProps {
  onSaved?: () => void;
  flight?: {
    id: string;
    departure_date?: unknown;
    departure_time?: string | null;
    departure_airport_iata?: string;
    arrival_airport_iata?: string;
    airline_iata?: string;
    flight_number?: string | null;
  } | null;
}

const FlightEntryForm: React.FC<FlightEntryFormProps> = ({
  onSaved,
  flight,
}) => {
  // use mainPurple / accentRed wherever you would previously use theme.colors
  const [airportOptions, setAirportOptions] = useState<SelectOption[]>([]);
  const [airlineOptions, setAirlineOptions] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submitErrorId = "flight-entry-error";
  const notSignedInId = "flight-entry-not-signed-in";

  const { t } = useTranslation("flights");

  const form = useForm({
    initialValues: { legs: [newLeg()] },
    validate: {
      legs: {
        departureDate: (value) =>
          value ? null : t("form.validation.departure_date_required"),
        departureAirport: (value) =>
          value ? null : t("form.validation.departure_airport_required"),
        arrivalAirport: (value, values, path) => {
          if (!value) return t("form.validation.arrival_airport_required");
          if (value === values.legs[legIndex(path)]?.departureAirport)
            return t("form.validation.arrival_differs");
          return null;
        },
        airline: (value) =>
          value ? null : t("form.validation.airline_required"),
      },
    },
  });

  const legs = form.values.legs;

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
    let departureDate: Date | null = null;
    try {
      departureDate = parseToDate(flight.departure_date);
    } catch (e) {
      console.error("parseToDate failed in FlightEntryForm", e);
    }
    form.setValues({
      legs: [
        newLeg({
          departureDate,
          departureTime: flight.departure_time || "",
          departureAirport: flight.departure_airport_iata || "",
          arrivalAirport: flight.arrival_airport_iata || "",
          airline: flight.airline_iata || "",
          flightNumber: flight.flight_number || "",
        }),
      ],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flight]);

  const handleSubmit = async (values: typeof form.values) => {
    setSubmitError(null);

    const uid = user?.uid || null;
    if (!uid) {
      const msg = t("form.labels.not_signed_in");
      setSubmitError(msg);
      notifications.show({
        title: t("form.notifications.error_title"),
        message: msg,
        color: "red",
      });
      return;
    }

    setLoading(true);
    notifications.show({
      title: t("form.notifications.saving_title"),
      message: t("form.notifications.saving_message"),
      color: "blue",
    });

    try {
      const flightsToInsert = values.legs.map((leg) => ({
        departure_date: leg.departureDate,
        departure_time: normalizeTimeString(leg.departureTime),
        departure_airport_iata: leg.departureAirport,
        arrival_airport_iata: leg.arrivalAirport,
        airline_iata: leg.airline,
        flight_number: leg.flightNumber,
      }));

      const [primaryFlight] = flightsToInsert;
      if (!primaryFlight) {
        throw new Error("No flight details available to save.");
      }

      if (flight && flight.id) {
        // Editing a single flight
        await updateFlightForUser(uid, flight.id, primaryFlight);
      } else {
        // Each leg is stored as its own flight document.
        for (const f of flightsToInsert) {
          await addFlightForUser(uid, f);
        }
      }

      notifications.show({
        title: t("form.notifications.saving_title"),
        message:
          flightsToInsert.length > 1
            ? t("form.notifications.success_multiple")
            : t("form.notifications.success_single"),
        color: "green",
      });

      form.reset();

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

  const handleValidationErrors = (errors: typeof form.errors) => {
    const errorMessages = [
      ...new Set(Object.values(errors).filter(Boolean) as string[]),
    ];
    const msg =
      errorMessages.join("; ") ||
      t("form.notifications.validation_error_generic");
    setSubmitError(msg);
    notifications.show({
      title: t("form.notifications.validation_error_title"),
      message: msg,
      color: "red",
    });
  };

  const isEditing = Boolean(flight && flight.id);

  const [activeTab, setActiveTab] = useState<FlightEntryTab | null>(
    FLIGHT_ENTRY_TABS.MANUAL,
  );

  const lastLeg = legs[legs.length - 1];
  const firstLeg = legs[0];
  // Once the trip ends where it started, a return has already been added.
  const isRoundTrip =
    legs.length > 1 &&
    !!lastLeg?.arrivalAirport &&
    lastLeg.arrivalAirport === firstLeg?.departureAirport;

  // The next leg starts where the last one landed, usually on the same airline.
  const addNextLeg = () =>
    form.insertListItem(
      "legs",
      newLeg({
        departureAirport: lastLeg?.arrivalAirport ?? "",
        airline: lastLeg?.airline ?? "",
      }),
    );

  // Append the current legs reversed, e.g. SYD→SIN→LHR adds LHR→SIN→SYD.
  const addReturnTrip = () =>
    form.setFieldValue("legs", [
      ...legs,
      ...[...legs].reverse().map((leg) =>
        newLeg({
          departureAirport: leg.arrivalAirport,
          arrivalAirport: leg.departureAirport,
          airline: leg.airline,
        }),
      ),
    ]);

  // Replace the form legs with the AI-parsed legs.
  const handleAiParsed = (parsedFlights: ParsedFlight[]) => {
    let hasInvalidDate = false;
    const parsedLegs = parsedFlights.map((parsed) => {
      let departureDate: Date | null = null;
      try {
        if (parsed.departure_date) {
          departureDate = parseToDate(parsed.departure_date);
        }
      } catch (err) {
        console.error("parseToDate failed for departure_date", {
          error: err,
          value: parsed.departure_date,
        });
        hasInvalidDate = true;
      }
      return newLeg({
        departureDate,
        departureTime: parsed.departure_time ?? "",
        departureAirport: parsed.departure_airport_iata ?? "",
        arrivalAirport: parsed.arrival_airport_iata ?? "",
        airline: parsed.airline_iata ?? "",
        flightNumber: parsed.flight_number ?? "",
      });
    });
    form.setValues({ legs: parsedLegs.length ? parsedLegs : [newLeg()] });
    if (hasInvalidDate) {
      notifications.show({
        title: t("form.notifications.validation_error_title"),
        message: t("form.validation.departure_date_invalid"),
        color: "red",
      });
    }
  };

  const legFields = (index: number) => (
    <Stack>
      <Group grow>
        <DatePickerInput
          label={t("form.labels.departure_date")}
          placeholder={t("form.placeholders.select_date")}
          required
          clearable={false}
          {...form.getInputProps(`legs.${index}.departureDate`)}
        />
        <TextInput
          label={t("form.labels.departure_time")}
          placeholder={t("form.placeholders.time_example")}
          {...form.getInputProps(`legs.${index}.departureTime`)}
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
        {...form.getInputProps(`legs.${index}.departureAirport`)}
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
        {...form.getInputProps(`legs.${index}.arrivalAirport`)}
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
          {...form.getInputProps(`legs.${index}.airline`)}
          clearable={true}
        />
        <TextInput
          label={t("form.labels.flight_number")}
          placeholder={t("form.placeholders.flight_number_example")}
          {...form.getInputProps(`legs.${index}.flightNumber`)}
        />
      </Group>
    </Stack>
  );

  // Manual entry panel JSX - reused for both edit mode (rendered directly) and tabs mode
  const manualPanel = (
    <Stack>
      <form onSubmit={form.onSubmit(handleSubmit, handleValidationErrors)}>
        <Stack>
          {legs.length === 1
            ? legFields(0)
            : legs.map((leg, index) => (
                <Paper key={leg.key} withBorder p="sm" radius="md">
                  <Group justify="space-between" mb="xs">
                    <Title order={5}>
                      {t("form.labels.flight_n", { n: index + 1 })}
                    </Title>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      aria-label={t("form.buttons.remove_flight", {
                        n: index + 1,
                      })}
                      onClick={() => form.removeListItem("legs", index)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                  {legFields(index)}
                </Paper>
              ))}

          {/* Adding legs only makes sense when creating new flights */}
          {!isEditing && (
            <Group gap="xs">
              <Button
                variant="light"
                leftSection={<IconPlus size={16} />}
                onClick={addNextLeg}
              >
                {t("form.buttons.add_flight")}
              </Button>
              {!isRoundTrip && (
                <Button
                  variant="light"
                  leftSection={<IconArrowBackUp size={16} />}
                  onClick={addReturnTrip}
                >
                  {t("form.buttons.add_return")}
                </Button>
              )}
            </Group>
          )}

          {!user && (
            <div style={{ marginTop: 8 }}>
              <div
                id={notSignedInId}
                style={{ color: "orange" }}
                role="status"
                aria-live="polite"
              >
                {t("form.labels.not_signed_in")}
              </div>
            </div>
          )}

          {submitError && (
            <div style={{ marginTop: 8 }}>
              <div
                id={submitErrorId}
                style={{ color: "red" }}
                role="alert"
                aria-live="assertive"
              >
                {submitError}
              </div>
            </div>
          )}

          <Group justify="flex-end" mt="md">
            <Button type="submit" loading={loading} disabled={!user}>
              {isEditing
                ? t("form.buttons.update") || "Update"
                : legs.length > 1
                  ? t("form.buttons.save_multiple")
                  : t("form.buttons.save_single")}
            </Button>
          </Group>
        </Stack>
      </form>
    </Stack>
  );

  return (
    <>
      {isEditing ? (
        // When editing, render only the manual panel without the Tabs header or CSV option
        manualPanel
      ) : (
        <Tabs
          value={activeTab}
          onChange={(v) => setActiveTab(v as FlightEntryTab | null)}
          variant={"outline"}
        >
          <Tabs.List>
            <Tabs.Tab value={FLIGHT_ENTRY_TABS.AI}>
              {t("form.tabs.ai")}
            </Tabs.Tab>
            <Tabs.Tab value={FLIGHT_ENTRY_TABS.MANUAL}>
              {t("form.tabs.manual")}
            </Tabs.Tab>
            <Tabs.Tab value={FLIGHT_ENTRY_TABS.CSV}>
              {t("form.tabs.csv")}
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value={FLIGHT_ENTRY_TABS.MANUAL} pt="xs">
            {manualPanel}
          </Tabs.Panel>

          <Tabs.Panel value={FLIGHT_ENTRY_TABS.AI} pt="xs">
            <FlightChatInput
              onParsed={handleAiParsed}
              onConfirm={() => setActiveTab(FLIGHT_ENTRY_TABS.MANUAL)}
            />
          </Tabs.Panel>

          <Tabs.Panel value={FLIGHT_ENTRY_TABS.CSV} pt="xs">
            {onSaved ? (
              <FlightCsvUpload onComplete={onSaved} />
            ) : (
              <FlightCsvUpload />
            )}
          </Tabs.Panel>
        </Tabs>
      )}
    </>
  );
};

export default FlightEntryForm;
