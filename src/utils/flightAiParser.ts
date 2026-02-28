import { getAI, getGenerativeModel } from "firebase/ai";
import { app } from "../firebaseClient";

export interface ParsedFlight {
  departure_airport_iata: string | null;
  arrival_airport_iata: string | null;
  departure_date: string | null; // YYYY-MM-DD
  departure_time: string | null; // HH:MM or null
  airline_iata: string | null;
  flight_number: string | null;
  // Return flight — only populated when a return leg is mentioned
  return_date: string | null; // YYYY-MM-DD
  return_time: string | null; // HH:MM or null
  return_flight_number: string | null;
}

/** Required fields that must be present to consider a flight "complete". */
export const REQUIRED_FIELDS: (keyof ParsedFlight)[] = [
  "departure_airport_iata",
  "arrival_airport_iata",
  "departure_date",
  "airline_iata",
];

const SYSTEM_PROMPT = `You are a flight data extractor. Given a user description of one or two flights, extract the details and return ONLY a valid JSON object with exactly these fields:
- departure_airport_iata: 3-letter IATA airport code (uppercase) or null
- arrival_airport_iata: 3-letter IATA airport code (uppercase) or null
- departure_date: ISO date string in YYYY-MM-DD format or null. If no year is specified, use the current year (${new Date().getFullYear()}).
- departure_time: 24-hour time string in HH:MM format or null
- airline_iata: 2-letter IATA airline code (uppercase) or null
- flight_number: flight number digits only as a string (e.g. "123"), or null
- return_date: ISO date string YYYY-MM-DD for the return leg, or null if no return is mentioned
- return_time: 24-hour HH:MM time for the return leg, or null
- return_flight_number: flight number digits for the return leg, or null

The return leg is always the reverse route (arrival_airport → departure_airport) with the same airline.

Common airport mappings (not exhaustive):
Sydney → SYD, Melbourne → MEL, Brisbane → BNE, Perth → PER, Adelaide → ADL
Singapore → SIN, London Heathrow → LHR, London Gatwick → LGW, Dubai → DXB
New York JFK → JFK, New York Newark → EWR, Los Angeles → LAX, San Francisco → SFO
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

/**
 * Uses Firebase AI (Gemini) to parse a natural-language flight description
 * into a structured ParsedFlight object.
 */
// Parse natural language into a normalized ParsedFlight object.
export async function parseFlightFromText(
  userText: string,
): Promise<ParsedFlight> {
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

  const ai = getAI(app);
  const model = getGenerativeModel(ai, {
    model: "gemini-2.5-flash-lite",
    systemInstruction: SYSTEM_PROMPT,
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

  const r = parsed as Record<string, unknown>;
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

  const normalized: ParsedFlight = {
    departure_airport_iata: normalizeIata(r.departure_airport_iata, 3),
    arrival_airport_iata: normalizeIata(r.arrival_airport_iata, 3),
    departure_date: normalizeDate(r.departure_date),
    departure_time: normalizeTime(r.departure_time),
    airline_iata: normalizeIata(r.airline_iata, 2),
    flight_number: normalizeFlightNumber(r.flight_number),
    return_date: normalizeDate(r.return_date),
    return_time: normalizeTime(r.return_time),
    return_flight_number: normalizeFlightNumber(r.return_flight_number),
  };

  const missingRequired = REQUIRED_FIELDS.filter(
    (field) => normalized[field] === null,
  );
  if (missingRequired.length > 0) {
    throw new Error(
      `AI response missing required fields: ${missingRequired.join(", ")}`,
    );
  }

  return normalized;
}
