import React, { useEffect, useState } from "react";
import * as d3 from "d3";
import { motion as Motion, useMotionValueEvent } from "framer-motion";
import { IconArrowNarrowRight } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import classes from "../pages/Landing.module.css";

// Same shapes as the route tour (src/pages/WorldTour.jsx).
const WORLD_GEOJSON_URL =
  "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson";
const AIRPORTS = {
  SYD: [151.18, -33.95],
  SIN: [103.99, 1.36],
  FCO: [12.25, 41.8],
  SFO: [-122.38, 37.62],
  HNL: [-157.92, 21.32],
};
const STEPS = 48;
const LEGS = [
  ["SYD", "SIN"],
  ["SIN", "FCO"],
  ["FCO", "SFO"],
  ["SFO", "HNL"],
  ["HNL", "SYD"],
].map(([from, to]) => {
  const at = d3.geoInterpolate(AIRPORTS[from], AIRPORTS[to]);
  return {
    from,
    to,
    mid: at(0.5),
    points: d3.range(STEPS + 1).map((i) => at(i / STEPS)),
  };
});

const clamp = (x) => Math.max(0, Math.min(1, x));
const ease = (x) => 1 - Math.pow(1 - x, 3);

// The landing page's pinned globe. `progress` is the scroll position through
// the pinned section, 0 to 1, and the trip is drawn across it: no timers, so
// the globe stops when the scrolling stops.
function LandingGlobe({ progress, still }) {
  const { t } = useTranslation("landing");
  const [p, setP] = useState(progress.get());
  useMotionValueEvent(progress, "change", setP);
  // Land arrives a moment after the globe; without it the grid alone still reads.
  const [world, setWorld] = useState(null);
  useEffect(() => {
    let mounted = true;
    d3.json(WORLD_GEOJSON_URL)
      .then((data) => mounted && setWorld(data))
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  // Finish the last leg a little before the section unpins.
  const pos = Math.min(LEGS.length - 1e-4, p * LEGS.length * 1.08);
  const index = Math.floor(pos);
  const leg = LEGS[index];
  const prev = LEGS[Math.max(0, index - 1)];
  const drawn = still ? 1 : ease(clamp((pos - index) * 1.4));
  // Turn from the previous leg's midpoint to this one's, the short way round.
  const turn = still || index === 0 ? 1 : ease(clamp((pos - index) * 2.5));
  const dLon = ((leg.mid[0] - prev.mid[0] + 540) % 360) - 180;
  const centre = [
    prev.mid[0] + dLon * turn,
    (prev.mid[1] + (leg.mid[1] - prev.mid[1]) * turn) * 0.6,
  ];

  const projection = d3
    .geoOrthographic()
    .scale(160)
    .translate([179, 179])
    .clipAngle(90)
    .rotate([-centre[0], -centre[1]]);
  const path = d3.geoPath(projection);
  const done = path({
    type: "MultiLineString",
    coordinates: LEGS.slice(0, index).map((l) => l.points),
  });
  const current = path({
    type: "LineString",
    coordinates: leg.points.slice(
      0,
      Math.max(2, Math.round(drawn * STEPS) + 1),
    ),
  });
  const visited = new Set([
    "SYD",
    ...LEGS.slice(0, index + 1).map((l) => l.to),
  ]);
  const dots = [...visited]
    .filter((code) => d3.geoDistance(AIRPORTS[code], centre) < Math.PI / 2)
    .map((code) => [code, ...projection(AIRPORTS[code])]);

  return (
    <div className={classes.globeInner}>
      {/* Only the globe fades in. The chip's text stays at full contrast. */}
      <Motion.svg
        viewBox="0 0 358 358"
        role="img"
        aria-label={t("tour.globe_label")}
        initial={still ? false : { opacity: 0.15, scale: 0.82 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <circle
          cx="179"
          cy="179"
          r="160"
          fill="var(--fl-map)"
          stroke="var(--fl-border)"
        />
        <path
          d={path(d3.geoGraticule10())}
          fill="none"
          stroke="var(--fl-grid)"
        />
        {world && (
          <path
            d={path(world)}
            fill="var(--fl-grid)"
            stroke="var(--fl-map)"
            strokeWidth="0.5"
          />
        )}
        <path
          d={done}
          fill="none"
          stroke="var(--fl-accent)"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.55"
        />
        <path
          d={current}
          fill="none"
          stroke="var(--fl-accent)"
          strokeWidth="4"
          strokeLinecap="round"
        />
        {dots.map(([code, x, y]) => (
          <circle
            key={code}
            cx={x}
            cy={y}
            r={code === leg.from || code === leg.to ? 6 : 4}
            fill="var(--fl-ink)"
            stroke="var(--fl-map)"
            strokeWidth="2"
          />
        ))}
      </Motion.svg>
      <div className={classes.chip} aria-hidden="true">
        <span className={classes.chipTag}>
          {index + 1}/{LEGS.length}
        </span>
        <span className={classes.route}>
          {leg.from}
          <IconArrowNarrowRight size={20} color="var(--fl-accent)" />
          {leg.to}
        </span>
      </div>
    </div>
  );
}

export default LandingGlobe;
