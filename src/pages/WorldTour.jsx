import React from "react";
import * as d3 from "d3";
import {
  ActionIcon,
  Alert,
  Button,
  Container,
  Stack,
  Text,
  Title,
  VisuallyHidden,
} from "@mantine/core";
import { useReducedMotion } from "@mantine/hooks";
import {
  IconArrowNarrowRight,
  IconChevronLeft,
  IconChevronRight,
  IconInfoCircle,
  IconMinus,
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconPlus,
  IconRotate,
} from "@tabler/icons-react";
import { useShallow } from "zustand/react/shallow";
import { useTranslation } from "react-i18next";
import useFlightStore from "../store";
import FilterTags from "../components/FilterTags.jsx";
import { getActiveFilters } from "../utils/activeFilters";
import { formatCalendarDate } from "../utils/dateUtils";
import { getCentringRotation } from "../utils/globeRotation";
import { buildTourRoutes } from "../utils/tourRoutes";
import fallbackWorld from "../assets/world-fallback.json";
import classes from "./WorldTour.module.css";

const WORLD_GEOJSON_URL =
  "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson";

// At 1×: the time on each flight, and how long the globe takes to turn to it
// and draw its arc.
const STEP_MS = 1600;
const MOVE_MS = 1100;
const SPEEDS = [
  { value: 0.5, key: "slow", text: "0.5×" },
  { value: 1, key: "normal", text: "1×" },
  { value: 2, key: "fast", text: "2×" },
];
const MIN_SCALE = 0.7;
const MAX_SCALE = 4.5;

const lonLat = ([lat, lon]) => [lon, lat];

const buildArc = (route, steps = 56) => {
  const interpolate = d3.geoInterpolate(lonLat(route.from), lonLat(route.to));
  return d3.range(steps + 1).map((step) => interpolate(step / steps));
};

const getRoutesFocus = (routes) => {
  if (!routes.length) return [0, 0];
  return d3.geoCentroid({
    type: "MultiPoint",
    coordinates: routes.flatMap((r) => [lonLat(r.from), lonLat(r.to)]),
  });
};

/**
 * The route tour: plays the flights the shared filter leaves on a globe,
 * oldest first, with the playback controls on a boarding pass under it.
 */
