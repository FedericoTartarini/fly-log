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
export async function parseFlightFromText(
  userText: string,
): Promise<ParsedFlight> {
  if (!app) {
    throw new Error(
      "Firebase app is not initialized. Check your environment variables.",
    );
  }

  const ai = getAI(app);
  const model = getGenerativeModel(ai, {
    model: "gemini-2.5-flash-lite",
    systemInstruction: SYSTEM_PROMPT,
  });

  const result = await model.generateContent(userText);
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

  const normalizeIataCode = (value: unknown): string | null => {
    if (typeof value !== "string") return null;
    const normalized = value.trim().toUpperCase();
    return normalized.length > 0 ? normalized : null;
  };

  const normalizeFlightNumber = (value: unknown): string | null => {
    if (typeof value !== "string") return null;
    const digitsOnly = value.replace(/\D/g, "");
    return digitsOnly.length > 0 ? digitsOnly : null;
  };

  return {
    departure_airport_iata: normalizeIataCode(r.departure_airport_iata),
    arrival_airport_iata: normalizeIataCode(r.arrival_airport_iata),
    departure_date:
      typeof r.departure_date === "string" ? r.departure_date : null,
    departure_time:
      typeof r.departure_time === "string" ? r.departure_time : null,
    airline_iata: normalizeIataCode(r.airline_iata),
    flight_number: normalizeFlightNumber(r.flight_number),
    return_date: typeof r.return_date === "string" ? r.return_date : null,
    return_time: typeof r.return_time === "string" ? r.return_time : null,
    return_flight_number: normalizeFlightNumber(r.return_flight_number),
  };
}
