import { Container, SimpleGrid, Skeleton, Stack } from "@mantine/core";
import { useTranslation } from "react-i18next";

// Placeholder for the badges page: the title and count, then two categories
// of six badge tiles in the real page's grid. role="status" lets screen
// readers announce the loading state.
const BadgesSkeleton = () => {
  const { t } = useTranslation("flights");

  return (
    <Container size="lg" my="md" role="status" aria-label={t("loading")}>
      <Stack gap="lg">
        <Stack gap={4}>
          <Skeleton height={35} width={120} />
          <Skeleton height={25} width={180} />
        </Stack>
        {[0, 1].map((category) => (
          <Stack gap="sm" key={category}>
            <Skeleton height={20} width={200} />
            <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} spacing="md">
              {[0, 1, 2, 3, 4, 5].map((tile) => (
                <Skeleton key={tile} height={123} radius="md" />
              ))}
            </SimpleGrid>
          </Stack>
        ))}
      </Stack>
    </Container>
  );
};

export default BadgesSkeleton;
