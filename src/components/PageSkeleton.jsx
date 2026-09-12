import { Grid, Paper, Skeleton, Stack } from "@mantine/core";

// Placeholder that mirrors the stats page layout: full-width map, the summary
// grid, an action button, two flight cards and a chart. Every loading state in
// the authenticated app renders this same shape in the same place, so nothing
// jumps as auth resolves, the route chunk arrives, and the flights land.
const PageSkeleton = () => (
  <>
    <Skeleton height="60vh" radius={0} />

    <Paper radius="lg" pt="md" style={{ position: "relative", zIndex: 1 }}>
      <Stack gap="md" px="md">
        <Grid>
          {Array.from({ length: 9 }, (_, i) => (
            <Grid.Col key={i} span={{ base: 6, xs: 4 }}>
              <Skeleton height={26} mb={8} />
              <Skeleton height={10} width="55%" />
            </Grid.Col>
          ))}
        </Grid>

        <Skeleton height={36} radius="xl" />

        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Skeleton height={140} radius="md" />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Skeleton height={140} radius="md" />
          </Grid.Col>
        </Grid>

        <Skeleton height={160} radius="md" />
      </Stack>
    </Paper>
  </>
);

export default PageSkeleton;
