import React from "react";
import { Title, Text, Stack } from "@mantine/core";

const StatDisplay = ({ label, value, id }) => (
  <Stack align="center" justify="center" gap="xs">
    <Title order={2} id={id} ta="center">
      {value}
    </Title>
    <Text size="md" c="dimmed" ta="center">
      {label}
    </Text>
  </Stack>
);

export default StatDisplay;
