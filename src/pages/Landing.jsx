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

function Landing() {
  return (
    <Container size="md" mt="xl">
      <Stack align="center" gap="xl">
        <Image
          radius="md"
          src={flightImg}
          alt="Airplane wing in the sky"
          h={250}
          w="auto"
          fit="contain"
        />
        <Title order={1} ta="center">
          Welcome to Your Personal Flight Tracker
        </Title>
        <Text c="dimmed" ta="center" size="lg" maw={580}>
          Keep a detailed log of all your flights, explore your travel
          statistics, and visualize your journeys on a world map. Sign in to get
          started.
        </Text>
        <Group>
          <Button
            component={Link}
            to={PATHS.LOGIN}
            size="lg"
            variant="gradient"
            gradient={{ from: "blue", to: "cyan" }}
          >
            Get Started
          </Button>
          <Button component={Link} to={PATHS.ABOUT} size="lg" variant="default">
            Learn More
          </Button>
        </Group>
      </Stack>
    </Container>
  );
}

export default Landing;
