import { parseToDate } from "./dateUtils";

type FlightLike = {
  departure_airport_iata?: string | null;
  arrival_airport_iata?: string | null;
  departure_date?: unknown;
};

export type NetworkNode = {
  id: string;
  label: string;
  departures: number;
  arrivals: number;
  weightedDegree: number;
};

export type NetworkEdge = {
  id: string;
  source: string;
  target: string;
  weight: number;
};

export type PositionedNode = NetworkNode & {
  x: number;
  y: number;
  radius: number;
};

export type NetworkBuildResult = {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  filteredFlightsCount: number;
};

const hashCode = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

export const buildRouteNetwork = (
  flights: FlightLike[],
  minWeight = 1,
  maxEdges = 300,
): NetworkBuildResult => {
  const nodeMap = new Map<string, NetworkNode>();
  const edgeMap = new Map<string, NetworkEdge>();

  flights.forEach((flight) => {
    const source = String(flight.departure_airport_iata || "").trim().toUpperCase();
    const target = String(flight.arrival_airport_iata || "").trim().toUpperCase();
    if (!source || !target || source.length !== 3 || target.length !== 3) return;

    if (!nodeMap.has(source)) {
      nodeMap.set(source, {
        id: source,
        label: source,
        departures: 0,
        arrivals: 0,
        weightedDegree: 0,
      });
    }
    if (!nodeMap.has(target)) {
      nodeMap.set(target, {
        id: target,
        label: target,
        departures: 0,
        arrivals: 0,
        weightedDegree: 0,
      });
    }

    const sourceNode = nodeMap.get(source)!;
    const targetNode = nodeMap.get(target)!;
    sourceNode.departures += 1;
    targetNode.arrivals += 1;
    sourceNode.weightedDegree += 1;
    targetNode.weightedDegree += 1;

    const edgeId = `${source}->${target}`;
    if (!edgeMap.has(edgeId)) {
      edgeMap.set(edgeId, {
        id: edgeId,
        source,
        target,
        weight: 0,
      });
    }
    edgeMap.get(edgeId)!.weight += 1;
  });

  const edges = Array.from(edgeMap.values())
    .filter((edge) => edge.weight >= minWeight)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, maxEdges);

  const activeNodeIds = new Set<string>();
  edges.forEach((edge) => {
    activeNodeIds.add(edge.source);
    activeNodeIds.add(edge.target);
  });

  const nodes = Array.from(nodeMap.values())
    .filter((node) => activeNodeIds.size === 0 || activeNodeIds.has(node.id))
    .sort((a, b) => b.weightedDegree - a.weightedDegree);

  return {
    nodes,
    edges,
    filteredFlightsCount: flights.length,
  };
};

type LayoutNode = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
};

export const withForceLayout = (
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  width: number,
  height: number,
): PositionedNode[] => {
  if (nodes.length === 0) return [];

  const safeWidth = Math.max(width, 320);
  const safeHeight = Math.max(height, 320);
  const centerX = safeWidth / 2;
  const centerY = safeHeight / 2;
  const maxDegree = Math.max(1, ...nodes.map((node) => node.weightedDegree));

  const simNodes = new Map<string, LayoutNode>();
  nodes.forEach((node) => {
    const seed = hashCode(node.id);
    const angle = (seed % 360) * (Math.PI / 180);
    const ring = 60 + (seed % 240);
    simNodes.set(node.id, {
      x: centerX + Math.cos(angle) * ring,
      y: centerY + Math.sin(angle) * ring,
      vx: 0,
      vy: 0,
      radius: 5 + (node.weightedDegree / maxDegree) * 11,
    });
  });

  const edgeWeightMax = Math.max(1, ...edges.map((edge) => edge.weight));

  const iterations = 220;
  const damping = 0.84;
  const repulsion = 2600;
  const centerPull = 0.0035;
  const springBase = 0.025;

  for (let step = 0; step < iterations; step += 1) {
    const nodeIds = nodes.map((node) => node.id);

    for (let i = 0; i < nodeIds.length; i += 1) {
      for (let j = i + 1; j < nodeIds.length; j += 1) {
        const a = simNodes.get(nodeIds[i])!;
        const b = simNodes.get(nodeIds[j])!;

        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist2 = Math.max(25, dx * dx + dy * dy);
        const force = repulsion / dist2;
        const invDist = 1 / Math.sqrt(dist2);

        const fx = dx * invDist * force;
        const fy = dy * invDist * force;

        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }
    }

    edges.forEach((edge) => {
      const source = simNodes.get(edge.source);
      const target = simNodes.get(edge.target);
      if (!source || !target) return;

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));

      const normalizedWeight = edge.weight / edgeWeightMax;
      const targetDistance = 180 - normalizedWeight * 95;
      const spring = springBase + normalizedWeight * 0.03;
      const delta = distance - targetDistance;

      const fx = (dx / distance) * delta * spring;
      const fy = (dy / distance) * delta * spring;

      source.vx += fx;
      source.vy += fy;
      target.vx -= fx;
      target.vy -= fy;
    });

    nodes.forEach((node) => {
      const sim = simNodes.get(node.id)!;

      sim.vx += (centerX - sim.x) * centerPull;
      sim.vy += (centerY - sim.y) * centerPull;

      sim.vx *= damping;
      sim.vy *= damping;

      sim.x += sim.vx;
      sim.y += sim.vy;

      const pad = sim.radius + 12;
      sim.x = Math.max(pad, Math.min(safeWidth - pad, sim.x));
      sim.y = Math.max(pad, Math.min(safeHeight - pad, sim.y));
    });
  }

  return nodes.map((node) => {
    const sim = simNodes.get(node.id)!;
    return {
      ...node,
      x: sim.x,
      y: sim.y,
      radius: sim.radius,
    };
  });
};

const getFlightYear = (flight: FlightLike): number | null => {
  const dt = parseToDate(flight.departure_date);
  if (!dt) return null;
  return dt.getFullYear();
};

export const buildNetworkEvolutionByYear = (flights: FlightLike[]) => {
  const byYear = new Map<
    number,
    { flights: number; airports: Set<string>; routes: Set<string> }
  >();

  flights.forEach((flight) => {
    const year = getFlightYear(flight);
    if (year === null) return;

    const source = String(flight.departure_airport_iata || "").trim().toUpperCase();
    const target = String(flight.arrival_airport_iata || "").trim().toUpperCase();
    if (!source || !target) return;

    if (!byYear.has(year)) {
      byYear.set(year, {
        flights: 0,
        airports: new Set<string>(),
        routes: new Set<string>(),
      });
    }

    const entry = byYear.get(year)!;
    entry.flights += 1;
    entry.airports.add(source);
    entry.airports.add(target);
    entry.routes.add(`${source}->${target}`);
  });

  return Array.from(byYear.entries())
    .sort(([yearA], [yearB]) => yearA - yearB)
    .map(([year, value]) => ({
      year: String(year),
      flights: value.flights,
      airports: value.airports.size,
      routes: value.routes.size,
    }));
};
