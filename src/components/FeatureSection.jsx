import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";
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

const FeatureCard = ({ icon, title, description, image, id }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  let imageUrl = new URL(`../assets/${image}`, import.meta.url).href;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <Card shadow="sm" padding="lg" radius="md" withBorder id={id}>
        <Card.Section component="a" href="https://mantine.dev/">
          <Image src={imageUrl} />
        </Card.Section>

        <Group justify="space-between" mt="md" mb="xs">
          <Text fw={500}>{title}</Text>
          <ActionIcon variant="default">{icon}</ActionIcon>
        </Group>

        <Text size="sm" c="dimmed">
          {description}
        </Text>
      </Card>
    </motion.div>
  );
};

/**
 * Renders a stack of animated feature cards.
 */
const FeatureSection = () => {
  const features = [
    {
      icon: (
        <IconMap
          size={40}
          style={{ width: "70%", height: "70%" }}
          stroke={1.5}
        />
      ),
      title: "Where did you fly?",
      description: "Visualize all your flights on a world map.",
      image: "map.png",
      id: IDS.LANDING.FEATURES.WHERE,
    },
    {
      icon: (
        <IconChartBar
          size={40}
          style={{ width: "70%", height: "70%" }}
          stroke={1.5}
        />
      ),
      title: "What are your stats?",
      description: "Get insights into your flight history and statistics.",
      image: "overall_stats.png",
      id: IDS.LANDING.FEATURES.WHAT,
    },
    {
      title: "Which countries did you visit?",
      description: "See your travel history and countries visited.",
      icon: (
        <IconAdjustments
          size={40}
          style={{ width: "70%", height: "70%" }}
          stroke={1.5}
        />
      ),
      image: "countries_stats.png",
      id: IDS.LANDING.FEATURES.WHICH,
    },
    {
      title: "How far did you fly?",
      description:
        "Calculate total distance traveled across all flights and compare it with the circumference of the Earth, distance to the Moon, and Mars.",
      icon: (
        <IconRuler2
          size={40}
          style={{ width: "70%", height: "70%" }}
          stroke={1.5}
        />
      ),
      image: "distance_stats.png",
      id: IDS.LANDING.FEATURES.HOW,
    },
    {
      title: "When did you fly?",
      description:
        "View your flight history by year and check in which year, month, or day you flew the most.",
      icon: (
        <IconCalendarTime
          size={40}
          style={{ width: "70%", height: "70%" }}
          stroke={1.5}
        />
      ),
      image: "when_stats.png",
      id: IDS.LANDING.FEATURES.WHEN,
    },
    {
      title: "Flight Details",
      description:
        "See detailed flight information like departure/arrival airports, airline, and flight number.",
      icon: (
        <IconPlane
          size={40}
          style={{ width: "70%", height: "70%" }}
          stroke={1.5}
        />
      ),
      image: "flight_stats.png",
      id: IDS.LANDING.FEATURES.DETAIL,
    },
  ];

  return (
    <>
      {features.map((f, i) => (
        <FeatureCard key={i} {...f} />
      ))}
    </>
  );
};

export default FeatureSection;
