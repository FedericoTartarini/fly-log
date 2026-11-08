import { Container, Skeleton, Stack } from "@mantine/core";
import { useTranslation } from "react-i18next";

// Placeholder for the timeline: the centred title, subtitle and metric
// switch, the three totals, then the month grid with room for three years.
// The subtitle wraps to three lines on phones and two on wider screens.
// role="status" lets screen readers announce the loading state.
const TimelineSkeleton = () => {
  const { t } = useTranslation("flights");

  return (
    <Container mt="md" size="sm" role="status" aria-label={t("loading")}>
      <Stack gap="sm">
        <Skeleton height={35} width={240} mx="auto" />
        <Skeleton h={{ base: 61, sm: 41 }} />
        <Skeleton height={36} width={200} mx="auto" />
        <Skeleton height={70} />
        <Skeleton height={118} radius="md" />
      </Stack>
    </Container>
  );
};

export default TimelineSkeleton;
