import React, { lazy, Suspense } from "react";
import {
  Container,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Image,
  Loader,
  Center,
} from "@mantine/core";
import { Link } from "react-router-dom";
import flightImg from "../assets/flight.webp";
import flightImg380 from "../assets/flight-380.webp";
import flightImg760 from "../assets/flight-760.webp";
import { PATHS } from "../constants/MyClasses.ts";
import { useTranslation } from "react-i18next";

const FeatureSection = lazy(() => import("../components/FeatureSection.jsx"));

function Landing() {
  const { t } = useTranslation("landing");
  return (
    <Container size="md" mt="xl">
      <Stack align="center" gap="xl">
        <Image
          radius="md"
          src={flightImg}
          srcSet={`${flightImg380} 380w, ${flightImg760} 760w, ${flightImg} 1920w`}
          sizes="(max-width: 600px) 380px, (max-width: 1200px) 760px, 1920px"
          alt={t("flight_image_alt")}
          h="auto"
          w="100%"
          fit="contain"
          fetchpriority="high"
        />
        <Title order={1} ta="center">
          {t("title")}
        </Title>
        <Text c="dimmed" ta="center" size="lg" maw={580}>
          {t("subtitle")}
        </Text>
        <Group justify="center" gap="md" mt="xl">
          <Button
            component={Link}
            to={PATHS.LOGIN}
            size="lg"
            variant="gradient"
            gradient={{ from: "blue", to: "cyan" }}
          >
            {t("get_started")}
          </Button>
          <Button component={Link} to={PATHS.ABOUT} size="lg" variant="default">
            {t("learn_more")}
          </Button>
        </Group>
        <Group justify="center" gap="md" mt="xl">
          <Suspense
            fallback={
              <Center>
                <Loader />
              </Center>
            }
          >
            <FeatureSection />
          </Suspense>
        </Group>
      </Stack>
    </Container>
  );
}

export default Landing;
