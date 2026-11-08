import { Container, SimpleGrid, Skeleton, Stack } from "@mantine/core";
import { useTranslation } from "react-i18next";

// Placeholder for the badges page: the title, count and tick strip, the
// "Closest next" card, then one category of badge passes, one column on
// phones and up to three on wide screens. role="status" lets screen readers announce the loading state.
const BadgesSkeleton = () => {
  const { t } = useTranslation("flights");

  return (
    <Container
      size="lg"
      mt="md"
      pb={96}
      role="status"
      aria-label={t("loading")}
    >
      <Stack gap={20}>
        <Stack gap={10}>
          <Stack gap={2}>
            <Skeleton height={34} width={120} />
            <Skeleton height={24} width={180} />
          </Stack>
          <Skeleton height={8} />
        </Stack>
        <Skeleton height={102} radius={12} />
        <Stack gap={8}>
          <Skeleton height={27} width={160} />
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing={8}>
            {[0, 1, 2, 3, 4, 5].map((tile) => (
              <Skeleton key={tile} height={112} radius={12} />
            ))}
          </SimpleGrid>
        </Stack>
      </Stack>
    </Container>
  );
};

export default BadgesSkeleton;
