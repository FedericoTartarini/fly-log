import React from "react";
import { AppShell, Container, Group, Text, Anchor } from "@mantine/core";
import { APP_INFO } from "../constants/MyClasses.js";

const AppFooter = () => (
  <AppShell.Footer>
    <Container size="xs" p={0}>
      <Group justify="center" py="md" gap="xs">
        <Text size="sm" c="dimmed">
          © {new Date().getFullYear()} {APP_INFO.APP_NAME}
        </Text>
        <Text size="sm" c="dimmed">
          &middot;
        </Text>
        <Text size="sm" c="dimmed">
          v{APP_INFO.VERSION}
        </Text>
        <Text size="sm" c="dimmed">
          &middot;
        </Text>
        <Text size="sm" c="dimmed">
          by {APP_INFO.AUTHOR}
        </Text>
        <Text size="sm" c="dimmed">
          &middot;
        </Text>
        <Anchor
          href={APP_INFO.GITHUB_REPO}
          target="_blank"
          rel="noopener noreferrer"
          size="sm"
          c="dimmed"
        >
          Source
        </Anchor>
      </Group>
    </Container>
  </AppShell.Footer>
);

export default AppFooter;
