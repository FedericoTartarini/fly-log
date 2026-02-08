import React from "react";
import {
  AppShell,
  Burger,
  Container,
  Group,
  rem,
  NavLink,
} from "@mantine/core";
import { Outlet, useNavigate, Link } from "react-router-dom";
import { PATHS } from "../constants/MyClasses.ts";
import { useDisclosure, useHeadroom } from "@mantine/hooks";
import classes from "./MyAppShell.module.css";
import { useAuth } from "../context/AuthContext.jsx";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useTranslation } from "react-i18next";
import ColorSchemeToggle from "../components/ColorSchemeToggle";

function MyAppShell() {
  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] =
    useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation("common");

  const handleSignOut = async () => {
    await signOut();
    navigate(PATHS.LOGIN);
    closeMobile();
  };

  // Helper to close mobile navbar on NavLink click
  const handleNavClick = () => {
    closeMobile();
  };

  const pinned = useHeadroom({ fixedAt: 120 });

  return (
    <AppShell
      header={{ height: 60, collapsed: !pinned, offset: false }}
      navbar={{
        width: 175, // 75% width on mobile, 150px on sm+
        breakpoint: "xs",
        collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
      }}
      transitionDuration={500}
      transitionTimingFunction="ease"
      footer={{
        height: 60,
        withBorder: true,
        position: "bottom",
      }}
    >
      <AppShell.Header zIndex={400}>
        <Group h="100%" px="md">
          <Burger
            opened={mobileOpened}
            onClick={toggleMobile}
            hiddenFrom="sm"
            size="sm"
            aria-label="Open navigation menu"
          />
          <Burger
            opened={desktopOpened}
            onClick={toggleDesktop}
            visibleFrom="sm"
            size="sm"
            aria-label="Toggle sidebar menu"
          />
          Fly Log
          <Group ml="auto" gap="xs">
            <ColorSchemeToggle />
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar
        py="md"
        px={4}
        pt={`calc(${rem(60)} + var(--mantine-spacing-md))`}
      >
        {!user && (
          <>
            <NavLink
              component={Link}
              to={PATHS.HOME}
              label={t("nav.home")}
              className={classes.control}
              onClick={handleNavClick}
            />
          </>
        )}
        {user && (
          <>
            <NavLink
              component={Link}
              to={PATHS.STATS}
              label={t("nav.stats")}
              className={classes.control}
              onClick={handleNavClick}
            />
            <NavLink
              component={Link}
              to={PATHS.FLIGHTS}
              label={t("nav.flights")}
              className={classes.control}
              onClick={handleNavClick}
            />
          </>
        )}
        <NavLink
          component={Link}
          to={PATHS.ABOUT}
          label={t("nav.about")}
          className={classes.control}
          onClick={handleNavClick}
        />
        {user && (
          <>
            <NavLink
              href="#"
              label={t("nav.sign_out")}
              className={classes.control}
              onClick={async (e) => {
                e.preventDefault();
                await handleSignOut();
              }}
            />
          </>
        )}
        {!user && (
          <>
            <NavLink
              component={Link}
              to={PATHS.LOGIN}
              label={t("nav.login")}
              className={classes.control}
              onClick={handleNavClick}
            />
          </>
        )}
        <LanguageSwitcher />
      </AppShell.Navbar>

      <AppShell.Main pt={`calc(${rem(60)} + var(--mantine-spacing-md))`}>
        <Container size="lg" p={0}>
          <Outlet />
        </Container>
      </AppShell.Main>
      {/*<AppFooter />*/}
    </AppShell>
  );
}

export default MyAppShell;
