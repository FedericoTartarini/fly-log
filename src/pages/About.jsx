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
} from "@mantine/core";
import {
  IconCoffee,
  IconHeart,
  IconBrandGithub,
  IconPlane,
  IconCode,
  IconUsers,
} from "@tabler/icons-react";

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
            raw flight history into beautiful, interactive visualizations. Built
            with modern web technologies. It processes flight logs using Python
            and presents them through an elegant React frontend with interactive
            maps and detailed analytics.
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
          <List spacing="xs" size="sm" center>
            <List.Item>
              Interactive globe visualization of flight paths
            </List.Item>
            <List.Item>Comprehensive flight statistics and analytics</List.Item>
            <List.Item>Year-based filtering and data exploration</List.Item>
            <List.Item>Responsive design for desktop and mobile</List.Item>
            <List.Item>Python-powered data processing pipeline</List.Item>
            <List.Item>Modern React frontend with Mantine UI</List.Item>
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

          <Group spacing="md" mb="lg">
            <Button
              component="a"
              href="buymeacoffee.com/federicot"
              target="_blank"
              lefticon={<IconCoffee size={16} />}
              color="orange"
              variant="filled"
            >
              Buy me a coffee
            </Button>
            <Button
              component="a"
              href="https://www.patreon.com/federicotartarini"
              target="_blank"
              lefticon={<IconHeart size={16} />}
              color="red"
              variant="filled"
            >
              Support on Patreon
            </Button>
            <Button
              component="a"
              href="https://github.com/FedericoTartarini/flights-tracker"
              target="_blank"
              lefticon={<IconBrandGithub size={16} />}
              color="dark"
              variant="outline"
            >
              Star on GitHub
            </Button>
          </Group>

          <Text size="sm" c="dimmed">
            Your support helps me dedicate more time to improving this project,
            adding new features, and maintaining the codebase. Every
            contribution, no matter how small, is greatly appreciated!
          </Text>
        </div>

        <Divider />

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
