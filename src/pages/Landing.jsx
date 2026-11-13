import React, { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  animate,
  motion as Motion,
  useInView,
  useReducedMotion,
  useScroll,
} from "framer-motion";
import { Anchor, Button, VisuallyHidden } from "@mantine/core";
import {
  IconArrowNarrowRight,
  IconAward,
  IconCalendar,
  IconList,
  IconMap2,
  IconMoon,
  IconRefresh,
} from "@tabler/icons-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PATHS } from "../constants/MyClasses.ts";
import exampleMap from "../assets/landingMap.json";
import classes from "./Landing.module.css";

// d3 and the globe maths load only as the visitor nears the tour section.
const LandingGlobe = lazy(() => import("../components/LandingGlobe.jsx"));

// Example data, drawn the same as the Stats page but not anyone's real log.
const YEARS = [8, 11, 14, 12, 16, 19, 2, 4, 13, 15, 17, 14, 12]; // 2014–2026
const BUSIEST = Math.max(...YEARS);
const FEATURES = [
  ["map", IconMap2],
  ["distance", IconMoon],
  ["timeline", IconCalendar],
  ["search", IconList],
  ["status", IconRefresh],
  ["badges", IconAward],
];

// 0 to 1 over `duration` seconds once `start` is true; 1 straight away with
// reduced motion.
function useProgress(start, duration, still) {
  const [value, setValue] = useState(still ? 1 : 0);
  useEffect(() => {
    if (still || !start) return;
    const controls = animate(0, 1, {
      duration,
      ease: "linear",
      onUpdate: setValue,
    });
    return () => controls.stop();
  }, [start, duration, still]);
  return still ? 1 : value;
}

const easeOut = (x) => 1 - Math.pow(1 - x, 3);

