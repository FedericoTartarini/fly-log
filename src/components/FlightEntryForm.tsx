import React, { useState, useEffect } from "react";
import {
  TextInput,
  Select,
  Button,
  Group,
  Title,
  Stack,
  Tabs,
  ActionIcon,
} from "@mantine/core";
import { DatePickerInput, TimeInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { randomId } from "@mantine/hooks";
import {
  IconArrowBackUp,
  IconArrowsUpDown,
  IconChevronDown,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { addFlightsForUser } from "../firebaseClient";
import { autoCheckSavedFlights } from "../utils/autoStatusCheck";
import { updateFlightForUser } from "../utils/flightService";
import { toCalendarDay, normalizeTimeString } from "../utils/dateUtils";
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
import { CABIN_CLASSES } from "../utils/emissions";
import { AIRCRAFT_NAMES } from "../utils/aircraft";
import classes from "./FlightEntryForm.module.css";

type SelectOption = {
  value: string;
  label: string;
};

/** One flight (leg) of a possibly multi-city trip, as held by the form. */
type Leg = {
  key: string;
  /** "YYYY-MM-DD", the value Mantine's date pickers use. */
  departureDate: string | null;
  departureTime: string;
  /** Empty means the flight lands on its departure date. */
  arrivalDate: string | null;
  arrivalTime: string;
  departureAirport: string;
  arrivalAirport: string;
  airline: string;
  flightNumber: string;
  /** Empty means not recorded, which the emissions model treats as economy. */
  cabinClass: string;
  /** One of AIRCRAFT_NAMES, or a name a status check saved; empty if unknown. */
  aircraft: string;
};

const newLeg = (overrides: Partial<Leg> = {}): Leg => ({
  key: randomId(),
  departureDate: null,
  departureTime: "",
  arrivalDate: null,
  arrivalTime: "",
  departureAirport: "",
  arrivalAirport: "",
  airline: "",
  flightNumber: "",
  cabinClass: "",
  aircraft: "",
  ...overrides,
});

/** Legs index from a Mantine list path such as "legs.2.arrivalAirport". */
const legIndex = (path: string) => Number(path.split(".")[1]);

interface FlightEntryFormProps {
  onSaved?: () => void;
  /**
   * The tab the form opens on. Ignored when editing. Read once, when the form
   * mounts: the add-flight Modal unmounts its content on close, so each open
   * starts fresh. If the Modal ever keeps its content mounted, a later open
   * on a different tab would be ignored.
   */
  initialTab?: FlightEntryTab;
  flight?: {
    id: string;
    departure_date?: unknown;
    departure_time?: string | null;
    arrival_date?: unknown;
    arrival_time?: string | null;
    departure_airport_iata?: string;
    arrival_airport_iata?: string;
    airline_iata?: string;
    flight_number?: string | null;
    cabin_class?: string | null;
    aircraft_type_name?: string | null;
  } | null;
}

const FlightEntryForm: React.FC<FlightEntryFormProps> = ({
  onSaved,
  flight,
  initialTab = FLIGHT_ENTRY_TABS.AI,
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
    // Stored dates are UTC midnight. As a Date, the picker would show them in
    // local time, which is the previous day west of UTC.
    const departureDate = toCalendarDay(flight.departure_date);
    form.setValues({
      legs: [
        newLeg({
          departureDate,
          departureTime: flight.departure_time || "",
          arrivalDate: toCalendarDay(flight.arrival_date),
          arrivalTime: flight.arrival_time || "",
          departureAirport: flight.departure_airport_iata || "",
          arrivalAirport: flight.arrival_airport_iata || "",
          airline: flight.airline_iata || "",
          flightNumber: flight.flight_number || "",
          cabinClass: flight.cabin_class || "",
          aircraft: flight.aircraft_type_name || "",
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
        arrival_date: leg.arrivalDate ?? null,
        arrival_time: normalizeTimeString(leg.arrivalTime),
        departure_airport_iata: leg.departureAirport,
        arrival_airport_iata: leg.arrivalAirport,
        airline_iata: leg.airline,
        flight_number: leg.flightNumber,
        cabin_class: leg.cabinClass || null,
        aircraft_type_name: leg.aircraft || null,
      }));

      if (flight && flight.id) {
        // Editing a single flight; the form always holds at least one leg.
        await updateFlightForUser(uid, flight.id, flightsToInsert[0]!);
      } else {
        // Each leg is its own flight document, written in one batch so a
        // failure can't leave half a trip saved (and duplicate it on retry).
        const { errorCount, ids } = await addFlightsForUser(
          uid,
          flightsToInsert,
        );
        if (errorCount > 0) {
          throw new Error(`${errorCount} flight(s) could not be saved.`);
        }
        // Not awaited: the save is done, and suggestions arrive on their own.
        void autoCheckSavedFlights(
          uid,
          flightsToInsert.map((f, i) => ({ ...f, id: ids[i]! })),
        );
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
    // Keys look like "legs.1.departureDate"; name the leg when there are several.
    const errorMessages = Object.entries(errors)
      .filter(([, message]) => Boolean(message))
      .map(([path, message]) =>
        form.values.legs.length > 1
          ? `${t("form.labels.flight_n", { n: legIndex(path) + 1 })}: ${message}`
          : String(message),
      );
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

  const [activeTab, setActiveTab] = useState<FlightEntryTab | null>(initialTab);

  const lastLeg = legs[legs.length - 1];
  const firstLeg = legs[0];
  // Once any leg lands back where the trip started, a return already exists.
  const hasReturn =
    legs.length > 1 &&
    legs.some(
      (leg) =>
        leg.arrivalAirport && leg.arrivalAirport === firstLeg?.departureAirport,
    );

  // The next leg starts where the last one landed, usually on the same airline.
  const addNextLeg = () =>
    form.insertListItem(
      "legs",
      newLeg({
        departureAirport: lastLeg?.arrivalAirport ?? "",
        airline: lastLeg?.airline ?? "",
      }),
    );

  // Legs with both airports set; only these can be reversed into a return.
  const completeLegs = legs.filter(
    (leg) => leg.departureAirport && leg.arrivalAirport,
  );

  // Append the complete legs reversed, e.g. SYD→SIN→LHR adds LHR→SIN→SYD.
  const addReturnTrip = () =>
    form.setFieldValue("legs", [
      ...completeLegs,
      ...[...completeLegs].reverse().map((leg) =>
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
      // Kept as "YYYY-MM-DD" strings: as Dates they would be UTC midnight,
      // which the picker shows as the previous day west of UTC.
      const departureDate = toCalendarDay(parsed.departure_date);
      const arrivalDate = toCalendarDay(parsed.arrival_date);
      if (parsed.departure_date && !departureDate) hasInvalidDate = true;
      return newLeg({
        departureDate,
        departureTime: parsed.departure_time ?? "",
        arrivalDate,
        arrivalTime: parsed.arrival_time ?? "",
        departureAirport: parsed.departure_airport_iata ?? "",
        arrivalAirport: parsed.arrival_airport_iata ?? "",
        airline: parsed.airline_iata ?? "",
        flightNumber: parsed.flight_number ?? "",
        cabinClass: parsed.cabin_class ?? "",
        aircraft: parsed.aircraft_type_name ?? "",
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

  const cabinOptions = Object.values(CABIN_CLASSES).map((value) => ({
    value,
    label: t(`cabin.${value}`),
  }));

  const swapAirports = (index: number) => {
    const leg = legs[index]!;
    form.setFieldValue(`legs.${index}.departureAirport`, leg.arrivalAirport);
    form.setFieldValue(`legs.${index}.arrivalAirport`, leg.departureAirport);
  };

  const airportSelect = (index: number, field: keyof Leg, label: string) => (
    <Select
      label={label}
      placeholder={t("form.placeholders.search_airports")}
      searchable
      limit={5}
      required
      withAsterisk={false}
      data={airportOptions}
      maxDropdownHeight={280}
      nothingFoundMessage={t("form.placeholders.no_matching_airports")}
      {...form.getInputProps(`legs.${index}.${field}`)}
      clearable={true}
    />
  );

  const legFields = (index: number) => {
    const leg = legs[index]!;
    return (
      <>
        <div className={classes.airports}>
          <Stack gap={8}>
            {airportSelect(
              index,
              "departureAirport",
              t("form.labels.departure_airport"),
            )}
            {airportSelect(
              index,
              "arrivalAirport",
              t("form.labels.arrival_airport"),
            )}
          </Stack>
          <ActionIcon
            variant="default"
            radius="xl"
            className={classes.swap}
            aria-label={t("form.buttons.swap")}
            onClick={() => swapAirports(index)}
          >
            <IconArrowsUpDown size={18} aria-hidden />
          </ActionIcon>
        </div>

        <div className={classes.pair}>
          <DatePickerInput
            label={t("form.labels.departure_date")}
            placeholder={t("form.placeholders.select_date")}
            required
            withAsterisk={false}
            clearable={false}
            {...form.getInputProps(`legs.${index}.departureDate`)}
          />
          <TimeInput
            label={t("form.labels.departure_time")}
            {...form.getInputProps(`legs.${index}.departureTime`)}
          />
        </div>

        <div className={classes.pair}>
          <Select
            label={t("form.labels.airline")}
            placeholder={t("form.placeholders.search_airlines")}
            searchable
            limit={5}
            required
            withAsterisk={false}
            data={airlineOptions}
            maxDropdownHeight={280}
            nothingFoundMessage={t("form.placeholders.no_matching_airlines")}
            {...form.getInputProps(`legs.${index}.airline`)}
            clearable={true}
          />
          <TextInput
            label={t("form.labels.flight_number")}
            placeholder={t("form.placeholders.flight_number_example")}
            autoCapitalize="characters"
            classNames={{ input: classes.mono }}
            {...form.getInputProps(`legs.${index}.flightNumber`)}
          />
        </div>

        {/* Folded away, but opened once when it first holds something, as
            when editing a flight or after the AI filled in an arrival time.
            After that the user's own toggling wins. */}
        <details
          className={classes.optional}
          ref={(el) => {
            if (
              el &&
              !el.dataset.opened &&
              (leg.arrivalDate ||
                leg.arrivalTime ||
                leg.cabinClass ||
                leg.aircraft)
            ) {
              el.open = true;
              el.dataset.opened = "true";
            }
          }}
        >
          <summary>
            <span>
              {t("form.labels.optional_section")}{" "}
              <span className={classes.muted} style={{ fontWeight: 400 }}>
                · {t("form.labels.optional")}
              </span>
            </span>
            <IconChevronDown
              size={18}
              className={classes.chevron}
              aria-hidden
            />
          </summary>
          <div className={classes.optionalFields}>
            <div className={classes.pair}>
              <DatePickerInput
                label={t("form.labels.arrival_date")}
                placeholder={t("form.placeholders.same_day")}
                clearable
                {...form.getInputProps(`legs.${index}.arrivalDate`)}
              />
              <TimeInput
                label={t("form.labels.arrival_time")}
                {...form.getInputProps(`legs.${index}.arrivalTime`)}
              />
            </div>
            <Select
              label={t("form.labels.cabin_class")}
              placeholder={t("cabin.economy")}
              description={t("form.descriptions.cabin_class")}
              inputWrapperOrder={["label", "input", "description", "error"]}
              clearable
              data={cabinOptions}
              {...form.getInputProps(`legs.${index}.cabinClass`)}
            />
            <Select
              label={t("form.labels.aircraft")}
              placeholder={t("form.placeholders.search_aircraft")}
              searchable
              clearable
              limit={8}
              maxDropdownHeight={280}
              nothingFoundMessage={t("form.placeholders.no_matching_aircraft")}
              // A status check can save a name that isn't listed; keep it selectable.
              data={
                !leg.aircraft || AIRCRAFT_NAMES.includes(leg.aircraft)
                  ? AIRCRAFT_NAMES
                  : [leg.aircraft, ...AIRCRAFT_NAMES]
              }
              {...form.getInputProps(`legs.${index}.aircraft`)}
            />
          </div>
        </details>
      </>
    );
  };

  const saveLabel = isEditing
    ? t("form.buttons.update")
    : t("form.buttons.save", { count: legs.length });

  // Manual entry panel JSX - reused for both edit mode (rendered directly) and tabs mode
  const manualPanel = (
    <form
      onSubmit={form.onSubmit(handleSubmit, handleValidationErrors)}
      className={classes.panel}
    >
      {/* Same wrapper for one leg or many, so leg 1 never remounts */}
      {legs.map((leg, index) => (
        <div key={leg.key} className={classes.card}>
          <div className={classes.cardTitle}>
            <Title order={5}>
              {legs.length > 1
                ? t("form.labels.flight_n", { n: index + 1 })
                : t("form.labels.flight")}
            </Title>
            {legs.length > 1 && (
              <ActionIcon
                variant="subtle"
                size="lg"
                aria-label={t("form.buttons.remove_flight", {
                  n: index + 1,
                })}
                onClick={() => form.removeListItem("legs", index)}
              >
                <IconTrash size={18} aria-hidden />
              </ActionIcon>
            )}
          </div>
          {legFields(index)}
        </div>
      ))}

      {/* Adding legs only makes sense when creating new flights */}
      {!isEditing && (
        <Group gap="xs">
          <Button
            variant="default"
            className={classes.dashed}
            leftSection={<IconPlus size={18} aria-hidden />}
            onClick={addNextLeg}
          >
            {t("form.buttons.add_flight")}
          </Button>
          {!hasReturn && completeLegs.length > 0 && (
            <Button
              variant="default"
              className={classes.dashed}
              leftSection={<IconArrowBackUp size={18} aria-hidden />}
              onClick={addReturnTrip}
            >
              {t("form.buttons.add_return")}
            </Button>
          )}
        </Group>
      )}

      {!user && (
        <div
          id={notSignedInId}
          style={{ color: "var(--fl-warn-text)" }}
          role="status"
          aria-live="polite"
        >
          {t("form.labels.not_signed_in")}
        </div>
      )}

      {submitError && (
        <div
          id={submitErrorId}
          style={{ color: "var(--fl-accent-text)" }}
          role="alert"
          aria-live="assertive"
        >
          {submitError}
        </div>
      )}

      <div className={classes.footer}>
        <Button
          type="submit"
          fullWidth
          size="lg"
          loading={loading}
          disabled={!user}
        >
          {saveLabel}
        </Button>
      </div>
    </form>
  );

  // Editing shows only the form, without the tabs or the CSV option.
  if (isEditing) return manualPanel;

  return (
    <Tabs
      value={activeTab}
      onChange={(v) => setActiveTab(v as FlightEntryTab | null)}
      classNames={{
        root: classes.tabs,
        tab: classes.tab,
        panel: classes.tabPanel,
      }}
    >
      <Tabs.List grow>
        <Tabs.Tab value={FLIGHT_ENTRY_TABS.AI}>{t("form.tabs.ai")}</Tabs.Tab>
        <Tabs.Tab value={FLIGHT_ENTRY_TABS.MANUAL}>
          {t("form.tabs.manual")}
        </Tabs.Tab>
        <Tabs.Tab value={FLIGHT_ENTRY_TABS.CSV}>{t("form.tabs.csv")}</Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value={FLIGHT_ENTRY_TABS.MANUAL}>{manualPanel}</Tabs.Panel>

      <Tabs.Panel value={FLIGHT_ENTRY_TABS.AI}>
        <FlightChatInput
          onParsed={handleAiParsed}
          onConfirm={() => setActiveTab(FLIGHT_ENTRY_TABS.MANUAL)}
        />
      </Tabs.Panel>

      <Tabs.Panel value={FLIGHT_ENTRY_TABS.CSV}>
        {onSaved ? (
          <FlightCsvUpload onComplete={onSaved} />
        ) : (
          <FlightCsvUpload />
        )}
      </Tabs.Panel>
    </Tabs>
  );
};

export default FlightEntryForm;