function WorldTour() {
  const { t, i18n } = useTranslation("tour");
  const { filteredFlights, filtered, isLoading } = useFlightStore(
    useShallow((s) => ({
      filteredFlights: s.filteredFlights,
      filtered: getActiveFilters(s.filters).length > 0,
      isLoading: s.isLoading,
    })),
  );
  const routes = React.useMemo(
    () => buildTourRoutes(filteredFlights),
    [filteredFlights],
  );
  const total = routes.length;

  const [index, setIndex] = React.useState(0);
  const [playing, setPlaying] = React.useState(false);
  const [speed, setSpeed] = React.useState(SPEEDS[1]);
  const [worldData, setWorldData] = React.useState(null);
  const [loadError, setLoadError] = React.useState(null);
  const [width, setWidth] = React.useState(640);
  const reducedMotion = useReducedMotion();

  const containerRef = React.useRef(null);
  const svgRef = React.useRef(null);
  const vizRef = React.useRef(null);
  const rotateRef = React.useRef([0, 0, 0]);
  const scaleRef = React.useRef(1);

  const current = routes[Math.min(index, total - 1)] ?? null;
  // Before play every route shows faintly. Once the tour has moved, the
  // flights already flown build up as a trail.
  const started = playing || index > 0;
  // The globe draws from this ref, so drags and zooms between renders see
  // the latest flight.
  const viewRef = React.useRef({ index, started });
  viewRef.current = { index: Math.min(index, total - 1), started };

  // A new set of flights starts the tour again, centred on all of them.
  React.useEffect(() => {
    setIndex(0);
    setPlaying(false);
    const [lon, lat] = getRoutesFocus(routes);
    rotateRef.current = [-lon, -lat, 0];
  }, [routes]);

  React.useEffect(() => {
    let mounted = true;
    d3.json(WORLD_GEOJSON_URL)
      .then((data) => {
        if (!mounted) return;
        setWorldData(data);
        setLoadError(null);
      })
      .catch(() => {
        if (!mounted) return;
        setWorldData(fallbackWorld);
        setLoadError(t("load_error"));
      });
    return () => {
      mounted = false;
    };
  }, [t]);

  React.useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const updateSize = () =>
      setWidth(Math.max(280, Math.floor(element.clientWidth)));
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Playback: wait on each flight, then move to the next. Stops on the last.
  React.useEffect(() => {
    if (!playing) return;
    if (index >= total - 1) {
      setPlaying(false);
      return;
    }
    const id = window.setTimeout(
      () => setIndex((i) => Math.min(i + 1, total - 1)),
      STEP_MS / speed.value,
    );
    return () => window.clearTimeout(id);
  }, [playing, index, total, speed]);

  // Build the globe. It is rebuilt only when its size, the map or the
  // flights change; moving between flights redraws it in place.
  React.useEffect(() => {
    if (!svgRef.current || !worldData) return;

    // Square on a phone, wider than tall on a larger screen.
    const height = width < 600 ? width : Math.round(width * 0.62);
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const projection = d3
      .geoOrthographic()
      .fitExtent(
        [
          [16, 16],
          [width - 16, height - 16],
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
      .style("fill", "var(--fl-map)")
      .style("stroke", "var(--fl-border)");
    const graticule = root
      .append("path")
      .datum(d3.geoGraticule10())
      .style("fill", "none")
      .style("stroke", "var(--fl-grid)");
    const land = root
      .append("g")
      .selectAll("path")
      .data(worldData.features || [])
      .join("path")
      .style("fill", "var(--fl-grid)")
      .style("stroke", "var(--fl-map)")
      .attr("stroke-width", 0.5);
    const trail = root.append("g");
    const active = root
      .append("path")
      .style("fill", "none")
      .style("stroke", "var(--fl-accent)")
      .attr("stroke-width", 4)
      .attr("stroke-linecap", "round");
    const dots = root.append("g");
    const labels = root.append("g");

    const isVisible = (lonLatPoint) => {
      const [lambda, phi] = projection.rotate();
      return d3.geoDistance(lonLatPoint, [-lambda, -phi]) < Math.PI / 2;
    };

    // `drawn` is how much of the current flight's arc shows, 0 to 1.
    const render = (drawn = 1) => {
      const { index: at, started: moved } = viewRef.current;
      const route = routes[at];
      sphere.attr("d", path);
      graticule.attr("d", path);
      land.attr("d", path);

      trail
        .selectAll("path")
        .data(
          routes.filter((_, i) => (moved ? i < at : i !== at)),
          (d) => d.id,
        )
        .join("path")
        .style("fill", "none")
        .style("stroke", "var(--fl-accent)")
        .attr("stroke-width", 2)
        .attr("stroke-linecap", "round")
        .attr("stroke-opacity", moved ? 0.55 : 0.3)
        .attr("stroke-dasharray", (d) => (d.upcoming ? "5 5" : null))
        .attr("d", (d) =>
          path({ type: "LineString", coordinates: buildArc(d) }),
        );

      if (!route) {
        active.attr("d", null);
        dots.selectAll("circle").remove();
        labels.selectAll("text").remove();
        return;
      }

      active.attr(
        "d",
        path({ type: "LineString", coordinates: buildArc(route) }),
      );
      // jsdom has no getTotalLength, so tests see the arc whole.
      const length = active.node().getTotalLength?.() ?? 0;
      active.attr(
        "stroke-dasharray",
        route.upcoming
          ? "6 5"
          : drawn < 1 && length
            ? `${length * drawn} 9999`
            : null,
      );

      // Every airport before play; during play, only those reached so far.
      const airports = new Map();
      routes.forEach((r, i) => {
        if (moved && i > at) return;
        airports.set(r.fromCode, r.from);
        airports.set(r.toCode, r.to);
      });
      const ends = new Set([route.fromCode, route.toCode]);
      dots
        .selectAll("circle")
        .data(
          [...airports].filter(([, coords]) => isVisible(lonLat(coords))),
          ([code]) => code,
        )
        .join("circle")
        .attr("cx", ([, coords]) => projection(lonLat(coords))[0])
        .attr("cy", ([, coords]) => projection(lonLat(coords))[1])
        .attr("r", ([code]) => (ends.has(code) ? 6 : 4))
        .style("fill", "var(--fl-ink)")
        .style("stroke", "var(--fl-map)")
        .attr("stroke-width", 2);

      labels
        .selectAll("text")
        .data(
          [
            { text: route.fromCity, coords: route.from, below: false },
            { text: route.toCity, coords: route.to, below: true },
          ].filter((d) => isVisible(lonLat(d.coords))),
        )
        .join("text")
        .each(function (d) {
          const [x, y] = projection(lonLat(d.coords));
          const right = x < width * 0.64;
          d3.select(this)
            .attr("x", x + (right ? 10 : -10))
            .attr("y", y + (d.below ? 16 : -8))
            .attr("text-anchor", right ? "start" : "end");
        })
        .attr("font-size", 13)
        .attr("font-weight", 600)
        .attr("stroke-width", 4)
        .attr("stroke-linejoin", "round")
        .attr("paint-order", "stroke")
        .style("fill", "var(--fl-ink)")
        .style("stroke", "var(--fl-map)")
        .text((d) => d.text);
    };

    render();

    svg.call(
      d3.drag().on("drag", (event) => {
        const [lambda, phi] = projection.rotate();
        projection.rotate([lambda + event.dx * 0.3, phi - event.dy * 0.3]);
        rotateRef.current = projection.rotate();
        render();
      }),
    );

    const zoom = d3
      .zoom()
      .scaleExtent([MIN_SCALE, MAX_SCALE])
      .on("zoom", (event) => {
        scaleRef.current = event.transform.k;
        projection.scale(baseScale * scaleRef.current);
        render();
      });
    svg.call(zoom);

    vizRef.current = { svg, projection, render, zoom };
    return () => {
      svg.on(".drag", null);
      svg.on(".zoom", null);
      svg.interrupt();
      vizRef.current = null;
    };
  }, [width, worldData, routes]);

  // Turn the globe to the current flight, then draw its arc. With reduced
  // motion it jumps there instead.
  React.useEffect(() => {
    const viz = vizRef.current;
    if (!viz) return;
    viz.svg.interrupt();
    const route = routes[index];
    if (!started || !route) {
      viz.render();
      return;
    }

    const midpoint = d3.geoInterpolate(
      lonLat(route.from),
      lonLat(route.to),
    )(0.5);
    const start = viz.projection.rotate();
    const end = getCentringRotation(start, midpoint);
    if (reducedMotion) {
      viz.projection.rotate(end);
      rotateRef.current = end;
      viz.render();
      return;
    }

    const turn = d3.interpolate(start, end);
    viz.svg
      .transition()
      .duration(MOVE_MS / speed.value)
      .ease(d3.easeLinear)
      .tween("fly", () => (time) => {
        viz.projection.rotate(turn(d3.easeCubicInOut(Math.min(1, time / 0.6))));
        rotateRef.current = viz.projection.rotate();
        viz.render(d3.easeCubicInOut(Math.max(0, (time - 0.35) / 0.65)));
      });
  }, [index, started, routes, speed, reducedMotion]);

  const zoomBy = (factor) => {
    const viz = vizRef.current;
    if (!viz) return;
    viz.svg
      .transition()
      .duration(reducedMotion ? 0 : 200)
      .call(viz.zoom.scaleBy, factor);
  };

  const goTo = (next) => {
    setPlaying(false);
    setIndex(Math.max(0, Math.min(total - 1, next)));
  };

  const togglePlay = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (index >= total - 1) setIndex(0);
    setPlaying(true);
  };

  const cycleSpeed = () =>
    setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]);

  const position = { index: Math.min(index, total - 1) + 1, total };

  return (
    <Container mt="md" size="sm" pb={96}>
      <Stack gap="md">
        <div>
          <Title order={1} fz={28}>
            {t("title")}
          </Title>
          {total > 0 && (
            <Text c="var(--fl-muted)">
              {t(filtered ? "count_filtered" : "count", { count: total })}
            </Text>
          )}
        </div>

        <div className={classes.tags}>
          <FilterTags />
        </div>

        {loadError && (
          <Alert icon={<IconInfoCircle size={16} />} color="yellow">
            {loadError}
          </Alert>
        )}

        {/* The page keeps its real layout while flights load, so this tells
            screen readers it is loading. The no-routes alert waits until
            then, or it flashes before the routes arrive. */}
        {isLoading && (
          <VisuallyHidden role="status">{t("flights:loading")}</VisuallyHidden>
        )}
        {!total && !isLoading && (
          <Alert icon={<IconInfoCircle size={16} />} color="gray">
            {t(filtered ? "no_routes_filtered" : "no_routes")}
          </Alert>
        )}

        <figure ref={containerRef} className={classes.globe}>
          <svg ref={svgRef} role="img" aria-label={t("map_aria")} />
          <div role="group" aria-label={t("zoom")} className={classes.zoom}>
            <ActionIcon
              variant="default"
              size={38}
              radius="md"
              aria-label={t("zoom_in")}
              onClick={() => zoomBy(1.25)}
            >
              <IconPlus size={18} aria-hidden />
            </ActionIcon>
            <ActionIcon
              variant="default"
              size={38}
              radius="md"
              aria-label={t("zoom_out")}
              onClick={() => zoomBy(1 / 1.25)}
            >
              <IconMinus size={18} aria-hidden />
            </ActionIcon>
          </div>
        </figure>

        {current && (
          <section aria-label={t("current_flight")} className={classes.pass}>
            <div aria-live="polite" className={classes.head}>
              <span
                className={classes.leg}
                data-upcoming={current.upcoming || undefined}
              >
                {t(current.upcoming ? "upcoming_of" : "flight_of", position)}
              </span>
              <span className={classes.route}>
                {current.fromCode}
                <IconArrowNarrowRight
                  size={26}
                  color="var(--fl-accent)"
                  aria-hidden
                />
                {current.toCode}
              </span>
              <span className={classes.date}>
                {formatCalendarDate(current.date, "D MMM YYYY", i18n.language)}
              </span>
              <span className={classes.cities}>
                {t("flights:list.cities", {
                  from: current.fromCity,
                  to: current.toCity,
                })}
              </span>
              <span className={classes.meta}>
                {[
                  current.flightNumber,
                  current.km !== null &&
                    t("flights:km", {
                      value: Math.round(current.km).toLocaleString(
                        i18n.language,
                      ),
                    }),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>

            <div className={classes.stub}>
              <label className={classes.scrub}>
                <span className={classes.scrubHead}>
                  <span>{t("flight")}</span>
                  <span className={classes.mono}>
                    {position.index} / {total}
                  </span>
                </span>
                <input
                  type="range"
                  min={1}
                  max={total}
                  value={position.index}
                  onChange={(event) => goTo(Number(event.target.value) - 1)}
                  aria-valuetext={t("scrub_text", {
                    ...position,
                    from: current.fromCity,
                    to: current.toCity,
                  })}
                  data-cy="tour-scrub"
                />
              </label>

              <div className={classes.controls}>
                <ActionIcon
                  variant="default"
                  radius="xl"
                  size={44}
                  aria-label={t("restart")}
                  onClick={() => goTo(0)}
                  className={classes.restart}
                >
                  <IconRotate size={20} aria-hidden />
                </ActionIcon>
                <div className={classes.transport}>
                  <ActionIcon
                    variant="default"
                    radius="xl"
                    size={44}
                    aria-label={t("previous")}
                    onClick={() => goTo(index - 1)}
                    disabled={index === 0}
                  >
                    <IconChevronLeft size={20} aria-hidden />
                  </ActionIcon>
                  <ActionIcon
                    radius="xl"
                    size={60}
                    aria-label={t(
                      playing ? "pause" : index > 0 ? "resume" : "play",
                    )}
                    onClick={togglePlay}
                    data-cy="tour-play"
                  >
                    {playing ? (
                      <IconPlayerPauseFilled size={26} aria-hidden />
                    ) : (
                      <IconPlayerPlayFilled size={26} aria-hidden />
                    )}
                  </ActionIcon>
                  <ActionIcon
                    variant="default"
                    radius="xl"
                    size={44}
                    aria-label={t("next")}
                    onClick={() => goTo(index + 1)}
                    disabled={index >= total - 1}
                  >
                    <IconChevronRight size={20} aria-hidden />
                  </ActionIcon>
                </div>
                <Button
                  variant="default"
                  radius="xl"
                  h={44}
                  miw={44}
                  px={10}
                  aria-label={t("speed", { value: t(`speed_${speed.key}`) })}
                  onClick={cycleSpeed}
                  className={classes.speed}
                >
                  {speed.text}
                </Button>
              </div>
            </div>
          </section>
        )}
      </Stack>
    </Container>
  );
}

export default WorldTour;
