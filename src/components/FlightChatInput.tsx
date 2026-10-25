import React, { useState } from "react";
import {
  Textarea,
  Button,
  Group,
  Text,
  Alert,
  Stack,
  Badge,
  Paper,
  ThemeIcon,
  Divider,
  List,
  Flex,
  UnstyledButton,
} from "@mantine/core";
import {
  IconRobot,
  IconAlertCircle,
  IconSparkles,
  IconPlane,
  IconArrowRight,
  IconInfoCircle,
} from "@tabler/icons-react";
import {
  parseFlightFromText,
  REQUIRED_FIELDS,
  type ParsedFlight,
} from "../utils/flightAiParser";
import { useTranslation } from "react-i18next";

interface FlightChatInputProps {
  /** Called as soon as parsing succeeds — pre-fills the form fields. */
  onParsed: (flights: ParsedFlight[]) => void;
  /** Called when the user clicks "Review and save" after a successful parse. */
  onConfirm: () => void;
}

/** Map each required field key to its i18n key in the form labels namespace. */
const FIELD_I18N_KEYS: Record<string, string> = {
  departure_airport_iata: "form.labels.departure_airport",
  arrival_airport_iata: "form.labels.arrival_airport",
  departure_date: "form.labels.departure_date",
  airline_iata: "form.labels.airline",
};

