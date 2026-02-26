import React from "react";
import {
  AppShell,
  Burger,
  Container,
  Drawer,
  Group,
  rem,
  NavLink,
  Button,
} from "@mantine/core";
import { Outlet, useNavigate, Link } from "react-router-dom";
import { PATHS } from "../constants/MyClasses.ts";
import { useDisclosure, useHeadroom } from "@mantine/hooks";
import classes from "./MyAppShell.module.css";
import { useAuth } from "../context/AuthContext.jsx";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useTranslation } from "react-i18next";
import ColorSchemeToggle from "../components/ColorSchemeToggle";
import AppFooter from "../components/AppFooter";

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

  const renderNavLinks = (onClickHandler) => (
    <>
      {!user && (
        <NavLink
          component={Link}
          to={PATHS.LANDING}
          label={t("nav.home")}
          className={classes.control}
          onClick={onClickHandler}
        />
      )}
      {user && (
        <>
          <NavLink
            component={Link}
            to={PATHS.STATS}
            label={t("nav.stats")}
            className={classes.control}
            onClick={onClickHandler}
          />
          <NavLink
            component={Link}
            to={PATHS.FLIGHTS}
            label={t("nav.flights")}
            className={classes.control}
            onClick={onClickHandler}
          />
          <NavLink
            component={Link}
            to={PATHS.TOUR}
            label={t("nav.tour")}
            className={classes.control}
            onClick={onClickHandler}
          />
        </>
      )}
      <NavLink
        component={Link}
        to={PATHS.ABOUT}
        label={t("nav.about")}
        className={classes.control}
        onClick={onClickHandler}
      />
      <LanguageSwitcher />
    </>
  );

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
                c="red"
              >
                {t("nav.sign_out")}
              </Button>
            ) : (
              <Button
                size="xs"
                variant="default"
                component={Link}
                to={PATHS.LOGIN}
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
        hidden={!desktopOpened}
        py="md"
        px={4}
        pt={`calc(${rem(60)} + var(--mantine-spacing-md))`}
      >
        {renderNavLinks(handleNavClick)}
      </AppShell.Navbar>

      <Drawer
        opened={mobileOpened}
        onClose={closeMobile}
        position="left"
        size="250px"
        zIndex={500}
        padding="md"
        hiddenFrom={SIZE_DRAWER}
      >
        {renderNavLinks(handleNavClick)}
      </Drawer>

      <AppShell.Main pt={`calc(${rem(60)} + var(--mantine-spacing-md))`}>
        <Container size="lg" p={0}>
          <Outlet />
        </Container>
      </AppShell.Main>
      <AppFooter />
    </AppShell>
  );
}

export default MyAppShell;
