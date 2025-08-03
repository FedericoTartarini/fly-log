// src/pages/About.jsx
import { Title, Text, Paper } from "@mantine/core";

function About() {
  return (
    <Paper shadow="md" p="xl" radius="md">
      <Title order={2} ta="center" mb="lg">
        About My Flight Tracker
      </Title>
      <Text mb="md">
        This is a simple flight tracker application built with React and
        Mantine. It allows users to view their flight history, filter flights by
        year, and see statistics about their travels.
      </Text>
      <Text>
        The data is processed using Python scripts to clean and enrich flight
        logs, which are then visualized on the frontend using an interactive map
        and a detailed table.
      </Text>
    </Paper>
  );
}

export default About;
