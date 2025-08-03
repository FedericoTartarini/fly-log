import React from "react";
import { Group, Title, Text } from "@mantine/core";

const StatDisplay = ({ label, value, id }) => (
  <Group align="center" gap="xs">
    <Title order={2} id={id} ta="center">
      {value}
    </Title>
    <Text size="md" c="dimmed" ta="center">
      {label}
    </Text>
  </Group>
);

export default StatDisplay;
