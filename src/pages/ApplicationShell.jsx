import { useDisclosure } from "@mantine/hooks";
import classes from "./ApplicationShell.module.css";
import {
  AppShell,
  Burger,
  Group,
  UnstyledButton,
  Container,
} from "@mantine/core";
import Home from "./Home.jsx";

export function ApplicationShell() {
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
        <UnstyledButton className={classes.control}>Home</UnstyledButton>
        <UnstyledButton className={classes.control}>
          Upcoming Flights
        </UnstyledButton>
        <UnstyledButton className={classes.control}>Contacts</UnstyledButton>
        <UnstyledButton className={classes.control}>Support</UnstyledButton>
      </AppShell.Navbar>

      <AppShell.Main>
        <Container size="xs" p={0}>
          <Home />
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
