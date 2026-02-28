import React from "react";
import * as d3 from "d3";
import {
  Card,
  Stack,
  NativeSelect,
  Button,
  Text,
  Title,
  Alert,
  Container,
  SegmentedControl,
  SimpleGrid,
  Divider,
} from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { useShallow } from "zustand/react/shallow";
import useFlightStore from "../store";
import { useTranslation } from "react-i18next";
import { getYearValuesFromFlights } from "../utils/yearFilterOptions";
import { getYear, parseToDate } from "../utils/dateUtils";
import { getAirportCity } from "../utils/airportUtils";
import fallbackWorld from "../assets/world-fallback.json";

const WORLD_GEOJSON_URL =
  "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson";

// Time scope options for the route playback.
const FILTER_SCOPE = {
  RANGE: "range",
  PAST: "past",
  FUTURE: "future",
  ALL: "all",
};

const STEP_MS = 1400;
const ROTATE_MS = 900;
const SPEED = {
  SLOW: "slow",
  NORMAL: "normal",
  FAST: "fast",
};
// Adjust playback step speed.
const SPEED_MULTIPLIER = {
  [SPEED.SLOW]: 1.6,
  [SPEED.NORMAL]: 1,
  [SPEED.FAST]: 0.65,
};

// Guard against malformed coordinates.
const isValidCoords = (coord) =>
  Array.isArray(coord) &&
  coord.length === 2 &&
  coord.every((n) => typeof n === "number" && Number.isFinite(n));

// Combine flight date and optional HH:MM time for sequencing.
const mergeDateWithTime = (date, time) => {
  if (!date) return null;
  const combined = new Date(date);
  if (typeof time !== "string") return combined;

  const normalized = time.trim();
  if (!normalized) return combined;

  const match = normalized.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return combined;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return combined;

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return combined;
  }

  combined.setHours(hours, minutes, 0, 0);
  return combined;
};

const getRouteMidpoint = (route) => {
  const interpolator = d3.geoInterpolate(
    [route.from[1], route.from[0]],
    [route.to[1], route.to[0]],
  );
  const [lon, lat] = interpolator(0.5);
  return [lat, lon];
};

const buildArcCoordinates = (route, steps = 56) => {
  const interpolator = d3.geoInterpolate(
    [route.from[1], route.from[0]],
    [route.to[1], route.to[0]],
  );
  return d3.range(steps + 1).map((step) => {
    const [lon, lat] = interpolator(step / steps);
    return [lon, lat];
  });
};

const getRoutesFocus = (routes) => {
  if (!routes.length) return [0, 0];
  const coordinates = routes.flatMap((route) => [
    [route.from[1], route.from[0]],
    [route.to[1], route.to[0]],
  ]);
  const [lon, lat] = d3.geoCentroid({
    type: "MultiPoint",
    coordinates,
  });
  return [lat, lon];
};

