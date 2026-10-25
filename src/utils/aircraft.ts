// Aircraft users can pick when adding a flight, and the family each one is
// counted under in the aircraft chart. Names follow AeroDataBox's style
// ("Airbus A330-300", "Boeing 787-9") so a name typed by a user matches the
// name a status check returns. Plain family names ("Airbus A330") are listed
// too, because AeroDataBox doesn't always report the variant.
// Re-engined generations (A320neo, A330neo, 737 MAX, E2) are their own family.
const FAMILIES: Record<string, string[]> = {
  "Airbus A220": ["Airbus A220", "Airbus A220-100", "Airbus A220-300"],
  "Airbus A300": ["Airbus A300", "Airbus A300-600"],
  "Airbus A310": ["Airbus A310"],
  "Airbus A318": ["Airbus A318"],
  "Airbus A319": ["Airbus A319"],
  "Airbus A319neo": ["Airbus A319neo"],
  "Airbus A320": ["Airbus A320", "Airbus A320-200"],
  "Airbus A320neo": ["Airbus A320neo"],
  "Airbus A321": ["Airbus A321", "Airbus A321-200"],
  "Airbus A321neo": ["Airbus A321neo", "Airbus A321LR", "Airbus A321XLR"],
  "Airbus A330": ["Airbus A330", "Airbus A330-200", "Airbus A330-300"],
  "Airbus A330neo": ["Airbus A330neo", "Airbus A330-800", "Airbus A330-900"],
  "Airbus A340": [
    "Airbus A340",
    "Airbus A340-300",
    "Airbus A340-500",
    "Airbus A340-600",
  ],
  "Airbus A350": ["Airbus A350", "Airbus A350-900", "Airbus A350-1000"],
  "Airbus A380": ["Airbus A380", "Airbus A380-800"],
  "ATR 42": ["ATR 42", "ATR 42-500", "ATR 42-600"],
  "ATR 72": ["ATR 72", "ATR 72-500", "ATR 72-600"],
  "Boeing 717": ["Boeing 717", "Boeing 717-200"],
  "Boeing 737": [
    "Boeing 737",
    "Boeing 737-300",
    "Boeing 737-400",
    "Boeing 737-500",
    "Boeing 737-700",
    "Boeing 737-800",
    "Boeing 737-900",
  ],
  "Boeing 737 MAX": [
    "Boeing 737 MAX",
    "Boeing 737 MAX 7",
    "Boeing 737 MAX 8",
    "Boeing 737 MAX 9",
    "Boeing 737 MAX 10",
  ],
  "Boeing 747": ["Boeing 747", "Boeing 747-400", "Boeing 747-8"],
  "Boeing 757": ["Boeing 757", "Boeing 757-200", "Boeing 757-300"],
  "Boeing 767": [
    "Boeing 767",
    "Boeing 767-300",
    "Boeing 767-300ER",
    "Boeing 767-400",
  ],
  "Boeing 777": [
    "Boeing 777",
    "Boeing 777-200",
    "Boeing 777-200ER",
    "Boeing 777-200LR",
    "Boeing 777-300",
    "Boeing 777-300ER",
  ],
  "Boeing 777X": ["Boeing 777-9"],
  "Boeing 787": ["Boeing 787", "Boeing 787-8", "Boeing 787-9", "Boeing 787-10"],
  "Bombardier CRJ": [
    "Bombardier CRJ200",
    "Bombardier CRJ700",
    "Bombardier CRJ900",
    "Bombardier CRJ1000",
  ],
  "De Havilland Canada Dash 8": [
    "De Havilland Canada Dash 8",
    "De Havilland Canada DHC-8-400",
    "Bombardier Dash 8 Q400",
  ],
  "Embraer E170": ["Embraer 170"],
  "Embraer E175": ["Embraer 175"],
  "Embraer E190": ["Embraer 190"],
  "Embraer E195": ["Embraer 195"],
  "Embraer E2": ["Embraer 190-E2", "Embraer 195-E2"],
  "Embraer ERJ145": ["Embraer ERJ145"],
  "Fokker 100": ["Fokker 100"],
  "Saab 340": ["Saab 340"],
};

export const AIRCRAFT_NAMES: string[] = Object.values(FAMILIES)
  .flat()
  .sort((a, b) => a.localeCompare(b));

// Case, spaces and dashes vary between sources ("Airbus A320 NEO",
// "Airbus A320neo", "Embraer E190"), so names are matched on letters and
// digits only, with the "E" of Embraer's marketing names dropped.
const aircraftKey = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/^embraere(?=\d)/, "embraer");

const BY_KEY = new Map<string, { name: string; family: string }>();
Object.entries(FAMILIES).forEach(([family, names]) => {
  names.forEach((name) => BY_KEY.set(aircraftKey(name), { name, family }));
});
// Boeing's official names for the MAX ("Boeing 737-8"), which the dash rule
// would otherwise count with the 737-800. Not offered in the picker.
[7, 8, 9, 10].forEach((n) =>
  BY_KEY.set(aircraftKey(`Boeing 737-${n}`), {
    name: `Boeing 737 MAX ${n}`,
    family: "Boeing 737 MAX",
  }),
);

/** The listed name for `name`, or null when it isn't on the list. */
export const findAircraftName = (name: unknown): string | null =>
  typeof name === "string"
    ? (BY_KEY.get(aircraftKey(name))?.name ?? null)
    : null;

/**
 * The family an aircraft name is counted under. Names not on the list fall
 * back to dropping the variant after the first dash ("Airbus A330-300" ->
 * "Airbus A330"), so new types still group roughly until they are added.
 */
export const aircraftFamily = (name: unknown): string | null => {
  if (typeof name !== "string") return null;
  const listed = BY_KEY.get(aircraftKey(name));
  if (listed) return listed.family;
  const family = name.split("-")[0]!.replace(/\s+/g, " ").trim();
  return family || null;
};
