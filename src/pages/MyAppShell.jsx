import React from "react";
import { AppShell, Burger, Container, Group } from "@mantine/core";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Paths } from "../constants/MyClasses.js";
import { useDisclosure } from "@mantine/hooks";
import classes from "./MyAppShell.module.css";
import { useAuth } from "../context/AuthContext.jsx";

function MyAppShell() {
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate(Paths.LOGIN);
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 150,
        breakpoint: "sm",
        collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
      }}
      transitionDuration={500}
      transitionTimingFunction="ease"
    >
      <AppShell.Header>
        <Group h="100%" px="md">
          <Burger
            opened={mobileOpened}
            onClick={toggleMobile}
            hiddenFrom="sm"
            size="sm"
          />
          <Burger
            opened={desktopOpened}
            onClick={toggleDesktop}
            visibleFrom="sm"
            size="sm"
          />
          Flight Tracker
        </Group>
      </AppShell.Header>
      <AppShell.Navbar py="md" px={4}>
        {!user && (
          <>
            <NavLink to={Paths.HOME} className={classes.control}>
              Home
            </NavLink>
          </>
        )}
        {user && (
          <>
            <NavLink to={Paths.STATS} className={classes.control}>
              MyStats
            </NavLink>
            <NavLink to={Paths.FLIGHTS} className={classes.control}>
              Flights
            </NavLink>
          </>
        )}
        <NavLink to={Paths.ABOUT} className={classes.control}>
          About
        </NavLink>
        {user && (
          <>
            <NavLink
              href="#"
              className={classes.control}
              onClick={handleSignOut}
            >
              Sign Out
            </NavLink>
          </>
        )}
        {!user && (
          <>
            <NavLink to={Paths.LOGIN} className={classes.control}>
              Sign In
            </NavLink>
          </>
        )}
      </AppShell.Navbar>

      <AppShell.Main>
        <Container size="xs" p={0}>
          <Outlet />
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}

export default MyAppShell;
