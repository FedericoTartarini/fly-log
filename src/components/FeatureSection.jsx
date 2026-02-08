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

const FeatureCard = ({ icon, title, description, image, id, alt }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  let imageUrl = new URL(`../assets/${image}`, import.meta.url).href;

  return (
    <Framer.motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <Card shadow="sm" padding="lg" radius="md" withBorder id={id}>
        <Card.Section component="a" href="https://mantine.dev/">
          <Image src={imageUrl} alt={alt} loading="lazy" />
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
