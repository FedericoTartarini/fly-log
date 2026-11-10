import { Container, Skeleton, Stack } from "@mantine/core";
import { useTranslation } from "react-i18next";

// Placeholder for the route tour: the title and count line, the globe (square
// on a phone), then the boarding pass with the playback controls.
// role="status" lets screen readers announce the loading state.
const TourSkeleton = () => {
  const { t } = useTranslation("flights");

  return (
    <Container role="status" aria-label={t("loading")} mt="md" size="sm">
      <Stack gap="md">
        <div>
          <Skeleton height={34} width={180} mb={6} />
          <Skeleton height={20} width={260} />
        </div>
        <Skeleton radius={12} style={{ aspectRatio: "1 / 1" }} mah={440} />
        <Skeleton radius={12} height={220} />
      </Stack>
    </Container>
  );
};

export default TourSkeleton;
