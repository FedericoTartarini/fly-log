import {
  IconPlaneDeparture,
  IconFlag,
  IconPlane,
  IconChartBar,
  IconMedal,
  IconTrophy,
  IconWorld,
  IconRepeat,
  IconMoon,
  IconRocket,
  IconMapPin,
  IconBuildingAirport,
  IconFlame,
} from "@tabler/icons-react";

// Badge id -> tabler icon. Separate from badges.ts so the evaluator stays
// free of UI, and separate from the components so fast refresh keeps working.
export const BADGE_ICONS = {
  first_flight: IconPlaneDeparture,
  border_crossed: IconFlag,
  long_hauler: IconPlane,
  ten_up: IconChartBar,
  half_century: IconMedal,
  century: IconTrophy,
  once_around: IconWorld,
  five_laps: IconRepeat,
  to_the_moon: IconMoon,
  there_and_back: IconRocket,
  globetrotter: IconMapPin,
  terminal_regular: IconBuildingAirport,
  on_a_roll: IconFlame,
};

// Cosmetic look for a badge tile; see BadgeTile.
export const BADGE_STYLES = { PASS: "pass", STAMP: "stamp" } as const;
