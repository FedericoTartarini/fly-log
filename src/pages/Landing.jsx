import React, { lazy, Suspense } from "react";
import { motion } from "framer-motion";
import {
  Container,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Image,
  Loader,
  Center,
  Paper,
  ThemeIcon,
  Grid,
  Card,
  useMantineTheme,
} from "@mantine/core";
import { Link } from "react-router-dom";
import showcase from "../assets/showcase.png";
import showcase380 from "../assets/showcase-380.webp";
import showcase760 from "../assets/showcase-760.webp";
import showcase1200 from "../assets/showcase-1200.webp";
import showcase1800 from "../assets/showcase-1800.webp";
import { PATHS } from "../constants/MyClasses.ts";
import { useTranslation } from "react-i18next";
import { IconRobotFace } from "@tabler/icons-react";

const FeatureSection = lazy(() => import("../components/FeatureSection.jsx"));

function Landing() {
  const { t } = useTranslation("landing");
  const theme = useMantineTheme();
  const heroGradient = {
    from: "grape",
    to: "red",
    deg: 60,
  };
  return (
    <Container size="md" mt="xl">
      <Stack align="center" gap="xl">
        {/* HERO SECTION */}
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, type: "spring" }}
          style={{ width: "100%" }}
        >
          <Stack align="center" gap={6} style={{ width: "100%" }}>
            <Title
              order={1}
              ta="center"
              style={{
                fontSize: "clamp(2.6rem, 6vw, 4.3rem)",
                fontWeight: 900,
                letterSpacing: -1,
              }}
              gradient={heroGradient}
              variant="gradient"
            >
              {t("title")}
            </Title>
            <Text
              ta="center"
              variant="gradient"
              gradient={heroGradient}
              size="xl"
              maw={680}
              style={{ fontSize: "1.3rem", fontWeight: 600 }}
            >
              {t("subtitle")}
            </Text>
          </Stack>
        </motion.div>

        <Group justify="center" gap="md" mb="sm">
          <motion.div whileHover={{ scale: 1.06 }}>
            <Button
              component={Link}
              to={PATHS.LOGIN}
              size="lg"
              radius="xl"
              style={{ fontWeight: 700, boxShadow: "0px 0.5px 8px #0ea5e911" }}
              variant="gradient"
            >
              {t("get_started")}
            </Button>
          </motion.div>
          <Button
            component={Link}
            to={PATHS.ABOUT}
            size="lg"
            radius="xl"
            variant="light"
            color="accent"
            style={{ fontWeight: 500 }}
          >
            {t("learn_more")}
          </Button>
        </Group>

        {/* Placeholder for HERO IMAGE/APP PREVIEW (animated) */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 1, type: "spring" }}
          style={{ display: "flex", justifyContent: "center", width: "100%" }}
        >
          <Image
            radius="md"
            src={showcase}
            srcSet={`${showcase380} 380w, ${showcase760} 760w, ${showcase1200} 1200w, ${showcase1800} 1800w`}
            sizes="(max-width: 900px) 90vw, (max-width: 1400px) 1200px, 1800px"
            alt={t("flight_image_alt")}
            mah="60vh"
            fit="contain"
            fetchPriority="high"
          />
        </motion.div>
        {/* AI ANIMATED CARD + NOTIFICATION DEMO */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.65 }}
          transition={{ duration: 0.7, type: "spring" }}
          style={{ width: "100%" }}
        >
          <Card shadow="xl" p="md" radius="lg" withBorder w="100%">
            <Grid align="center" gutter="xl" justify="center">
              <Grid.Col span={{ base: "content" }}>
                <ThemeIcon radius="xl" size={54} variant="light" color="accent">
                  <IconRobotFace size={36} />
                </ThemeIcon>
              </Grid.Col>
              <Grid.Col span={{ base: "auto", sm: "content" }}>
                <Stack gap={2} maw={340}>
                  <Title order={3}>{t("ai_title")}</Title>
                  <Text size="md" fw={500}>
                    {t("ai_body")}
                  </Text>
                </Stack>
              </Grid.Col>
              <Grid.Col span={{ base: "content" }}>
                {/* Animated AI Notification Demo */}
                <motion.div
                  initial={{ opacity: 0, x: 40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ delay: 0.7, duration: 0.9, type: "spring" }}
                  style={{
                    flexShrink: 0,
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <Paper
                    shadow="sm"
                    radius="xl"
                    p="lg"
                    style={{
                      minWidth: 210,
                      maxWidth: 400,
                      minHeight: 62,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      borderLeft: `6px solid ${theme.colors.grape[4]}`,
                    }}
                  >
                    <span
                      style={{ fontSize: 26, marginRight: 8, lineHeight: 1 }}
                    >
                      ✈️
                    </span>
                    <div>
                      <Text
                        size="lg"
                        fw={700}
                        style={{ marginBottom: -2 }}
                        c="gray.9"
                      >
                        {t("route")}
                      </Text>
                      <Text size="xs" c="dimmed" fw={600}>
                        {t("ai_added_flight")}
                      </Text>
                    </div>
                  </Paper>
                </motion.div>
              </Grid.Col>
            </Grid>
          </Card>
        </motion.div>
        {/* SVG Angled Divider */}
        <Suspense
          fallback={
            <Center>
              <Loader />
            </Center>
          }
        >
          <FeatureSection />
        </Suspense>
      </Stack>
    </Container>
  );
}

export default Landing;
