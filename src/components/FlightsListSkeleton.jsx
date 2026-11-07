import { Container, Skeleton, Stack } from "@mantine/core";
import { useTranslation } from "react-i18next";

// Placeholder for the flights list page: the title and count line, then a
// year heading over a card of two-line rows, sized like the real list. Shown
// while the route chunk or the flights load, so /flights does not flash the
// stats layout first. role="status" lets screen readers announce the loading
// state.
const FlightsListSkeleton = () => {
  const { t } = useTranslation("flights");

  return (
    <Container size="sm" mt="md" role="status" aria-label={t("loading")}>
      <Stack gap="md">
        <Stack gap={6}>
          <Skeleton height={34} width={120} />
          <Skeleton height={20} width={200} />
        </Stack>
        <Skeleton height={22} width={180} mt={8} />
        <Skeleton height={64 * 6} radius={12} />
      </Stack>
    </Container>
  );
};

export default FlightsListSkeleton;
