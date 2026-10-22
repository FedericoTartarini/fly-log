import { getAI, getGenerativeModel, Schema } from "firebase/ai";
import { app, ensureAppCheck } from "../firebaseClient";

export interface ParsedFlight {
  departure_airport_iata: string | null;
  arrival_airport_iata: string | null;
  departure_date: string | null; // YYYY-MM-DD
  departure_time: string | null; // HH:MM or null
  airline_iata: string | null;
  flight_number: string | null;
}

/** Required fields that must be present to consider a flight "complete". */
export const REQUIRED_FIELDS: (keyof ParsedFlight)[] = [
  "departure_airport_iata",
  "arrival_airport_iata",
  "departure_date",
  "airline_iata",
];

const SYSTEM_PROMPT = `You are a flight data extractor. Given a user description of one or more flights, extract every individual flight (leg) and return ONLY a valid JSON object of the form {"flights": [...]}, with the legs in chronological order. Each leg has exactly these fields:
- departure_airport_iata: 3-letter IATA airport code (uppercase) or null
- arrival_airport_iata: 3-letter IATA airport code (uppercase) or null
- departure_date: ISO date string in YYYY-MM-DD format or null. If no year is specified, use the current year (${new Date().getFullYear()}).
- departure_time: 24-hour time string in HH:MM format or null
- airline_iata: 2-letter IATA airline code (uppercase) or null
- flight_number: flight number digits only as a string (e.g. "123"), or null

Rules:
- A trip with stopovers is split into one leg per flight: "Washington to LA to Sydney" is two legs, IAD → LAX and LAX → SYD.
- A return trip is written out as its own legs. If the user only says "returning on <date>", add the reverse route (last arrival → first departure) with the same airline. If they describe the return route, use that route.
- If an airline or date is stated once for a whole journey, apply it to every leg of that journey. If a connection's date is not stated, use the date of the previous leg.
- Never invent flight numbers or times; use null when not stated.

Common airport mappings (not exhaustive):
Sydney → SYD, Melbourne → MEL, Brisbane → BNE, Perth → PER, Adelaide → ADL
Singapore → SIN, London Heathrow → LHR, London Gatwick → LGW, Dubai → DXB
New York JFK → JFK, New York Newark → EWR, Los Angeles → LAX, San Francisco → SFO
Washington Dulles → IAD, Washington Reagan → DCA
Tokyo Narita → NRT, Tokyo Haneda → HND, Paris CDG → CDG, Amsterdam → AMS
Hong Kong → HKG, Bangkok → BKK, Kuala Lumpur → KUL, Jakarta → CGK
Rome Fiumicino → FCO, Madrid → MAD, Barcelona → BCN, Lisbon → LIS

Common airline mappings (not exhaustive):
Qantas → QF, Virgin Australia → VA, Jetstar → JQ
Singapore Airlines → SQ, Emirates → EK, Etihad → EY
British Airways → BA, Lufthansa → LH, Air France → AF, KLM → KL
Delta → DL, United → UA, American → AA, Southwest → WN
Cathay Pacific → CX, Japan Airlines → JL, ANA → NH

Return ONLY the JSON object with no explanation, no markdown, no code fences.`;

const nullableString = () => Schema.string({ nullable: true });

// Constrains Gemini's output to {"flights": [leg, ...]}.
const RESPONSE_SCHEMA = Schema.object({
  properties: {
    flights: Schema.array({
      items: Schema.object({
        properties: {
          departure_airport_iata: nullableString(),
          arrival_airport_iata: nullableString(),
          departure_date: nullableString(),
          departure_time: nullableString(),
          airline_iata: nullableString(),
          flight_number: nullableString(),
        },
      }),
    }),
  },
});

/**
 * Uses Firebase AI (Gemini) to parse a natural-language flight description
 * into one ParsedFlight per leg, in chronological order.
 *
 * Legs with no airport at all are dropped. Other missing fields, including
 * one missing airport, are left null so the user is told and the form asks
 * for them. Throws if no leg is usable.
 */
export async function parseFlightFromText(
  userText: string,
): Promise<ParsedFlight[]> {
  if (!app) {
    throw new Error(
      "Firebase app is not initialized. Check your environment variables.",
    );
  }

  // Validate input
  if (!userText || userText.trim().length === 0) {
    throw new Error(
      "Input is empty or only whitespace for parseFlightFromText",
    );
  }

  // Gemini is the only thing that needs App Check, so it is initialized here
  // rather than at app startup.
  await ensureAppCheck();

  const ai = getAI(app);
  const model = getGenerativeModel(ai, {
    model: "gemini-2.5-flash-lite",
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  let result;
  try {
    result = await model.generateContent(userText);
  } catch (err) {
    console.error("AI generation failed in parseFlightFromText:", err);
    throw new Error(
      `AI generation failed in parseFlightFromText: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  const rawText = result.response.text().trim();

  // Strip markdown code fences if Gemini wraps the response
  const json = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    console.error("Failed to parse AI response JSON:", {
      error: e,
      rawResponse: rawText,
    });
    throw new Error(
      "AI returned an unexpected response. Please try rephrasing your input.",
    );
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("AI returned an invalid response structure.");
  }

  const legs = (parsed as Record<string, unknown>).flights;
  if (!Array.isArray(legs)) {
    throw new Error("AI returned an invalid response structure.");
  }
  // Helper validators / normalizers
  const normalizeIata = (value: unknown, length: number): string | null => {
    if (typeof value !== "string") return null;
    const v = value.trim().toUpperCase();
    const re = new RegExp(`^[A-Z]{${length}}$`);
    return re.test(v) ? v : null;
  };

  const normalizeDate = (value: unknown): string | null => {
    if (typeof value !== "string") return null;
    const s = value.trim();
    // Accept explicit YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    // Fallback: try Date parse and format to YYYY-MM-DD
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return null;
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const normalizeTime = (value: unknown): string | null => {
    if (typeof value !== "string") return null;
    const s = value.trim();
    const m = s.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    const hh = Number(m[1]);
    const mm = Number(m[2]);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
    if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  };

  const normalizeFlightNumber = (value: unknown): string | null => {
    if (typeof value !== "string") return null;
    const s = value.trim();
    const m = s.match(/^(\d+)$/);
    return m?.[1] ?? null;
  };

  const flights = legs
    .filter(
      (leg): leg is Record<string, unknown> =>
        typeof leg === "object" && leg !== null,
    )
    .map(
      (r): ParsedFlight => ({
        departure_airport_iata: normalizeIata(r.departure_airport_iata, 3),
        arrival_airport_iata: normalizeIata(r.arrival_airport_iata, 3),
        departure_date: normalizeDate(r.departure_date),
        departure_time: normalizeTime(r.departure_time),
        airline_iata: normalizeIata(r.airline_iata, 2),
        flight_number: normalizeFlightNumber(r.flight_number),
      }),
    )
    .filter((f) => f.departure_airport_iata || f.arrival_airport_iata);

  if (flights.length === 0) {
    throw new Error(
      "AI could not find any flights with an airport. Please try rephrasing your input.",
    );
  }

  return flights;
}
