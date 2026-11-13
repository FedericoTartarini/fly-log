import React from "react";
import { Link } from "react-router-dom";
import { Container, Group, Text, Anchor } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { APP_INFO, PATHS } from "../constants/MyClasses.js";

// Stamped at build time by vite.config.js's `define`, e.g. "2026-09-13".
/* global __BUILD_DATE__ */

const AppFooter = () => {
  const { t } = useTranslation("common");

  return (
    <footer>
      <Container size="xs" p={0} mb="50px">
        <Group justify="center" py="md" gap="xs">
          <Text size="sm" c="dimmed">
            © {new Date().getFullYear()} {APP_INFO.APP_NAME}
          </Text>
          <Text size="sm" c="dimmed">
            &middot;
          </Text>
          <Text size="sm" c="dimmed">
            {__BUILD_DATE__}
          </Text>
          <Text size="sm" c="dimmed">
            &middot;
          </Text>
          <Anchor component={Link} to={PATHS.ABOUT} size="sm" c="dimmed">
            {t("nav.about")}
          </Anchor>
          <Text size="sm" c="dimmed">
            &middot;
          </Text>
          <Anchor component={Link} to={PATHS.CHANGELOG} size="sm" c="dimmed">
            {t("changelog.link")}
          </Anchor>
          <Text size="sm" c="dimmed">
            &middot;
          </Text>
          <Anchor
            href={APP_INFO.PERSONAL_WEBSITE}
            target="_blank"
            rel="noopener noreferrer"
            size="sm"
            c="dimmed"
            aria-label={`by ${APP_INFO.AUTHOR} (opens in a new tab)`}
          >
            by {APP_INFO.AUTHOR}
          </Anchor>
          <Text size="sm" c="dimmed">
            &middot;
          </Text>
          <Anchor
            href={APP_INFO.GITHUB_REPO}
            target="_blank"
            rel="noopener noreferrer"
            size="sm"
            c="dimmed"
            aria-label="Source (opens in a new tab)"
          >
            Source
          </Anchor>
        </Group>
      </Container>
    </footer>
  );
};

export default AppFooter;
