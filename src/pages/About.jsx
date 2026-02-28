import {
  Title,
  Text,
  Paper,
  Stack,
  Group,
  Button,
  Divider,
  List,
  ThemeIcon,
  Grid,
  Center,
} from "@mantine/core";
import {
  IconCoffee,
  IconHeart,
  IconBrandGithub,
  IconPlane,
  IconCode,
  IconUsers,
  IconGitPullRequest,
  IconAlertCircle,
} from "@tabler/icons-react";
import { APP_INFO } from "../constants/MyClasses.js";
import { useTranslation } from "react-i18next";

// About page with project details + contribution links.
function About() {
  const { t } = useTranslation("about");
  return (
    <Paper shadow="md" p="xl" radius="md">
      <Stack spacing="xl">
        <div>
          <Title order={2} ta="center" mb="lg">
            {t("title")}
          </Title>
          <Text size="lg" ta="center" c={"primary"} mb="xl">
            {t("subtitle")}
          </Text>
        </div>

        <div>
          <Title order={3} mb="md">
            <Group spacing="xs">
              <ThemeIcon variant="light" size="lg">
                <IconPlane size={20} />
              </ThemeIcon>
              {t("what_is_this")}
            </Group>
          </Title>
          <Text mb="md">{t("what_is_this_p1")}</Text>
          <Text>{t("what_is_this_p2")}</Text>
        </div>

        <Divider />

        <div>
          <Title order={3} mb="md">
            <Group spacing="xs">
              <ThemeIcon variant="light" size="lg">
                <IconCode size={20} />
              </ThemeIcon>
              {t("about_developer")}
            </Group>
          </Title>
          <Text mb="md">{t("developer_p1")}</Text>
          <Text>{t("developer_p2")}</Text>
        </div>

        <Divider />

        <div>
          <Title order={3} mb="md">
            <Group spacing="xs">
              <ThemeIcon variant="light" size="lg">
                <IconUsers size={20} />
              </ThemeIcon>
              {t("features_technology")}
            </Group>
          </Title>
          <List spacing="xs" center>
            <List.Item>{t("features_1")}</List.Item>
            <List.Item>{t("features_2")}</List.Item>
            <List.Item>{t("features_3")}</List.Item>
            <List.Item>{t("features_4")}</List.Item>
            <List.Item>{t("features_5")}</List.Item>
          </List>
        </div>

        <Divider />

        <div>
          <Title order={3} mb="md">
            <Group spacing="xs">
              <ThemeIcon variant="light" size="lg">
                <IconHeart size={20} />
              </ThemeIcon>
              {t("support_project")}
            </Group>
          </Title>
          <Text mb="md">{t("support_text_p1")}</Text>

          <Grid mb="lg" justify="space-around">
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Center>
                <Button
                  component="a"
                  href={APP_INFO.BUY_ME_A_COFFEE}
                  target="_blank"
                  color="orange"
                  variant="filled"
                  leftSection={<IconCoffee size={14} />}
                >
                  Buy Me a Coffee
                </Button>
              </Center>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Center>
                <Button
                  component="a"
                  href={APP_INFO.PATREON}
                  target="_blank"
                  color="red"
                  variant="gradient"
                  leftSection={<IconHeart size={14} />}
                >
                  Support on Patreon
                </Button>
              </Center>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Center>
                <Button
                  component="a"
                  href={APP_INFO.GITHUB_REPO}
                  target="_blank"
                  color="dark"
                  leftSection={<IconBrandGithub size={14} />}
                >
                  Star on GitHub
                </Button>
              </Center>
            </Grid.Col>
          </Grid>

          <Text size="sm" c="dimmed">
            {t("support_text_p2")}
          </Text>
        </div>

        <Divider />

        <Title order={3} mb="md">
          <Group spacing="xs">
            <ThemeIcon variant="light" size="lg">
              <IconGitPullRequest size={20} />
            </ThemeIcon>
            {t("contribute")}
          </Group>
        </Title>
        <Text mb="md">{t("contribute_p1")}</Text>
        <List spacing="xs" center>
          <List.Item
            icon={
              <ThemeIcon color="dark" variant="light" size="sm">
                <IconBrandGithub size={16} />
              </ThemeIcon>
            }
          >
            <a
              href={APP_INFO.GITHUB_REPO}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("contribute_link_fork")}
            </a>
          </List.Item>
          <List.Item
            icon={
              <ThemeIcon color="red" variant="light" size="sm">
                <IconAlertCircle size={16} />
              </ThemeIcon>
            }
          >
            <a
              href={`${APP_INFO.GITHUB_REPO}/issues`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("contribute_link_issues")}
            </a>
          </List.Item>
        </List>
        <Text size="sm" c="dimmed" mt="sm">
          Please review the contribution guidelines in the repository before
          submitting changes.
        </Text>

        <div>
          <Title order={3} mb="md">
            {t("open_source")}
          </Title>
          <Text mb="md">{t("open_source_p1")}</Text>
          <Text size="sm" c="dimmed">
            {t("open_source_p2")}
          </Text>
        </div>
      </Stack>
    </Paper>
  );
}

export default About;
