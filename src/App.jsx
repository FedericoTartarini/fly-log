// src/pages/ApplicationShell.jsx
import { useDisclosure } from "@mantine/hooks";
import classes from "./App.module.css";
import { AppShell, Burger, Group, Container } from "@mantine/core";
import { NavLink, Outlet } from "react-router-dom";

export function App() {
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 300,
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
        <NavLink to="/" className={classes.control}>
          Home
        </NavLink>
        <NavLink to="/about" className={classes.control}>
          About
        </NavLink>
        <NavLink to="/support" className={classes.control}>
          Support
        </NavLink>
      </AppShell.Navbar>

      <AppShell.Main>
        <Container size="xs" p={0}>
          <Outlet />
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
