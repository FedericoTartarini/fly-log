import { Container, SimpleGrid, Skeleton, Stack } from "@mantine/core";
import { useTranslation } from "react-i18next";

// Placeholder for All stats: the back link and title, three groups of four
// stat cards, then the "How far" card. Sizes are the ones measured on the
// real page, so nothing jumps when it arrives. role="status" lets screen
// readers announce the loading state.
const AllStatsSkeleton = () => {
  const { t } = useTranslation("flights");

  return (
    <Container size="lg" pb={96} role="status" aria-label={t("loading")}>
      <Stack gap={24}>
        <Skeleton height={20} width={64} my={12} />
        <Skeleton height={34} width={200} />
        {[0, 1, 2].map((group) => (
          <Stack gap={10} key={group}>
            <Skeleton height={24} width={160} />
            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing={10}>
              {[0, 1, 2, 3].map((card) => (
                <Skeleton key={card} height={80} radius={12} />
              ))}
            </SimpleGrid>
          </Stack>
        ))}
        <Skeleton height={289} radius={12} />
      </Stack>
    </Container>
  );
};

export default AllStatsSkeleton;
