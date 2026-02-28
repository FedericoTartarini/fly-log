import React from "react";
import { Button, Card, Container, Image, Text, Title } from "@mantine/core";
import flightImg from "../assets/flight.webp";
import flightImg380 from "../assets/flight-380.webp";
import flightImg760 from "../assets/flight-760.webp";
import flightImg1200 from "../assets/flight-1200.webp";
import flightImg1800 from "../assets/flight-1800.webp";
import { useTranslation } from "react-i18next";

function NoFlightsCard({ setFormOpened }) {
  const { t } = useTranslation("flights");
  return (
    <Container>
      <Card shadow="sm" radius="md" withBorder style={{ marginTop: "1rem" }}>
        <Card.Section>
          <Image
            src={flightImg}
            srcSet={`${flightImg380} 380w, ${flightImg760} 760w, ${flightImg1200} 1200w, ${flightImg1800} 1800w`}
            sizes="(max-width: 900px) 90vw, (max-width: 1400px) 1200px, 1800px"
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
        <Button
          onClick={() => setFormOpened(true)}
          fullWidth
          variant="gradient"
        >
          {t("no_flights_card.cta")}
        </Button>
      </Card>
    </Container>
  );
}

export default NoFlightsCard;
