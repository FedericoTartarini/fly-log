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
} from "@mantine/core";
import { Link } from "react-router-dom";
import showcase from "../assets/showcase.png";
import { PATHS } from "../constants/MyClasses.ts";
import { useTranslation } from "react-i18next";
import { IconRobotFace } from "@tabler/icons-react";

const FeatureSection = lazy(() => import("../components/FeatureSection.jsx"));

function Landing() {
  const { t } = useTranslation("landing");
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
              gradient={{ from: "#0ea5e9", to: "#007cf0" }}
              variant="gradient"
            >
              {t("title")}
            </Title>
            <Text
              ta="center"
              variant="gradient"
              size="xl"
              maw={680}
              style={{ fontSize: "1.3rem", fontWeight: 600 }}
            >
              {t("subtitle")}
            </Text>
          </Stack>
        </motion.div>

        <Group justify="center" gap="md" mb="sm">
          <Button
            component={Link}
            to={PATHS.LOGIN}
            size="lg"
            radius="xl"
            style={{ fontWeight: 700, boxShadow: "0px 0.5px 8px #0ea5e911" }}
            variant="gradient"
            whileHover={{ scale: 1.06 }}
            as={motion.button}
          >
            {t("get_started")}
          </Button>
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
            // srcSet={`${flightImg380} 380w, ${flightImg760} 760w, ${flightImg} 1920w`}
            // sizes="(max-width: 600px) 380px, (max-width: 1200px) 760px, 1920px"
            alt={t("flight_image_alt")}
            h="600px"
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
                  animate={{ opacity: 1, x: 0 }}
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
                    bg="white"
                    style={{
                      minWidth: 210,
                      maxWidth: 400,
                      minHeight: 62,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      borderLeft: "6px solid #8574bf",
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
                        Roma ➜ Paris
                      </Text>
                      <Text size="xs" c="dimmed" fw={600}>
                        AI added your flight!
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
