import React from "react";
import {
  ActionIcon,
  Anchor,
  Button,
  Drawer,
  Popover,
  Stack,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconUser } from "@tabler/icons-react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext.jsx";
import { PATHS } from "../constants/MyClasses.ts";
import AppearanceControl from "./AppearanceControl";
import LanguageSwitcher from "./LanguageSwitcher";

// "Federico Tartarini" -> "FT". Falls back to the first letter of the email.
const initials = (user) => {
  const words = (user.displayName ?? "").trim().split(/\s+/).filter(Boolean);
  const letters = words.length
    ? words[0][0] + (words.length > 1 ? words.at(-1)[0] : "")
    : (user.email ?? "?")[0];
  return letters.toUpperCase();
};

// Account button with name, email, Appearance, Language, About and Sign out.
// A bottom sheet on phones and a dropdown on wider screens. Signed-out
// visitors get the same button, so they can still change language and theme.
function AccountMenu({ isPhone }) {
  const [opened, { toggle, close }] = useDisclosure(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSignOut = async () => {
    close();
    await signOut();
    navigate(PATHS.HOME);
  };

  const title = user
    ? user.displayName || t("account.title")
    : t("account.settings");

  const body = (
    <Stack gap="lg" data-cy="account-panel">
      <AppearanceControl />
      <LanguageSwitcher />
      <Stack gap={4}>
        <Anchor
          component={Link}
          to={PATHS.ABOUT}
          onClick={close}
          c="var(--fl-ink)"
          fw={500}
          mih={44}
          display="flex"
          style={{ alignItems: "center" }}
        >
          {t("account.about")}
        </Anchor>
        {user && (
          <Button
            variant="default"
            radius="xl"
            size="md"
            h={48}
            onClick={handleSignOut}
          >
            {t("nav.sign_out")}
          </Button>
        )}
      </Stack>
    </Stack>
  );

  const trigger = (
    <ActionIcon
      variant="default"
      bg="var(--fl-subtle)"
      size={44}
      radius="xl"
      aria-label={t("account.menu")}
      data-cy="account-menu"
      onClick={toggle}
      {...(isPhone && { "aria-expanded": opened })}
    >
      {user ? (
        <Text fw={600} size="sm">
          {initials(user)}
        </Text>
      ) : (
        <IconUser size={20} aria-hidden />
      )}
    </ActionIcon>
  );

  if (isPhone) {
    return (
      <>
        {trigger}
        <Drawer
          opened={opened}
          onClose={close}
          position="bottom"
          size="auto"
          // Above the header (400), which a default drawer opens under.
          zIndex={500}
          title={
            <>
              {title}
              {user && (
                <Text component="span" display="block" size="sm" c="dimmed">
                  {user.email}
                </Text>
              )}
            </>
          }
          styles={{
            content: { borderRadius: "20px 20px 0 0" },
            title: { fontSize: 18, fontWeight: 600 },
          }}
        >
          {body}
        </Drawer>
      </>
    );
  }

  return (
    <Popover
      opened={opened}
      onChange={(value) => !value && close()}
      position="bottom-end"
      width={300}
      shadow="lg"
      radius="md"
      trapFocus
    >
      <Popover.Target>{trigger}</Popover.Target>
      <Popover.Dropdown aria-label={title} p="md">
        <Stack gap="lg">
          <div>
            <Text fw={600}>{title}</Text>
            {user && (
              <Text size="sm" c="dimmed">
                {user.email}
              </Text>
            )}
          </div>
          {body}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

export default AccountMenu;
