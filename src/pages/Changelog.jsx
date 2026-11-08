import { Container, List, Stack, Text, Title } from "@mantine/core";
import { useTranslation } from "react-i18next";
import entries from "../constants/changelog.json";
import { formatCalendarDate } from "../utils/dateUtils";

// What changed in each release, newest first. Entries live in
// changelog.json and are English only; a feature PR adds its own entry.
function Changelog() {
  const { t, i18n } = useTranslation("common");

  return (
    <Container size="sm" mt="md" pb={96}>
      <Stack gap="xl">
        <Stack gap={4}>
          <Title order={1} fz={28}>
            {t("changelog.title")}
          </Title>
          <Text c="var(--fl-muted)">{t("changelog.intro")}</Text>
        </Stack>

        {entries.map(({ date, title, items }) => (
          <Stack component="section" gap="xs" key={date}>
            <Text
              component="time"
              dateTime={date}
              size="sm"
              ff="monospace"
              c="var(--fl-muted)"
            >
              {formatCalendarDate(date, "D MMMM YYYY", i18n.language)}
            </Text>
            <Title order={2} fz={20}>
              {title}
            </Title>
            <List spacing={6}>
              {items.map((item) => (
                <List.Item key={item}>{item}</List.Item>
              ))}
            </List>
          </Stack>
        ))}
      </Stack>
    </Container>
  );
}

export default Changelog;
