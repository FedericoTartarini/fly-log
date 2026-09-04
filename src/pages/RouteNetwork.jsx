import React from "react";
import * as d3 from "d3";
import {
  Badge,
  Box,
  Card,
  Grid,
  Group,
  NumberInput,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import useFlightStore from "../store";
import FlightFilters from "../components/FlightFilters";
import {
  buildNetworkEvolutionByYear,
  buildRouteNetwork,
} from "../utils/networkUtils";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const RouteNetwork = () => {
  const { t } = useTranslation("network");
  const { filteredFlights } = useFlightStore(
    useShallow((s) => ({
      filteredFlights: s.filteredFlights,
    })),
  );

  const [topN, setTopN] = React.useState(8);
  const [minWeight, setMinWeight] = React.useState(1);
  const [maxRenderedRoutes, setMaxRenderedRoutes] = React.useState(220);

  const network = React.useMemo(
    () =>
      buildRouteNetwork(
        filteredFlights,
        Math.max(1, minWeight),
        Math.max(50, maxRenderedRoutes),
      ),
    [filteredFlights, minWeight, maxRenderedRoutes],
  );

  const topHubs = React.useMemo(
    () => network.nodes.slice(0, topN),
    [network.nodes, topN],
  );

  const topRoutes = React.useMemo(
    () => network.edges.slice(0, topN),
    [network.edges, topN],
  );

  const evolution = React.useMemo(
    () => buildNetworkEvolutionByYear(filteredFlights),
    [filteredFlights],
  );

  const { ref, width } = useElementSize();
  const graphHostRef = React.useRef(null);

  React.useEffect(() => {
    if (!graphHostRef.current) return;
    if (network.nodes.length === 0 || network.edges.length === 0) return;

    const graphWidth = Math.max(320, width || 900);
    const graphHeight = 300;
    const color = d3.scaleOrdinal(d3.schemeTableau10);
    const maxWeight = Math.max(1, ...network.edges.map((edge) => edge.weight));

    const nodes = network.nodes.map((node) => ({
      ...node,
      group: Math.min(9, Math.floor(node.weightedDegree / 2)),
    }));
    const links = network.edges.map((edge) => ({
      ...edge,
      value: edge.weight,
    }));

    const host = d3.select(graphHostRef.current);
    host.selectAll("*").remove();

    const svg = host
      .append("svg")
      .attr("width", graphWidth)
      .attr("height", graphHeight)
      .attr("viewBox", [0, 0, graphWidth, graphHeight])
      .attr("style", "max-width: 100%; height: auto;");

    const zoomLayer = svg.append("g");

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d) => d.id)
          .distance((d) => 210 - (d.value / maxWeight) * 120)
          .strength((d) => 0.25 + (d.value / maxWeight) * 0.35),
      )
      .force("charge", d3.forceManyBody().strength(-280))
      .force("center", d3.forceCenter(graphWidth / 2, graphHeight / 2))
      .force(
        "collision",
        d3.forceCollide().radius((d) => 6 + d.weightedDegree * 0.08),
      )
      .on("tick", ticked);

    svg.call(
      d3
        .zoom()
        .scaleExtent([0.4, 3])
        .on("zoom", (event) => {
          zoomLayer.attr("transform", event.transform);
        }),
    );

    const link = zoomLayer
      .append("g")
      .attr("stroke", "#5c7cfa")
      .attr("stroke-opacity", 0.45)
      .selectAll()
      .data(links)
      .join("line")
      .attr("stroke-width", (d) => 0.8 + (d.value / maxWeight) * 5.5);

    const node = zoomLayer
      .append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.4)
      .selectAll()
      .data(nodes)
      .join("circle")
      .attr("r", (d) => 4 + Math.min(20, d.weightedDegree * 0.35))
      .attr("fill", (d) => color(d.group))
      .call(
        d3
          .drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended),
      );

    node
      .append("title")
      .text((d) => `${d.id} • ${t("graph.hub_weight")}: ${d.weightedDegree}`);

    const hubLabelMin = topHubs[topHubs.length - 1]?.weightedDegree ?? Infinity;
    const labels = zoomLayer
      .append("g")
      .selectAll()
      .data(nodes.filter((d) => d.weightedDegree >= hubLabelMin))
      .join("text")
      .text((d) => d.id)
      .attr("font-size", 10)
      .attr("fill", "#495057")
      .attr("dx", 8)
      .attr("dy", 3)
      .style("pointer-events", "none");

    function ticked() {
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);

      node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);

      labels.attr("x", (d) => d.x).attr("y", (d) => d.y);
    }

    function dragstarted(event) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => {
      simulation.stop();
      host.selectAll("*").remove();
    };
  }, [network.nodes, network.edges, topHubs, t, width]);

  return (
    <Stack gap="md">
      <Card shadow="sm" radius="md" withBorder>
        <Stack gap="sm">
          <Title order={3}>{t("title")}</Title>
          <Text c="dimmed" size="sm">
            {t("subtitle")}
          </Text>
          <Text c="dimmed" size="sm">
            {t("filters_hint")}
          </Text>

          <FlightFilters />

          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            <NumberInput
              label={t("controls.min_route_frequency")}
              value={minWeight}
              min={1}
              max={100}
              onChange={(value) => setMinWeight(Number(value) || 1)}
            />
            <NumberInput
              label={t("controls.max_rendered_routes")}
              value={maxRenderedRoutes}
              min={50}
              max={1000}
              step={25}
              onChange={(value) => setMaxRenderedRoutes(Number(value) || 220)}
            />
            <NumberInput
              label={t("controls.top_n")}
              value={topN}
              min={3}
              max={20}
              onChange={(value) => setTopN(Number(value) || 8)}
            />
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            <Card withBorder radius="md" p="sm">
              <Text size="sm" c="dimmed">
                {t("summary.total_flights")}
              </Text>
              <Title order={4}>{network.filteredFlightsCount}</Title>
            </Card>
            <Card withBorder radius="md" p="sm">
              <Text size="sm" c="dimmed">
                {t("summary.airports")}
              </Text>
              <Title order={4}>{network.nodes.length}</Title>
            </Card>
            <Card withBorder radius="md" p="sm">
              <Text size="sm" c="dimmed">
                {t("summary.routes")}
              </Text>
              <Title order={4}>{network.edges.length}</Title>
            </Card>
          </SimpleGrid>
        </Stack>
      </Card>

      <Grid>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Card shadow="sm" radius="md" withBorder>
            <Title order={4} mb="sm">
              {t("graph.title")}
            </Title>

            {network.nodes.length === 0 || network.edges.length === 0 ? (
              <Text c="dimmed">{t("graph.empty")}</Text>
            ) : (
              <Box
                ref={ref}
                style={{
                  width: "100%",
                  height: 540,
                  borderRadius: 8,
                  overflow: "hidden",
                }}
              >
                <Box
                  ref={graphHostRef}
                  style={{ width: "100%", height: "100%" }}
                />
              </Box>
            )}
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          <Stack>
            <Card shadow="sm" radius="md" withBorder>
              <Title order={5} mb="sm">
                {t("summary.top_hubs")}
              </Title>
              <Stack gap="xs">
                {topHubs.length === 0 && (
                  <Text c="dimmed">{t("summary.no_hubs")}</Text>
                )}
                {topHubs.map((hub) => (
                  <Group key={hub.id} justify="space-between">
                    <Text fw={600}>{hub.id}</Text>
                    <Badge variant="light">{hub.weightedDegree}</Badge>
                  </Group>
                ))}
              </Stack>
            </Card>

            <Card shadow="sm" radius="md" withBorder>
              <Title order={5} mb="sm">
                {t("summary.top_routes")}
              </Title>
              <Stack gap="xs">
                {topRoutes.length === 0 && (
                  <Text c="dimmed">{t("summary.no_routes")}</Text>
                )}
                {topRoutes.map((route) => (
                  <Group key={route.id} justify="space-between">
                    <Text>{`${route.source} → ${route.target}`}</Text>
                    <Badge variant="light">{route.weight}</Badge>
                  </Group>
                ))}
              </Stack>
            </Card>
          </Stack>
        </Grid.Col>
      </Grid>

      <Card shadow="sm" radius="md" withBorder>
        <Title order={4} mb="md">
          {t("evolution.title")}
        </Title>
        {evolution.length === 0 ? (
          <Text c="dimmed">{t("evolution.empty")}</Text>
        ) : (
          <Box style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <LineChart data={evolution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="flights"
                  stroke="#339af0"
                  name={t("evolution.metrics.flights")}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="airports"
                  stroke="#40c057"
                  name={t("evolution.metrics.airports")}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="routes"
                  stroke="#f59f00"
                  name={t("evolution.metrics.routes")}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        )}
      </Card>
    </Stack>
  );
};

export default RouteNetwork;
