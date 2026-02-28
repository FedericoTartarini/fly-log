import React from "react";
import {
  AppShell,
  Burger,
  Container,
  Drawer,
  Group,
  Stack,
  rem,
  NavLink,
  Button,
} from "@mantine/core";
import { Outlet, useNavigate, Link } from "react-router-dom";
import { PATHS } from "../constants/MyClasses.ts";
import { useDisclosure, useHeadroom } from "@mantine/hooks";
import { useAuth } from "../context/AuthContext.jsx";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useTranslation } from "react-i18next";
import ColorSchemeToggle from "../components/ColorSchemeToggle";
import AppFooter from "../components/AppFooter";

const controlStyles = {
  display: "block",
  borderRadius: "var(--mantine-radius-md)",
  fontWeight: 500,
};

// App layout shell with nav, drawer, and routed content.
function MyAppShell() {
  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] =
    useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation("common");

  const handleSignOut = async () => {
    await signOut();
    navigate(PATHS.LANDING);
    closeMobile();
  };

  // Helper to close mobile navbar on NavLink click
  const handleNavClick = () => {
    closeMobile();
  };

  const pinned = useHeadroom({ fixedAt: 120 });

  const renderNavLinks = (onClickHandler) => {
    const navItems = [
      !user && { to: PATHS.LANDING, label: t("nav.home"), key: "home" },
      user && { to: PATHS.STATS, label: t("nav.stats"), key: "stats" },
      user && { to: PATHS.FLIGHTS, label: t("nav.flights"), key: "flights" },
      user && { to: PATHS.TOUR, label: t("nav.tour"), key: "tour" },
      { to: PATHS.ABOUT, label: t("nav.about"), key: "about" },
    ].filter(Boolean);

    return (
      <Stack spacing="xs" w="100%">
        {navItems.map(({ to, label, key }) => (
          <NavLink
            key={key}
            component={Link}
            px="xs"
            to={to}
            label={label}
            sx={controlStyles}
            onClick={onClickHandler}
          />
        ))}
        <LanguageSwitcher />
      </Stack>
    );
  };

  const SIZE_DRAWER = "xl"; // breakpoint for mobile vs desktop

  return (
    <AppShell
      header={{ height: 60, collapsed: !pinned, offset: false }}
      navbar={{
        width: 250, // 75% width on mobile, 150px on sm+
        breakpoint: SIZE_DRAWER,
        collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
      }}
      transitionDuration={500}
      transitionTimingFunction="ease"
    >
      <AppShell.Header zIndex={400}>
        <Group h="100%" px="md">
          <Burger
            opened={mobileOpened}
            onClick={toggleMobile}
            hiddenFrom={SIZE_DRAWER}
            size="sm"
            aria-label="Open navigation menu"
            data-cy="menu-mobile-open"
          />
          <Burger
            opened={desktopOpened}
            onClick={toggleDesktop}
            visibleFrom={SIZE_DRAWER}
            size="sm"
            aria-label="Toggle sidebar menu"
          />
          Fly Log
          <Group ml="auto" gap="xs">
            {user ? (
              <Button
                size="xs"
                variant="default"
                onClick={handleSignOut}
                c="accent"
              >
                {t("nav.sign_out")}
              </Button>
            ) : (
              <Button
                size="xs"
                variant="default"
                component={Link}
                to={PATHS.LOGIN}
                c="primary"
              >
                {t("nav.login")}
              </Button>
            )}
            <ColorSchemeToggle />
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar
        visibleFrom={SIZE_DRAWER}
        py="md"
        px={4}
        pt={`calc(${rem(60)} + var(--mantine-spacing-md))`}
      >
        <nav aria-label="Primary">{renderNavLinks(handleNavClick)}</nav>
      </AppShell.Navbar>

      <Drawer
        data-cy="drawer"
        opened={mobileOpened}
        onClose={closeMobile}
        position="left"
        size="250px"
        zIndex={500}
        padding="md"
        hiddenFrom={SIZE_DRAWER}
      >
        <nav aria-label="Primary">{renderNavLinks(handleNavClick)}</nav>
      </Drawer>

      <AppShell.Main
        id="main-content"
        pt={`calc(${rem(60)} + var(--mantine-spacing-md))`}
      >
        <Container size="lg" p={0}>
          <Outlet />
        </Container>
      </AppShell.Main>
      <AppFooter />
    </AppShell>
  );
}

export default MyAppShell;
