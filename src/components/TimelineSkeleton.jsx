import { Container, SimpleGrid, Skeleton, Stack } from "@mantine/core";
import { useTranslation } from "react-i18next";

// Placeholder for the timeline: the title and subtitle, the metric switch,
// the three tiles, then the month grid with room for three years.
// role="status" lets screen readers announce the loading state.
const TimelineSkeleton = () => {
  const { t } = useTranslation("flights");

  return (
    <Container
      mt="md"
      size="sm"
      pb={96}
      role="status"
      aria-label={t("loading")}
    >
      <Stack gap="md">
        <Stack gap={2}>
          <Skeleton height={34} width={160} />
          <Skeleton h={{ base: 70, sm: 46 }} />
        </Stack>
        <Skeleton height={36} />
        <SimpleGrid cols={3} spacing={8}>
          {[0, 1, 2].map((tile) => (
            <Skeleton key={tile} height={86} radius={12} />
          ))}
        </SimpleGrid>
        <Skeleton height={200} radius={12} />
      </Stack>
    </Container>
  );
};

export default TimelineSkeleton;