// Public landing page: hero, an example log as a boarding pass, a pinned
// globe that draws a trip as you scroll, a year chart, the AI entry, the
// feature list and a closing call to action.
function Landing() {
  const { t } = useTranslation("landing");
  const still = Boolean(useReducedMotion());

  const intro = easeOut(useProgress(true, 1.4, still));

  const tourRef = useRef(null);
  // Load the globe a screen ahead, so it is ready when the section pins.
  const tourNear = useInView(tourRef, { once: true, margin: "100% 0px" });
  const { scrollYProgress } = useScroll({
    target: tourRef,
    offset: ["start start", "end end"],
  });

  const chartRef = useRef(null);
  const chartSeen = useInView(chartRef, { once: true, amount: 0.5 });

  const aiRef = useRef(null);
  const aiSeen = useInView(aiRef, { once: true, amount: 0.6 });
  const request = t("ai.request");
  const typing = useProgress(aiSeen, request.length / 28, still);
  const typed = request.slice(0, Math.round(typing * request.length));

  const reveal = (delay = 0) =>
    still
      ? {}
      : {
          initial: { opacity: 0, y: 18 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.4 },
          transition: { duration: 0.5, ease: "easeOut", delay },
        };

  return (
    <div className={classes.page}>
      <section className={classes.hero}>
        <div className={classes.heroText}>
          <p className={classes.eyebrow}>{t("eyebrow")}</p>
          <h1 className={classes.title}>{t("title")}</h1>
          <p className={classes.subtitle}>{t("subtitle")}</p>
          <div className={classes.actions}>
            <Button component={Link} to={PATHS.LOGIN} size="lg" radius="md">
              {t("start")}
            </Button>
            <Anchor href="#features" c="var(--fl-ink)" className={classes.link}>
              {t("see_what")}
            </Anchor>
          </div>
        </div>

        <Motion.figure
          className={classes.pass}
          aria-label={t("example.label")}
          style={{ opacity: 0.2 + 0.8 * intro, y: (1 - intro) * 24 }}
        >
          <div className={classes.band}>
            <span>{t("example.band")}</span>
            <span>1993 – 2026</span>
          </div>
          <svg
            viewBox={`0 0 ${exampleMap.width} ${exampleMap.height}`}
            aria-hidden="true"
            className={classes.map}
          >
            <path d={exampleMap.land} fill="var(--fl-grid)" />
            <g
              fill="none"
              stroke="var(--fl-accent)"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.85"
              strokeDasharray="1 1"
              strokeDashoffset={1 - intro}
            >
              {exampleMap.routes.map((d) => (
                <path key={d} d={d} pathLength="1" />
              ))}
            </g>
            <g fill="var(--fl-ink)" stroke="var(--fl-map)" strokeWidth="2">
              {exampleMap.dots.map(([cx, cy, r]) => (
                <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
              ))}
            </g>
          </svg>
          <dl aria-hidden="true" className={classes.totals}>
            <div>
              <dt>{t("example.flights")}</dt>
              <dd>{Math.round(195 * intro)}</dd>
            </div>
            <div>
              <dt>{t("example.km")}</dt>
              <dd>{Math.round(812 * intro)}k</dd>
            </div>
            <div>
              <dt>{t("example.countries")}</dt>
              <dd>{Math.round(31 * intro)}</dd>
            </div>
          </dl>
          <div className={classes.stub}>{t("example.moon")}</div>
        </Motion.figure>
      </section>

      <section
        ref={tourRef}
        className={classes.tour}
        aria-labelledby="landing-tour"
      >
        <div className={classes.tourPin}>
          <p className={classes.eyebrow}>{t("tour.eyebrow")}</p>
          <h2 id="landing-tour" className={classes.heading}>
            {t("tour.title")}
          </h2>
          <p className={classes.muted}>{t("tour.body")}</p>
          <div className={classes.globe}>
            {tourNear && (
              <Suspense fallback={null}>
                <LandingGlobe progress={scrollYProgress} still={still} />
              </Suspense>
            )}
          </div>
        </div>
      </section>

      <section
        ref={chartRef}
        className={`${classes.card} ${classes.narrow}`}
        aria-labelledby="landing-chart"
      >
        <p className={classes.eyebrow}>{t("chart.eyebrow")}</p>
        <h2 id="landing-chart" className={classes.heading}>
          {t("chart.title")}
        </h2>
        <svg viewBox="0 0 326 150" role="img" aria-label={t("chart.label")}>
          <line
            x1="0"
            y1="128.5"
            x2="326"
            y2="128.5"
            stroke="var(--fl-divider)"
          />
          {YEARS.map((n, i) => {
            const h = n * 6;
            return (
              <Motion.rect
                key={2014 + i}
                x={4 + i * 24.5}
                y={128 - h}
                width="18"
                height={h}
                rx="3"
                fill={n === BUSIEST ? "var(--fl-accent)" : "var(--fl-ink)"}
                style={{ transformBox: "fill-box", originY: 1 }}
                initial={still ? false : { scaleY: 0 }}
                animate={chartSeen ? { scaleY: 1 } : undefined}
                transition={{ duration: 0.5, ease: "easeOut", delay: i * 0.05 }}
              />
            );
          })}
          {[0, 4, 8, 12].map((i) => (
            <text
              key={i}
              x={13 + i * 24.5}
              y="146"
              textAnchor="middle"
              className={classes.axis}
            >
              {2014 + i}
            </text>
          ))}
          <Motion.text
            x={13 + YEARS.indexOf(BUSIEST) * 24.5}
            y={128 - BUSIEST * 6 - 6}
            textAnchor="middle"
            className={classes.peak}
            initial={still ? false : { opacity: 0 }}
            animate={chartSeen ? { opacity: 1 } : undefined}
            transition={{ delay: 0.7 }}
          >
            {BUSIEST}
          </Motion.text>
        </svg>
        <p className={classes.small}>{t("chart.body")}</p>
      </section>

      <section className={classes.narrow} aria-labelledby="landing-ai">
        <p className={classes.eyebrow}>{t("ai.eyebrow")}</p>
        <h2 id="landing-ai" className={classes.heading}>
          {t("ai.title")}
        </h2>
        <div ref={aiRef} className={classes.chat}>
          <p className={classes.request}>
            <VisuallyHidden>{request}</VisuallyHidden>
            <span aria-hidden="true">
              {typed}
              {typing < 1 && <span className={classes.caret}>|</span>}
            </span>
          </p>
          <Motion.ul
            className={classes.found}
            initial={still ? false : { opacity: 0, y: 10 }}
            animate={typing === 1 ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            {[
              ["FCO", "CDG", t("ai.first")],
              ["CDG", "FCO", t("ai.second")],
            ].map(([from, to, when]) => (
              <li key={from}>
                <span className={classes.route}>
                  {from}
                  <IconArrowNarrowRight
                    size={20}
                    color="var(--fl-accent)"
                    aria-hidden
                  />
                  <VisuallyHidden>{t("to")}</VisuallyHidden>
                  {to}
                </span>
                <span className={classes.when}>{when}</span>
              </li>
            ))}
          </Motion.ul>
        </div>
        <p className={classes.muted}>{t("ai.body")}</p>
      </section>

      <section
        id="features"
        // Clear the fixed 61 px app header when the hero link jumps here.
        style={{ scrollMarginTop: 72 }}
        className={classes.narrow}
        aria-labelledby="landing-features"
      >
        <h2 id="landing-features" className={classes.heading}>
          {t("features.title")}
        </h2>
        <ul className={classes.features}>
          {FEATURES.map((feature, i) => {
            const [key, FeatureIcon] = feature;
            return (
              <Motion.li key={key} {...reveal(i * 0.08)}>
                <span className={classes.icon} aria-hidden="true">
                  <FeatureIcon size={22} stroke={1.8} />
                </span>
                <span>
                  <span className={classes.featureTitle}>
                    {t(`features.${key}_title`)}
                  </span>
                  <span className={classes.small}>
                    {t(`features.${key}_desc`)}
                  </span>
                </span>
              </Motion.li>
            );
          })}
        </ul>
      </section>

      <section
        className={`${classes.closing} ${classes.narrow}`}
        aria-labelledby="landing-closing"
      >
        <h2 id="landing-closing" className={classes.closingTitle}>
          {t("closing")}
        </h2>
        <Button component={Link} to={PATHS.LOGIN} size="lg" radius="md">
          {t("start")}
        </Button>
      </section>
    </div>
  );
}

export default Landing;
