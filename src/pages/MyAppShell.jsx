import React, { createElement, lazy, Suspense } from "react";
import {
  ActionIcon,
  Affix,
  AppShell,
  Burger,
  Button,
  Center,
  Container,
  Group,
  Loader,
  Menu,
  Modal,
  Text,
  rem,
} from "@mantine/core";
import { Outlet, useLocation, Link, NavLink } from "react-router-dom";
import { useDisclosure, useHeadroom, useMediaQuery } from "@mantine/hooks";
import {
  IconAward,
  IconCalendar,
  IconChartBar,
  IconList,
  IconPlus,
  IconWorld,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { PATHS } from "../constants/MyClasses.ts";
import PageSkeleton from "../components/PageSkeleton.jsx";
import ErrorBoundary from "../components/ErrorBoundary.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import AccountMenu from "../components/AccountMenu";
import AppFooter from "../components/AppFooter";
import useFlightStore from "../store.ts";
import classes from "./MyAppShell.module.css";

const FlightEntryForm = lazy(() => import("../components/FlightEntryForm.tsx"));

// A 44 px control with 8 px above and below, plus the 1 px border.
const HEADER_HEIGHT = 61;
const TAB_BAR_HEIGHT = 66;

const PAGES = [
  { to: PATHS.STATS, key: "stats", icon: IconChartBar },
  { to: PATHS.FLIGHTS, key: "flights", icon: IconList },
  { to: PATHS.TOUR, key: "tour", icon: IconWorld },
  { to: PATHS.TIMELINE, key: "timeline", icon: IconCalendar },
  { to: PATHS.BADGES, key: "badges", icon: IconAward },
];

// App layout: header, bottom tab bar on phones, the add-flight form, and the
// routed page.
function MyAppShell() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { t } = useTranslation("common");
  const [menuOpened, { toggle: toggleMenu, close: closeMenu }] =
    useDisclosure(false);
  const addFlightOpened = useFlightStore((s) => s.addFlightOpened);
  const setAddFlightOpened = useFlightStore((s) => s.setAddFlightOpened);

  const pinned = useHeadroom({ fixedAt: 120 });
  // Read synchronously, so the first paint already has the right layout.
  const sync = { getInitialValueInEffect: false };
  const isPhone = useMediaQuery("(max-width: 48em)", false, sync);
  // Below 860 px the five page links no longer fit next to "Add flight".
  const showLinks = useMediaQuery("(min-width: 53.75em)", false, sync);
  const showTabs = Boolean(user) && isPhone;

  const openAddFlight = () => setAddFlightOpened(true);
  const closeAddFlight = () => setAddFlightOpened(false);

  return (
    <AppShell
      header={{ height: HEADER_HEIGHT, collapsed: !pinned, offset: false }}
      footer={{ height: TAB_BAR_HEIGHT, collapsed: !showTabs }}
      transitionDuration={220}
      transitionTimingFunction="ease"
    >
      <AppShell.Header zIndex={400}>
        <Container size="lg" h="100%" px="md">
          <Group h="100%" gap="sm" wrap="nowrap">
            {user && !isPhone && !showLinks && (
              <Menu
                opened={menuOpened}
                onChange={(value) => !value && closeMenu()}
                position="bottom-start"
                width={220}
              >
                <Menu.Target>
                  <Burger
                    opened={menuOpened}
                    onClick={toggleMenu}
                    size="sm"
                    w={44}
                    h={44}
                    ml={-10}
                    aria-label={t("nav.menu")}
                  />
                </Menu.Target>
                <Menu.Dropdown>
                  {PAGES.map(({ to, key, icon }) => (
                    <Menu.Item
                      key={key}
                      component={NavLink}
                      to={to}
                      mih={44}
                      fw={location.pathname === to ? 600 : 400}
                      bg={
                        location.pathname === to
                          ? "var(--fl-subtle)"
                          : undefined
                      }
                      leftSection={createElement(icon, {
                        size: 18,
                        "aria-hidden": true,
                      })}
                    >
                      {t(`nav.${key}`)}
                    </Menu.Item>
                  ))}
                </Menu.Dropdown>
              </Menu>
            )}

            <Group
              component={Link}
              to={PATHS.HOME}
              gap={8}
              wrap="nowrap"
              c="var(--fl-ink)"
              style={{ textDecoration: "none" }}
            >
              <img src="/airplane.png" alt="" width={30} height={30} />
              <Text component="span" fw={600} fz={20}>
                FlyLog
              </Text>
            </Group>

            {user && !isPhone && showLinks && (
              <Group component="nav" aria-label={t("nav.main")} gap={2}>
                {PAGES.map(({ to, key }) => (
                  <NavLink key={key} to={to} className={classes.link}>
                    {t(`nav.${key}`)}
                  </NavLink>
                ))}
              </Group>
            )}

            <Group ml="auto" gap={10} wrap="nowrap">
              {user && !isPhone && (
                <Button
                  radius="xl"
                  h={44}
                  leftSection={<IconPlus size={18} aria-hidden />}
                  onClick={openAddFlight}
                >
                  {t("nav.add_flight")}
                </Button>
              )}
              {!loading && !user && (
                <Button
                  variant="default"
                  radius="xl"
                  h={44}
                  component={Link}
                  to={PATHS.LOGIN}
                >
                  {t("nav.login")}
                </Button>
              )}
              {!loading && <AccountMenu isPhone={isPhone} />}
            </Group>
          </Group>
        </Container>
      </AppShell.Header>

      {showTabs && (
        <>
          <AppShell.Footer>
            <nav aria-label={t("nav.main")} className={classes.tabs}>
              {PAGES.map(({ to, key, icon }) => (
                <NavLink key={key} to={to} className={classes.tab}>
                  {createElement(icon, {
                    size: 24,
                    stroke: 1.8,
                    "aria-hidden": true,
                  })}
                  {t(`nav.${key}`)}
                </NavLink>
              ))}
            </nav>
          </AppShell.Footer>
          <Affix position={{ bottom: TAB_BAR_HEIGHT + 18, right: 16 }}>
            <ActionIcon
              size={56}
              radius="xl"
              aria-label={t("nav.add_flight")}
              onClick={openAddFlight}
              style={{ boxShadow: "var(--mantine-shadow-lg)" }}
            >
              <IconPlus size={26} stroke={2.2} aria-hidden />
            </ActionIcon>
          </Affix>
        </>
      )}

      <Modal
        opened={addFlightOpened}
        onClose={closeAddFlight}
        title={t("nav.add_flight")}
        size="lg"
        // Full screen on phones: the form is long and needs the whole width.
        fullScreen={isPhone}
      >
        <Suspense
          fallback={
            <Center>
              <Loader />
            </Center>
          }
        >
          {/* No refetch: the Firestore listener picks the new flight up from
              the local write before the server has even acknowledged it. */}
          <FlightEntryForm onSaved={closeAddFlight} />
        </Suspense>
      </Modal>

      <AppShell.Main
        id="main-content"
        pt={`calc(${rem(HEADER_HEIGHT)} + var(--mantine-spacing-md))`}
      >
        <Container size="lg" p={0}>
          {/* Route chunks suspend here rather than at the router, so the
              header stays put instead of being torn down and rebuilt while a
              page loads. */}
          <ErrorBoundary resetKey={location.pathname}>
            <Suspense fallback={<PageSkeleton />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </Container>
        {/* Inside Main, so the tab bar's bottom padding keeps it visible. */}
        <AppFooter />
      </AppShell.Main>
    </AppShell>
  );
}

export default MyAppShell;
