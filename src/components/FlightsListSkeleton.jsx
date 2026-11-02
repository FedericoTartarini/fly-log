import { Container, Skeleton, Stack } from "@mantine/core";
import { useTranslation } from "react-i18next";

// Placeholder for the flights list page: a centred title, then rows shaped
// like the flight cards. Shown while the route chunk or the flights load, so
// /flights does not flash the stats layout first. role="status" lets screen
// readers announce the loading state.
const FlightsListSkeleton = () => {
  const { t } = useTranslation("flights");

  return (
    <Container mt="md" role="status" aria-label={t("loading")}>
      <Stack gap="xl">
        <Skeleton height={28} width={160} mx="auto" />
        <Stack gap="sm">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} height={72} radius="md" />
          ))}
        </Stack>
      </Stack>
    </Container>
  );
};

export default FlightsListSkeleton;
