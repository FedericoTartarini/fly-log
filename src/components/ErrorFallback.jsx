import { Container, Stack, Title, Text, Button } from "@mantine/core";
import { useTranslation } from "react-i18next";

// Friendly replacement for a blank screen when a page throws while rendering.
const ErrorFallback = ({ onReload }) => {
  const { t } = useTranslation("common");
  return (
    <Container size="sm" mt="xl">
      <Stack align="center" gap="md">
        <Title order={3}>{t("error.title")}</Title>
        <Text c="dimmed" ta="center">
          {t("error.message")}
        </Text>
        <Button onClick={onReload}>{t("error.reload")}</Button>
      </Stack>
    </Container>
  );
};

export default ErrorFallback;
