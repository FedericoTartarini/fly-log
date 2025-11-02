import React from "react";
import {
  Container,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Image,
} from "@mantine/core";
import { Link } from "react-router-dom";
import flightImg from "../assets/flight.jpg";
import { PATHS } from "../constants/MyClasses.ts";
import FeatureSection from "../components/FeatureSection.jsx";
import { useTranslation } from "react-i18next";

function Landing() {
  const { t } = useTranslation("landing");
  return (
    <Container size="md" mt="xl">
      <Stack align="center" gap="xl">
        <Image
          radius="md"
          src={flightImg}
          alt={t("title")}
          h="auto"
          w="100%"
          fit="contain"
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
          <FeatureSection />
        </Group>
      </Stack>
    </Container>
  );
}

export default Landing;
