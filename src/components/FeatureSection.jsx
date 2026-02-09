import React, { useRef } from "react";
import * as Framer from "framer-motion";
import { useInView } from "framer-motion";
import { Text, Card, Group, Image, ActionIcon } from "@mantine/core";
import {
  IconAdjustments,
  IconCalendarTime,
  IconChartBar,
  IconMap,
  IconPlane,
  IconRuler2,
} from "@tabler/icons-react";
import { IDS } from "../constants/MyClasses";
import { useTranslation } from "react-i18next";

// Import optimized WebP images
import mapImg from "../assets/map.webp";
import mapImg380 from "../assets/map-380.webp";
import mapImg760 from "../assets/map-760.webp";
import overallStatsImg from "../assets/overall_stats.webp";
import overallStatsImg380 from "../assets/overall_stats-380.webp";
import overallStatsImg760 from "../assets/overall_stats-760.webp";
import countriesStatsImg from "../assets/countries_stats.webp";
import countriesStatsImg380 from "../assets/countries_stats-380.webp";
import countriesStatsImg760 from "../assets/countries_stats-760.webp";
import distanceStatsImg from "../assets/distance_stats.webp";
import distanceStatsImg380 from "../assets/distance_stats-380.webp";
import distanceStatsImg760 from "../assets/distance_stats-760.webp";
import whenStatsImg from "../assets/when_stats.webp";
import whenStatsImg380 from "../assets/when_stats-380.webp";
import whenStatsImg760 from "../assets/when_stats-760.webp";
import flightStatsImg from "../assets/flight_stats.webp";
import flightStatsImg380 from "../assets/flight_stats-380.webp";
import flightStatsImg760 from "../assets/flight_stats-760.webp";

// Image data with responsive sources
const imageData = {
  "map.png": {
    src: mapImg,
    srcSet: `${mapImg380} 380w, ${mapImg760} 760w, ${mapImg} 1920w`,
  },
  "overall_stats.png": {
    src: overallStatsImg,
    srcSet: `${overallStatsImg380} 380w, ${overallStatsImg760} 760w, ${overallStatsImg} 1920w`,
  },
  "countries_stats.png": {
    src: countriesStatsImg,
    srcSet: `${countriesStatsImg380} 380w, ${countriesStatsImg760} 760w, ${countriesStatsImg} 1920w`,
  },
  "distance_stats.png": {
    src: distanceStatsImg,
    srcSet: `${distanceStatsImg380} 380w, ${distanceStatsImg760} 760w, ${distanceStatsImg} 1920w`,
  },
  "when_stats.png": {
    src: whenStatsImg,
    srcSet: `${whenStatsImg380} 380w, ${whenStatsImg760} 760w, ${whenStatsImg} 1920w`,
  },
  "flight_stats.png": {
    src: flightStatsImg,
    srcSet: `${flightStatsImg380} 380w, ${flightStatsImg760} 760w, ${flightStatsImg} 1920w`,
  },
};

const FeatureCard = ({ icon, title, description, image, id, alt }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  const imgData = imageData[image];

  return (
    <Framer.motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <Card
        shadow="sm"
        padding="lg"
        radius="md"
        withBorder
        id={id}
        style={{ maxWidth: 430, margin: "auto" }}
      >
        <Card.Section>
          <Image
            src={imgData.src}
            srcSet={imgData.srcSet}
            sizes="(max-width: 600px) 380px, (max-width: 1200px) 760px, 1920px"
            alt={alt}
            loading="lazy"
          />
        </Card.Section>

        <Group justify="space-between" mt="md" mb="xs">
          <Text fw={500}>{title}</Text>
          <ActionIcon variant="default">{icon}</ActionIcon>
        </Group>

        <Text size="sm" c="dimmed">
          {description}
        </Text>
      </Card>
    </Framer.motion.div>
  );
};

/**
 * Renders a stack of animated feature cards.
 */
const FeatureSection = () => {
  const { t } = useTranslation("landing");

  const features = [
    {
      icon: (
        <IconMap
          size={40}
          style={{ width: "70%", height: "70%" }}
          stroke={1.5}
        />
      ),
      title: t("features.where_title"),
      description: t("features.where_desc"),
      image: "map.png",
      id: IDS.LANDING.FEATURES.WHERE,
      alt: "World map showing flight paths",
    },
    {
      icon: (
        <IconChartBar
          size={40}
          style={{ width: "70%", height: "70%" }}
          stroke={1.5}
        />
      ),
      title: t("features.what_title"),
      description: t("features.what_desc"),
      image: "overall_stats.png",
      id: IDS.LANDING.FEATURES.WHAT,
      alt: "Flight statistics overview",
    },
    {
      title: t("features.which_title"),
      description: t("features.which_desc"),
      icon: (
        <IconAdjustments
          size={40}
          style={{ width: "70%", height: "70%" }}
          stroke={1.5}
        />
      ),
      image: "countries_stats.png",
      id: IDS.LANDING.FEATURES.WHICH,
      alt: "Countries visited chart",
    },
    {
      title: t("features.how_title"),
      description: t("features.how_desc"),
      icon: (
        <IconRuler2
          size={40}
          style={{ width: "70%", height: "70%" }}
          stroke={1.5}
        />
      ),
      image: "distance_stats.png",
      id: IDS.LANDING.FEATURES.HOW,
      alt: "Distance traveled statistics",
    },
    {
      title: t("features.when_title"),
      description: t("features.when_desc"),
      icon: (
        <IconCalendarTime
          size={40}
          style={{ width: "70%", height: "70%" }}
          stroke={1.5}
        />
      ),
      image: "when_stats.png",
      id: IDS.LANDING.FEATURES.WHEN,
      alt: "Flight history timeline",
    },
    {
      title: t("features.detail_title"),
      description: t("features.detail_desc"),
      icon: (
        <IconPlane
          size={40}
          style={{ width: "70%", height: "70%" }}
          stroke={1.5}
        />
      ),
      image: "flight_stats.png",
      id: IDS.LANDING.FEATURES.DETAIL,
      alt: "Flight details overview",
    },
  ];

  return (
    <>
      {features.map((f) => (
        <FeatureCard key={f.id} {...f} />
      ))}
    </>
  );
};

export default FeatureSection;
