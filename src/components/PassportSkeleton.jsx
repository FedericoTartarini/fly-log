import { Container, Skeleton, Stack } from "@mantine/core";
import { useTranslation } from "react-i18next";

// Placeholder for the passport page: the title and count, then the page of
// stamps. role="status" lets screen readers announce the loading state.
const PassportSkeleton = () => {
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
        <Stack gap={2}>
          <Skeleton height={34} width={140} />
          <Skeleton height={24} width={160} />
        </Stack>
        <Skeleton height={330} radius={12} />
      </Stack>
    </Container>
  );
};

export default PassportSkeleton;
