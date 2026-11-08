import { Card, Container, Divider, Skeleton, Stack } from "@mantine/core";
import { useTranslation } from "react-i18next";

// Placeholder for the route tour: the controls card with the title, the year
// selects, the speed switch and the buttons, then the globe. The globe keeps
// the real map's shape, 62% as tall as it is wide and at least 420px.
// role="status" lets screen readers announce the loading state.
const TourSkeleton = () => {
  const { t } = useTranslation("flights");

  return (
    <Container role="status" aria-label={t("loading")}>
      <Stack mt="md" gap="md">
        <Card withBorder radius="md" shadow="sm">
          <Skeleton height={34} width={220} mb={10} />
          <Stack gap="sm">
            <Skeleton height={61} />
            <Skeleton height={25} width={140} />
            <Skeleton height={36} />
            <Skeleton height={36} width={160} />
            <Divider />
            <Skeleton mih={420} style={{ aspectRatio: "100 / 62" }} />
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
};

export default TourSkeleton;
