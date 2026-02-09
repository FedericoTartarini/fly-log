import React from "react";
import { Button, Card, Image, Text, Title } from "@mantine/core";
import flightImg from "../assets/flight.webp";
import flightImg380 from "../assets/flight-380.webp";
import flightImg760 from "../assets/flight-760.webp";
import { useTranslation } from "react-i18next";

function NoFlightsCard({ setFormOpened }) {
  const { t } = useTranslation("flights");
  return (
    <Card shadow="sm" radius="md" withBorder style={{ marginTop: "1rem" }}>
      <Card.Section>
        <Image
          src={flightImg}
          srcSet={`${flightImg380} 380w, ${flightImg760} 760w, ${flightImg} 1920w`}
          sizes="(max-width: 600px) 380px, (max-width: 1200px) 760px, 1920px"
          height={160}
          alt={t("image_alt")}
        />
      </Card.Section>
      <Title order={3} my="md">
        {t("no_flights_card.title")}
      </Title>
      <Text c="dimmed" size="lg" mb="md">
        {t("no_flights_card.description")}
      </Text>
      <Button onClick={() => setFormOpened(true)} fullWidth>
        {t("no_flights_card.cta")}
      </Button>
    </Card>
  );
}

export default NoFlightsCard;