// AI-assisted natural language parser for flight entry.
export const FlightChatInput: React.FC<FlightChatInputProps> = ({
  onParsed,
  onConfirm,
}) => {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedFlight[] | null>(null);
  const { t } = useTranslation("flights");

  const examples = t("ai.examples", { returnObjects: true }) as string[];

  const isMultiLeg = (parsed?.length ?? 0) > 1;

  // Prefix each missing field with its leg number when there are several legs.
  const missingFields: string[] = (parsed ?? []).flatMap((leg, index) =>
    REQUIRED_FIELDS.filter((f) => !leg[f]).map((f) => {
      const label = t(FIELD_I18N_KEYS[f] ?? String(f));
      return isMultiLeg
        ? `${t("form.labels.flight_n", { n: index + 1 })}: ${label}`
        : label;
    }),
  );

  // The parser only returns legs with at least one airport.
  const hasAnyParsedField = Boolean(parsed?.length);

  const handleParse = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    setParsed(null);

    try {
      const result = await parseFlightFromText(input);
      setParsed(result);
      onParsed(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("ai.error_generic");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleExampleClick = (example: string) => {
    setInput(example);
    setError(null);
    setParsed(null);
  };

  const handleReset = () => {
    setInput("");
    setError(null);
    setParsed(null);
  };

  return (
    <Stack mt="sm" gap="md">
      {/* Header */}
      <Flex gap="xs">
        <ThemeIcon size="md" variant="light" color="accent">
          <IconRobot size={16} />
        </ThemeIcon>
        <div>
          <Text size="sm" fw={600}>
            {t("ai.title")}
          </Text>
          <Text size="xs" c="dimmed">
            {t("ai.subtitle")}
          </Text>
        </div>
      </Flex>

      {/* Example prompts */}
      <Paper
        withBorder
        p="sm"
        radius="md"
        bg="var(--mantine-color-default-hover)"
      >
        <Text size="xs" c="dimmed" mb="xs" fw={500}>
          {t("ai.examples_label")}
        </Text>
        <Stack gap={6}>
          {Array.isArray(examples) &&
            examples.map((example) => (
              <UnstyledButton
                key={example}
                onClick={() => handleExampleClick(example)}
                style={{ textAlign: "left" }}
              >
                <Text
                  size="xs"
                  c="accent"
                  style={{
                    textDecoration: "underline dotted",
                  }}
                >
                  &quot;{example}&quot;
                </Text>
              </UnstyledButton>
            ))}
        </Stack>
      </Paper>

      {/* Input */}
      <Textarea
        placeholder={t("ai.input_placeholder")}
        value={input}
        onChange={(e) => {
          setInput(e.currentTarget.value);
          setError(null);
          setParsed(null);
        }}
        minRows={3}
        autosize
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleParse();
          }
        }}
      />
      <Text size="xs" c="dimmed">
        {t("ai.keyboard_hint")}
      </Text>

      {/* Error */}
      {error && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          color="red"
          title={t("ai.error_title")}
          variant="light"
        >
          {error}
        </Alert>
      )}

      {/* Success + parsed preview */}
      {hasAnyParsedField && parsed && (
        <Alert
          icon={<IconSparkles size={16} />}
          color="primary"
          title={t("ai.success_title")}
          variant="light"
        >
          <Stack gap="xs">
            <Text size="xs">{t("ai.success_subtitle")}</Text>

            {parsed.map((leg, index) => (
              <React.Fragment key={index}>
                <Text size="xs" fw={600} tt="uppercase" c="dimmed">
                  {isMultiLeg
                    ? t("form.labels.flight_n", { n: index + 1 })
                    : t("ai.flight_details")}
                </Text>
                <List size="xs" spacing={4} icon={<IconPlane size={12} />}>
                  {leg.departure_airport_iata && (
                    <List.Item>
                      {t("ai.from")}:{" "}
                      <Badge size="xs" variant="light" color="blue">
                        {leg.departure_airport_iata}
                      </Badge>
                    </List.Item>
                  )}
                  {leg.arrival_airport_iata && (
                    <List.Item>
                      {t("ai.to")}:{" "}
                      <Badge size="xs" variant="light" color="green">
                        {leg.arrival_airport_iata}
                      </Badge>
                    </List.Item>
                  )}
                  {leg.departure_date && (
                    <List.Item>
                      {t("ai.date")}:{" "}
                      <Badge size="xs" variant="light" color="orange">
                        {leg.departure_date}
                      </Badge>
                    </List.Item>
                  )}
                  {leg.departure_time && (
                    <List.Item>
                      {t("ai.time")}:{" "}
                      <Badge size="xs" variant="light" color="cyan">
                        {leg.departure_time}
                      </Badge>
                    </List.Item>
                  )}
                  {leg.arrival_time && (
                    <List.Item>
                      {t("ai.arrival")}:{" "}
                      <Badge size="xs" variant="light" color="cyan">
                        {leg.arrival_date
                          ? `${leg.arrival_date} ${leg.arrival_time}`
                          : leg.arrival_time}
                      </Badge>
                    </List.Item>
                  )}
                  {leg.cabin_class && (
                    <List.Item>
                      {t("form.labels.cabin_class")}:{" "}
                      <Badge size="xs" variant="light" color="teal">
                        {t(`cabin.${leg.cabin_class}`)}
                      </Badge>
                    </List.Item>
                  )}
                  {leg.aircraft_type_name && (
                    <List.Item>
                      {t("form.labels.aircraft")}:{" "}
                      <Badge size="xs" variant="light" color="indigo">
                        {leg.aircraft_type_name}
                      </Badge>
                    </List.Item>
                  )}
                  {leg.airline_iata && (
                    <List.Item>
                      {t("ai.airline")}:{" "}
                      <Badge size="xs" variant="light" color="grape">
                        {leg.airline_iata}
                      </Badge>
                    </List.Item>
                  )}
                  {leg.flight_number && (
                    <List.Item>
                      {t("ai.flight_number")}:{" "}
                      <Badge size="xs" variant="light">
                        {leg.flight_number}
                      </Badge>
                    </List.Item>
                  )}
                </List>
              </React.Fragment>
            ))}
          </Stack>
        </Alert>
      )}

      {/* Missing fields warning */}
      {parsed && missingFields.length > 0 && (
        <Alert
          icon={<IconInfoCircle size={16} />}
          color="yellow"
          title={t("ai.missing_title")}
          variant="light"
        >
          <Text size="xs" mb={4}>
            {t("ai.missing_subtitle")}
          </Text>
          <List size="xs" spacing={2}>
            {missingFields.map((field) => (
              <List.Item key={field}>
                <Text size="xs" fw={500}>
                  {field}
                </Text>
              </List.Item>
            ))}
          </List>
        </Alert>
      )}

      <Divider />

      <Group justify="space-between" align="center">
        <Text size="xs" c="dimmed">
          {t("ai.powered_by")}
        </Text>
        <Group gap="xs">
          {/* Show "Review and save" once we have a successful parse */}
          {hasAnyParsedField && (
            <Button
              variant="light"
              color="accent"
              size="xs"
              rightSection={<IconArrowRight size={14} />}
              onClick={onConfirm}
            >
              {t("ai.review_and_save")}
            </Button>
          )}
          {hasAnyParsedField ? (
            <Button variant="subtle" size="xs" onClick={handleReset}>
              {t("ai.reset")}
            </Button>
          ) : (
            <Button
              leftSection={<IconRobot size={16} />}
              onClick={handleParse}
              loading={loading}
              disabled={!input.trim()}
              variant="gradient"
            >
              {t("ai.parse_button")}
            </Button>
          )}
        </Group>
      </Group>
    </Stack>
  );
};

export default FlightChatInput;
