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
  onParsed: (flight: ParsedFlight) => void;
  /** Called when the user clicks "Go to Manual Entry" after a successful parse. */
  onConfirm: () => void;
}

/** Map each required field key to its i18n key in the form labels namespace. */
const FIELD_I18N_KEYS: Record<string, string> = {
  departure_airport_iata: "form.labels.departure_airport",
  arrival_airport_iata: "form.labels.arrival_airport",
  departure_date: "form.labels.departure_date",
  airline_iata: "form.labels.airline",
};

export const FlightChatInput: React.FC<FlightChatInputProps> = ({
  onParsed,
  onConfirm,
}) => {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedFlight | null>(null);
  const { t } = useTranslation("flights");

  const examples = t("ai.examples", { returnObjects: true }) as string[];

  const missingFields: string[] = parsed
    ? REQUIRED_FIELDS.filter((f) => !parsed[f]).map((f) =>
        t(FIELD_I18N_KEYS[f] ?? String(f)),
      )
    : [];

  const hasAnyParsedField = Boolean(
    parsed &&
      (parsed.departure_airport_iata ||
        parsed.arrival_airport_iata ||
        parsed.departure_date ||
        parsed.airline_iata),
  );

  const hasReturn = !!parsed?.return_date;

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

            {/* Outbound leg */}
            <Text size="xs" fw={600} tt="uppercase" c="dimmed">
              {hasReturn ? t("ai.outbound_leg") : t("ai.flight_details")}
            </Text>
            <List size="xs" spacing={4} icon={<IconPlane size={12} />}>
              {parsed.departure_airport_iata && (
                <List.Item>
                  {t("ai.from")}:{" "}
                  <Badge size="xs" variant="light" color="blue">
                    {parsed.departure_airport_iata}
                  </Badge>
                </List.Item>
              )}
              {parsed.arrival_airport_iata && (
                <List.Item>
                  {t("ai.to")}:{" "}
                  <Badge size="xs" variant="light" color="green">
                    {parsed.arrival_airport_iata}
                  </Badge>
                </List.Item>
              )}
              {parsed.departure_date && (
                <List.Item>
                  {t("ai.date")}:{" "}
                  <Badge size="xs" variant="light" color="orange">
                    {parsed.departure_date}
                  </Badge>
                </List.Item>
              )}
              {parsed.departure_time && (
                <List.Item>
                  {t("ai.time")}:{" "}
                  <Badge size="xs" variant="light" color="cyan">
                    {parsed.departure_time}
                  </Badge>
                </List.Item>
              )}
              {parsed.airline_iata && (
                <List.Item>
                  {t("ai.airline")}:{" "}
                  <Badge size="xs" variant="light" color="grape">
                    {parsed.airline_iata}
                  </Badge>
                </List.Item>
              )}
              {parsed.flight_number && (
                <List.Item>
                  {t("ai.flight_number")}:{" "}
                  <Badge size="xs" variant="light">
                    {parsed.flight_number}
                  </Badge>
                </List.Item>
              )}
            </List>

            {/* Return leg */}
            {hasReturn && (
              <>
                <Text size="xs" fw={600} tt="uppercase" c="dimmed" mt="xs">
                  {t("ai.return_leg")}
                </Text>
                <List size="xs" spacing={4} icon={<IconPlane size={12} />}>
                  {parsed.arrival_airport_iata && (
                    <List.Item>
                      {t("ai.from")}:{" "}
                      <Badge size="xs" variant="light" color="green">
                        {parsed.arrival_airport_iata}
                      </Badge>
                    </List.Item>
                  )}
                  {parsed.departure_airport_iata && (
                    <List.Item>
                      {t("ai.to")}:{" "}
                      <Badge size="xs" variant="light" color="blue">
                        {parsed.departure_airport_iata}
                      </Badge>
                    </List.Item>
                  )}
                  {parsed.return_date && (
                    <List.Item>
                      {t("ai.date")}:{" "}
                      <Badge size="xs" variant="light" color="orange">
                        {parsed.return_date}
                      </Badge>
                    </List.Item>
                  )}
                  {parsed.return_time && (
                    <List.Item>
                      {t("ai.time")}:{" "}
                      <Badge size="xs" variant="light" color="cyan">
                        {parsed.return_time}
                      </Badge>
                    </List.Item>
                  )}
                  {parsed.return_flight_number && (
                    <List.Item>
                      {t("ai.flight_number")}:{" "}
                      <Badge size="xs" variant="light">
                        {parsed.return_flight_number}
                      </Badge>
                    </List.Item>
                  )}
                </List>
              </>
            )}
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
          {/* Show "Go to Manual Entry" once we have a successful parse */}
          {hasAnyParsedField && (
            <Button
              variant="light"
              color="accent"
              size="xs"
              rightSection={<IconArrowRight size={14} />}
              onClick={onConfirm}
            >
              {t("ai.go_to_manual")}
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
