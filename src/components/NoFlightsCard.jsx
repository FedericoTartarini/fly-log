import React from "react";
import { Button, Card, Image, Text, Title } from "@mantine/core";
import flightImg from "../assets/flight.jpg";

function NoFlightsCard({ setFormOpened }) {
  return (
    <Card shadow="sm" radius="md" withBorder style={{ marginTop: "1rem" }}>
      <Card.Section>
        <Image src={flightImg} height={160} alt="plane wing" />
      </Card.Section>
      <Title order={3} my="md">
        Welcome
      </Title>
      <Text c="dimmed" size="lg" mb="md">
        It looks like you haven't added any flights yet. <br /> Don't worry,
        it's easy to get started! Click the button below to add your first
        flight.
      </Text>
      <Button onClick={() => setFormOpened(true)} fullWidth>
        Add New Flight
      </Button>
    </Card>
  );
}

export default NoFlightsCard;
