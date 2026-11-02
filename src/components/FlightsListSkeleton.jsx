import { Container, Skeleton, Stack } from "@mantine/core";

// Placeholder for the flights list page: a centred title, then rows shaped
// like the flight cards. Shown while the route chunk or the flights load, so
// /flights does not flash the stats layout first.
const FlightsListSkeleton = () => (
  <Container mt="md">
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

export default FlightsListSkeleton;
