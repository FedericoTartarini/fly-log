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

function About() {
  return (
    <Paper shadow="md" p="xl" radius="md">
      <Stack spacing="xl">
        <div>
          <Title order={2} ta="center" mb="lg">
            About My Flight Tracker
          </Title>
          <Text size="lg" ta="center" c="dimmed" mb="xl">
            Personal flight data visualization made simple and beautiful
          </Text>
        </div>

        <div>
          <Title order={3} mb="md">
            <Group spacing="xs">
              <ThemeIcon variant="light" size="lg">
                <IconPlane size={20} />
              </ThemeIcon>
              What is this project?
            </Group>
          </Title>
          <Text mb="md">
            This Flight Data Visualizer is a personal project that transforms
            raw flight history into beautiful, interactive visualizations.
          </Text>
          <Text>
            Whether you're an aviation enthusiast, frequent traveler, or data
            visualization lover, this tool helps you explore and understand your
            travel patterns in ways you've never seen before.
          </Text>
        </div>

        <Divider />

        <div>
          <Title order={3} mb="md">
            <Group spacing="xs">
              <ThemeIcon variant="light" size="lg">
                <IconCode size={20} />
              </ThemeIcon>
              About the Developer
            </Group>
          </Title>
          <Text mb="md">
            Hi! I'm <strong>Federico Tartarini</strong>, a passionate developer
            who loves creating tools that make data beautiful and accessible.
            With expertise in both backend data processing and frontend
            visualization, I enjoy building applications that solve real
            problems while delivering great user experiences.
          </Text>
          <Text>
            This project combines my interests in aviation, data science, and
            web development. I believe in open-source software and sharing
            knowledge with the developer community.
          </Text>
        </div>

        <Divider />

        <div>
          <Title order={3} mb="md">
            <Group spacing="xs">
              <ThemeIcon variant="light" size="lg">
                <IconUsers size={20} />
              </ThemeIcon>
              Features & Technology
            </Group>
          </Title>
          <List spacing="xs" center>
            <List.Item>
              Interactive globe visualization of flight paths
            </List.Item>
            <List.Item>Comprehensive flight statistics and analytics</List.Item>
            <List.Item>Year-based filtering and data exploration</List.Item>
            <List.Item>Responsive design for desktop and mobile</List.Item>
            <List.Item>Modern UI</List.Item>
          </List>
        </div>

        <Divider />

        <div>
          <Title order={3} mb="md">
            <Group spacing="xs">
              <ThemeIcon variant="light" size="lg">
                <IconHeart size={20} />
              </ThemeIcon>
              Support This Project
            </Group>
          </Title>
          <Text mb="md">
            If you find this project useful or interesting, there are several
            ways you can show your support and help it grow:
          </Text>

          <Grid mb="lg" justify="space-around">
            <Grid.Col span={{ base: 12, md: 6 }}>
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
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Center>
                <Button
                  component="a"
                  href={APP_INFO.PATREON}
                  target="_blank"
                  color="red"
                  variant="filled"
                  leftSection={<IconHeart size={14} />}
                >
                  Support on Patreon
                </Button>
              </Center>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
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
            Your support helps me dedicate more time to improving this project,
            adding new features, and maintaining the codebase. Every
            contribution, no matter how small, is greatly appreciated!
          </Text>
        </div>

        <Divider />

        <Title order={3} mb="md">
          <Group spacing="xs">
            <ThemeIcon variant="light" size="lg">
              <IconGitPullRequest size={20} />
            </ThemeIcon>
            How to Contribute & Report Issues
          </Group>
        </Title>
        <Text mb="md">
          Contributions are welcome! If you want to add features, fix bugs, or
          improve documentation, please visit the project repository on GitHub.
        </Text>
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
              Fork the repository and submit a pull request
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
              Report bugs or request features via GitHub Issues
            </a>
          </List.Item>
        </List>
        <Text size="sm" c="dimmed" mt="sm">
          Please review the contribution guidelines in the repository before
          submitting changes.
        </Text>

        <div>
          <Title order={3} mb="md">
            Open Source & Community
          </Title>
          <Text mb="md">
            This project is open source and welcomes contributions from the
            community. Whether you're interested in adding features, fixing
            bugs, improving documentation, or just sharing feedback, your
            involvement helps make this tool better for everyone.
          </Text>
          <Text size="sm" c="dimmed">
            Built with ❤️ using React, Vite, Mantine UI, Python, and lots of
            coffee.
          </Text>
        </div>
      </Stack>
    </Paper>
  );
}

export default About;