// Animated globe tour for flights over time.
function WorldTour() {
  const { t } = useTranslation("tour");
  const { allFlights } = useFlightStore(
    useShallow((s) => ({
      allFlights: s.allFlights,
    })),
  );

  const [scope, setScope] = React.useState(FILTER_SCOPE.RANGE);
  const [fromYear, setFromYear] = React.useState("");
  const [toYear, setToYear] = React.useState("");
  const [speed, setSpeed] = React.useState(SPEED.NORMAL);

  const [isPlaying, setIsPlaying] = React.useState(false);
  const [hasStartedAnimation, setHasStartedAnimation] = React.useState(false);
  const [currentRouteIndex, setCurrentRouteIndex] = React.useState(0);
  const [worldData, setWorldData] = React.useState(null);
  const [loadError, setLoadError] = React.useState(null);
  const [containerWidth, setContainerWidth] = React.useState(960);
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const containerRef = React.useRef(null);
  const svgRef = React.useRef(null);
  const vizRef = React.useRef(null);
  const rotateRef = React.useRef([0, 0, 0]);
  const currentRouteRef = React.useRef(null);
  const currentRouteIndexRef = React.useRef(0);
  const scaleRef = React.useRef(1);

  const yearValues = React.useMemo(
    () => getYearValuesFromFlights(allFlights),
    [allFlights],
  );

  const yearValuesAsc = React.useMemo(
    () => [...yearValues].sort((a, b) => a - b),
    [yearValues],
  );

  const filteredToYearValues = React.useMemo(() => {
    const selectedFromYear = Number.parseInt(fromYear, 10);
    if (!Number.isFinite(selectedFromYear)) return yearValuesAsc;
    return yearValuesAsc.filter((year) => year >= selectedFromYear);
  }, [yearValuesAsc, fromYear]);

  React.useEffect(() => {
    if (!yearValuesAsc.length) {
      setFromYear("");
      setToYear("");
      return;
    }

    let resolvedFromYear = fromYear;
    if (
      !resolvedFromYear ||
      !yearValues.includes(Number.parseInt(resolvedFromYear, 10))
    ) {
      resolvedFromYear = String(yearValuesAsc[0]);
      setFromYear(resolvedFromYear);
    }

    const fromYearNumber = Number.parseInt(resolvedFromYear, 10);
    const toCandidates = Number.isFinite(fromYearNumber)
      ? yearValuesAsc.filter((year) => year >= fromYearNumber)
      : yearValuesAsc;

    if (!toYear || !toCandidates.includes(Number.parseInt(toYear, 10))) {
      setToYear(
        toCandidates.length
          ? String(toCandidates[toCandidates.length - 1])
          : "",
      );
    }
  }, [fromYear, toYear, yearValues, yearValuesAsc]);

  const routes = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const from = Number.parseInt(fromYear, 10);
    const to = Number.parseInt(toYear, 10);
    const minRange = Math.min(from, to);
    const maxRange = Math.max(from, to);

    return allFlights
      .filter((flight) => {
        const flightDate = parseToDate(flight.departure_date);
        if (!flightDate) return false;

        if (scope === FILTER_SCOPE.PAST) {
          return flightDate < today;
        }

        if (scope === FILTER_SCOPE.FUTURE) {
          return flightDate >= today;
        }

        if (scope === FILTER_SCOPE.ALL) {
          return true;
        }

        const flightYear = getYear(flight.departure_date);
        if (
          flightYear === null ||
          !Number.isFinite(minRange) ||
          !Number.isFinite(maxRange)
        ) {
          return false;
        }

        return flightYear >= minRange && flightYear <= maxRange;
      })
      .filter(
        (flight) =>
          isValidCoords(flight.departure_coordinates) &&
          isValidCoords(flight.arrival_coordinates),
      )
      .map((flight) => {
        const flightDate = parseToDate(flight.departure_date);
        const departureDateTime = mergeDateWithTime(
          flightDate,
          flight.departure_time,
        );

        return {
          id: String(flight.id),
          from: flight.departure_coordinates,
          to: flight.arrival_coordinates,
          date: departureDateTime,
          fromCity: getAirportCity(flight.departure_airport_iata),
          toCity: getAirportCity(flight.arrival_airport_iata),
        };
      })
      .sort((a, b) => (a.date?.getTime() || 0) - (b.date?.getTime() || 0));
  }, [allFlights, scope, fromYear, toYear]);

  const currentRoute = routes[currentRouteIndex] ?? null;

  React.useEffect(() => {
    currentRouteRef.current = currentRoute;
  }, [currentRoute]);

  React.useEffect(() => {
    currentRouteIndexRef.current = currentRouteIndex;
  }, [currentRouteIndex]);

  React.useEffect(() => {
    let mounted = true;

    const loadGeoJson = async () => {
      try {
        const data = await d3.json(WORLD_GEOJSON_URL);
        if (!mounted) return;
        setWorldData(data);
        setLoadError(null);
      } catch {
        if (!mounted) return;
        setWorldData(fallbackWorld);
        setLoadError(t("load_error"));
      }
    };

    loadGeoJson();

    return () => {
      mounted = false;
    };
  }, [t]);

  React.useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateSize = () => {
      setContainerWidth(Math.max(320, Math.floor(element.clientWidth)));
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    setCurrentRouteIndex(0);
    setIsPlaying(false);
    setHasStartedAnimation(false);
  }, [scope, fromYear, toYear]);

  React.useEffect(() => {
    if (hasStartedAnimation) return;
    const [lat, lon] = getRoutesFocus(routes);
    rotateRef.current = [-lon, -lat, 0];
  }, [routes, hasStartedAnimation]);

  React.useEffect(() => {
    if (prefersReducedMotion) {
      setIsPlaying(false);
      return;
    }
    if (!isPlaying) return;
    if (!routes.length) {
      setIsPlaying(false);
      return;
    }

    if (currentRouteIndex >= routes.length - 1) {
      setIsPlaying(false);
      return;
    }

    const stepDelay = Math.round(STEP_MS * SPEED_MULTIPLIER[speed]);
    const id = window.setTimeout(() => {
      setCurrentRouteIndex((prev) => Math.min(prev + 1, routes.length - 1));
    }, stepDelay);

    return () => window.clearTimeout(id);
  }, [
    isPlaying,
    currentRouteIndex,
    routes.length,
    speed,
    prefersReducedMotion,
  ]);

  React.useEffect(() => {
    if (!svgRef.current || !worldData) return;

    const width = containerWidth;
    const height = Math.max(420, Math.floor(width * 0.62));

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const minScale = 0.7;
    const maxScale = 2.5;

    const projection = d3
      .geoOrthographic()
      .fitExtent(
        [
          [24, 24],
          [width - 24, height - 24],
        ],
        { type: "Sphere" },
      )
      .clipAngle(90)
      .precision(0.4)
      .rotate(rotateRef.current);

    const baseScale = projection.scale();
    projection.scale(baseScale * scaleRef.current);

    const path = d3.geoPath(projection);

    const root = svg.append("g");
    const sphere = root
      .append("path")
      .datum({ type: "Sphere" })
      .attr("fill", "#f3f4f6")
      .attr("stroke", "#9ca3af")
      .attr("stroke-width", 1.2);

    const graticulePath = root
      .append("path")
      .datum(d3.geoGraticule10())
      .attr("fill", "none")
      .attr("stroke", "#d1d5db")
      .attr("stroke-width", 0.7)
      .attr("stroke-opacity", 0.85);

    const land = root
      .append("g")
      .selectAll("path")
      .data(worldData.features || [])
      .join("path")
      .attr("fill", "#9ca3af")
      .attr("fill-opacity", 0.45)
      .attr("stroke", "#6b7280")
      .attr("stroke-width", 0.6);

    const routesLayer = root.append("g");
    const activeLayer = root.append("g");
    const pointLayer = root.append("g");

    const drawBase = () => {
      sphere.attr("d", path);
      graticulePath.attr("d", path);
      land.attr("d", path);

      routesLayer
        .selectAll("path")
        .data(routes, (d) => d.id)
        .join("path")
        .attr("fill", "none")
        .attr("stroke", "#C91A25")
        .attr("stroke-opacity", 0.33)
        .attr("stroke-width", 1.5)
        .attr("d", (route) =>
          path({
            type: "LineString",
            coordinates: buildArcCoordinates(route),
          }),
        );
    };

    const drawActive = (route) => {
      if (!hasStartedAnimation) {
        activeLayer.selectAll("path").remove();
        pointLayer.selectAll("circle").remove();
        return;
      }

      const activeData = route ? [route] : [];

      activeLayer
        .selectAll("path")
        .data(activeData, (d) => d.id)
        .join("path")
        .attr("fill", "none")
        .attr("stroke", "#ef4444")
        .attr("stroke-width", 2.5)
        .attr("stroke-linecap", "round")
        .attr("d", (d) =>
          path({
            type: "LineString",
            coordinates: buildArcCoordinates(d),
          }),
        );

      const points = route
        ? [
            { id: "from", coords: route.from, color: "#22c55e" },
            { id: "to", coords: route.to, color: "#ef4444" },
          ]
        : [];

      pointLayer
        .selectAll("circle")
        .data(points, (d) => d.id)
        .join("circle")
        .attr("r", 4)
        .attr("fill", (d) => d.color)
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 1.5)
        .attr("cx", (d) => projection([d.coords[1], d.coords[0]])?.[0] ?? -100)
        .attr("cy", (d) => projection([d.coords[1], d.coords[0]])?.[1] ?? -100);
    };

    drawBase();
    drawActive(currentRouteRef.current);

    const drag = d3.drag().on("drag", (event) => {
      const rotate = projection.rotate();
      const k = 0.3;
      projection.rotate([rotate[0] + event.dx * k, rotate[1] - event.dy * k]);
      rotateRef.current = projection.rotate();
      drawBase();
      drawActive(routes[currentRouteIndexRef.current] ?? null);
    });

    svg.call(drag);

    const zoom = d3
      .zoom()
      .scaleExtent([minScale, maxScale])
      .on("zoom", (event) => {
        scaleRef.current = event.transform.k;
        projection.scale(baseScale * scaleRef.current);
        drawBase();
        drawActive(routes[currentRouteIndexRef.current] ?? null);
      });

    svg.call(zoom);

    vizRef.current = {
      svg,
      projection,
      drawBase,
      drawActive,
    };

    return () => {
      svg.on(".drag", null);
      svg.on(".zoom", null);
      svg.interrupt();
      vizRef.current = null;
    };
  }, [containerWidth, worldData, routes, hasStartedAnimation]);

  React.useEffect(() => {
    const viz = vizRef.current;
    const route = routes[currentRouteIndex] ?? null;

    if (!viz) return;

    viz.svg.interrupt();

    if (!hasStartedAnimation || !route) {
      viz.drawActive(null);
      return;
    }

    if (prefersReducedMotion) {
      viz.drawBase();
      viz.drawActive(route);
      return;
    }

    const [midLat, midLon] = getRouteMidpoint(route);
    const startRotate = viz.projection.rotate();
    const endRotate = [-midLon, -midLat, startRotate[2] || 0];
    const interpolateRotate = d3.interpolate(startRotate, endRotate);

    const rotateDuration = Math.round(ROTATE_MS * SPEED_MULTIPLIER[speed]);

    viz.svg
      .transition()
      .duration(rotateDuration)
      .ease(d3.easeCubicInOut)
      .tween("rotate", () => (tValue) => {
        viz.projection.rotate(interpolateRotate(tValue));
        rotateRef.current = viz.projection.rotate();
        viz.drawBase();
        viz.drawActive(route);
      });
  }, [
    currentRouteIndex,
    routes,
    speed,
    hasStartedAnimation,
    prefersReducedMotion,
  ]);

  const handleStart = () => {
    if (!routes.length) return;
    if (currentRouteIndex >= routes.length - 1) {
      setCurrentRouteIndex(0);
    }
    setHasStartedAnimation(true);
    setIsPlaying(true);
  };

  const scopeOptions = [
    { value: FILTER_SCOPE.RANGE, label: t("scope.range") },
    { value: FILTER_SCOPE.PAST, label: t("scope.past") },
    { value: FILTER_SCOPE.FUTURE, label: t("scope.future") },
    { value: FILTER_SCOPE.ALL, label: t("scope.all") },
  ];

  const yearSelectOptions = yearValuesAsc.map((year) => ({
    value: String(year),
    label: String(year),
  }));

  const toYearSelectOptions = filteredToYearValues.map((year) => ({
    value: String(year),
    label: String(year),
  }));

  return (
    <Container>
      <Stack mt="md" gap="md">
        <Card withBorder radius="md" shadow="sm">
          <Title order={1}>{t("title")}</Title>
          <Stack gap="sm">
            <SimpleGrid cols={scope === FILTER_SCOPE.RANGE ? 3 : 1}>
              <NativeSelect
                label={t("scope.label")}
                value={scope}
                data={scopeOptions}
                onChange={(event) => setScope(event.currentTarget.value)}
              />

              {scope === FILTER_SCOPE.RANGE && (
                <>
                  <NativeSelect
                    label={t("from_year")}
                    value={fromYear}
                    data={yearSelectOptions}
                    onChange={(event) => setFromYear(event.currentTarget.value)}
                  />
                  <NativeSelect
                    label={t("to_year")}
                    value={toYear}
                    data={toYearSelectOptions}
                    onChange={(event) => setToYear(event.currentTarget.value)}
                  />
                </>
              )}
            </SimpleGrid>
            <Text>{t("speed.label")}</Text>
            <SegmentedControl
              value={speed}
              onChange={setSpeed}
              data={[
                { value: SPEED.SLOW, label: t("speed.slow") },
                { value: SPEED.NORMAL, label: t("speed.normal") },
                { value: SPEED.FAST, label: t("speed.fast") },
              ]}
            />
            <SimpleGrid cols={2}>
              <Button
                onClick={handleStart}
                disabled={!routes.length || isPlaying}
                variant="gradient"
              >
                {t("start")}
              </Button>
              <Button
                variant="default"
                onClick={() => setIsPlaying(false)}
                disabled={!isPlaying}
              >
                {t("stop")}
              </Button>
            </SimpleGrid>

            {loadError && (
              <Alert
                icon={<IconInfoCircle size={16} />}
                color="yellow"
                variant="light"
              >
                {loadError}
              </Alert>
            )}

            {!routes.length && !loadError && (
              <Alert
                icon={<IconInfoCircle size={16} />}
                color="blue"
                variant="light"
              >
                {t("no_routes")}
              </Alert>
            )}

            <Divider />

            {hasStartedAnimation && currentRoute && (
              <Text align="center">
                {t("current_route", {
                  from: currentRoute.fromCity,
                  to: currentRoute.toCity,
                  index: currentRouteIndex + 1,
                  total: routes.length,
                })}
              </Text>
            )}

            <div ref={containerRef}>
              <svg
                ref={svgRef}
                role="img"
                aria-label={t("map_aria")}
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </div>
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}

export default WorldTour;
