// Refreshes the bundled airport and airline lists from their upstream sources.
// Run with `node scripts/refresh-reference-data.mjs`. Sources, licences and the
// review steps are in docs/reference-data.md. Airline logos are not refreshed
// here, because their source has no licence that allows redistribution.
import { readFile, writeFile } from "node:fs/promises";
import Papa from "papaparse";

const OURAIRPORTS = "https://davidmegginson.github.io/ourairports-data";
const AIRLINES_URL =
  "https://raw.githubusercontent.com/besrourms/airlines/master/airlines.json";
const OPENFLIGHTS_AIRLINES_URL =
  "https://raw.githubusercontent.com/jpatokal/openflights/master/data/airlines.dat";

const WIKIDATA_SPARQL = "https://query.wikidata.org/sparql";

// Same filter as before: major and regional airports that have an IATA code.
const AIRPORT_TYPES = new Set(["large_airport", "medium_airport"]);

// Large airports where cityFor picks a place that only one source names, while
// at least two other sources agree on a different one. Checked on 2026-11-17.
// Each entry lists the sources that back it:
//   WP X  the "Location served" column of
//         https://en.wikipedia.org/wiki/List_of_airports_by_IATA_code:_X
//   OF    the City column of OpenFlights airports.dat
//         https://github.com/jpatokal/openflights/blob/master/data/airports.dat
//   WD    a place listed under P931 on the airport's Wikidata item, found with
//         https://www.wikidata.org/w/index.php?search=haswbstatement:P238=<IATA>
//   OA    the OurAirports municipality
//   IATA  the IATA metropolitan city code, from the city_code column of
//         https://github.com/lxndrblz/Airports/blob/main/airports.csv
// The comment also says what cityFor gives without the entry. Delete an entry
// once the sources agree, and do not add one without the evidence.
const CITY_OVERRIDES = {
  ANU: "Antigua", // WP A, OF. cityFor: Osbourn (OA).
  BGW: "Baghdad", // WP B, OF, OA. cityFor: Mansour, a district (WD).
  BSL: "Basel", // WP B, WD, OA ("Bâle / Mulhouse"). cityFor: Freiburg im Breisgau.
  BWN: "Bandar Seri Begawan", // WP B, OF, OA. cityFor: Limbang, in Malaysia (WD).
  CRK: "Angeles City", // OF, WD (Angeles). cityFor: Manila (WD, most populous).
  DFW: "Dallas-Fort Worth", // OF, OA. cityFor: Mansfield (WD).
  DJE: "Djerba", // WP D, OF, WD. cityFor: Mellita (OA).
  DNA: "Kadena", // WP D, OF. cityFor: Okinawa (OA).
  ECN: "Nicosia", // WP E, OF. cityFor: Tymbou (OA).
  EIS: "Tortola", // WP E, OF. cityFor: Beef Island (OA).
  FUE: "Fuerteventura", // WP F, OF, WD. cityFor: El Matorral (OA).
  GJL: "Jijel", // WP G, OF, WD. cityFor: Tahir (OA).
  GOI: "Goa", // OF, WD, WP G ("Dabolim, Goa"). cityFor: Vasco da Gama (OA).
  GWD: "Gwadar", // WP G, OF. cityFor: Gurandani (OA).
  HHN: "Hahn", // WP H, OF. cityFor: Frankfurt am Main (OA), 100 km away.
  JAX: "Jacksonville", // OF, OA. cityFor: Jacksonville metropolitan area (WD).
  KCZ: "Kōchi", // WP K, OF ("Kochi"). cityFor: Kōchi-shi (WD).
  MAA: "Chennai", // OA, OF ("Madras", its former name). cityFor: Chennai metropolitan area (WD).
  MJN: "Mahajanga", // OF, OA. cityFor: Beramba (WD).
  MNL: "Manila", // OF, OA ("Manila (Pasay)"). cityFor: Metro Manila (WD).
  MRS: "Marseille", // WP M, OF. cityFor: Marignane (OA).
  MRV: "Mineralnye Vody", // OF, WD, OA ("Mineralnyye Vody"). cityFor: Cherkessk (WD, most populous).
  MZG: "Magong", // WP M, OF ("Makung"). cityFor: Huxi (OA).
  OAK: "Oakland", // OF, OA. cityFor: San Francisco Bay Area (WD).
  OST: "Ostend", // OF, WD, OA ("Oostende"). cityFor: Bruges (WD, most populous).
  OVD: "Oviedo", // WP O, WD. cityFor: Ranón (OA).
  RMU: "Murcia", // WP R, OF. cityFor: Corvera (OA).
  RTB: "Roatán", // WP R, OF ("Roatan"). cityFor: Coxen Hole (OA).
  SZB: "Kuala Lumpur", // WP S, OF, IATA (KUL). cityFor: Subang Jaya (WD).
  USM: "Ko Samui", // WP U, OF, WD. cityFor: Na Thon (OA).
  YIW: "Yiwu", // WP Y, OF, WD. cityFor: Yiwu/Jinhua (OA).
};

// The city an airport serves, from two sources that both claim to give it:
// the OurAirports municipality ("the primary municipality that the airport
// serves") and the settlements Wikidata lists as "place served by transport
// hub" (P931). In order:
// 1. A manual entry in CITY_OVERRIDES.
// 2. The OurAirports municipality, if Wikidata lists it too.
// 3. Wikidata's settlement, if it lists exactly one.
// 4. Wikidata's most populous settlement, if it lists several.
// 5. The OurAirports municipality.
// In steps 3 and 4 a metropolitan area only counts if Wikidata lists nothing
// else, so "Washington, D.C." wins over "Washington metropolitan area".
// OurAirports adds a district or province in brackets ("Sydney (Mascot)",
// "Olbia (SS)"), and in Britain and France a county or department after a
// comma ("Leeds, West Yorkshire"), so those parts are dropped first.
// See docs/reference-data.md for the evidence behind each step.
export const cityFor = (iata, municipality, isoCountry, places = []) => {
  if (CITY_OVERRIDES[iata]) return CITY_OVERRIDES[iata];
  let own = municipality.replace(/\s*\(.*\)\s*$/, "");
  if (isoCountry === "GB" || isoCountry === "FR") own = own.split(",")[0];
  own = own.trim() || municipality;
  let named = places.filter((p) => p.name);
  if (named.some((p) => p.name === own)) return own;
  if (named.some((p) => !p.metro)) named = named.filter((p) => !p.metro);
  if (named.length === 1) return named[0].name;
  const [top] = named.sort((a, b) => b.population - a.population);
  return top?.population ? top.name : own;
};

// Fresh records win, but an empty fresh field never erases a known value.
// Old records whose code is gone from the source stay, so flights logged
// against them still resolve.
export const mergeByIata = (oldList, freshList) => {
  const oldByIata = new Map(oldList.map((r) => [r.iata, r]));
  const freshCodes = new Set(freshList.map((r) => r.iata));
  const stats = { added: 0, changed: 0, unchanged: 0, kept: 0 };
  const merged = freshList.map((fresh) => {
    const old = oldByIata.get(fresh.iata);
    if (!old) {
      stats.added++;
      return fresh;
    }
    const record = { ...fresh };
    for (const [k, v] of Object.entries(old)) {
      if (record[k] === null || record[k] === "" || record[k] === undefined)
        record[k] = v;
    }
    stats[
      JSON.stringify(record) === JSON.stringify(old) ? "unchanged" : "changed"
    ]++;
    return record;
  });
  const kept = oldList.filter((r) => !freshCodes.has(r.iata));
  stats.kept = kept.length;
  return { list: [...merged, ...kept], stats };
};

const fetchText = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.text();
};

const parseCsv = (text, header = true) =>
  Papa.parse(text, { header, skipEmptyLines: true }).data;

const asset = (name) => new URL(`../src/assets/${name}`, import.meta.url);
const readAsset = async (name) =>
  JSON.parse(await readFile(asset(name), "utf8"));
const writeAsset = (name, data) =>
  writeFile(asset(name), JSON.stringify(data, null, 2) + "\n");

const toNumber = (v) => (v === "" || isNaN(Number(v)) ? null : Number(v));

// Wikidata's query service is shared and sometimes slow, so a failed query is
// tried up to three times before the script gives up.
const sparql = async (query, attempt = 1) => {
  try {
    return await sparqlOnce(query);
  } catch (err) {
    if (attempt >= 3) throw err;
    console.warn(`Wikidata query failed (${err.message}), retrying`);
    await new Promise((r) => setTimeout(r, 10_000 * attempt));
    return sparql(query, attempt + 1);
  }
};

const sparqlOnce = async (query) => {
  const res = await fetch(WIKIDATA_SPARQL, {
    method: "POST",
    headers: {
      Accept: "application/sparql-results+json",
      "Content-Type": "application/x-www-form-urlencoded",
      // Wikidata blocks requests without a descriptive User-Agent.
      "User-Agent":
        "fly-log-reference-data/1.0 (https://github.com/FedericoTartarini/fly-log)",
    },
    body: new URLSearchParams({ query }),
  });
  if (!res.ok) throw new Error(`Wikidata: HTTP ${res.status}`);
  // On a timeout Wikidata can send a cut-off body with HTTP 200, which makes
  // the parse fail. sparql() then retries, so nothing half-loaded is used.
  return (await res.json()).results.bindings;
};

// Runs toQuery once per batch of 300 item ids, so no request runs past
// Wikidata's 60-second limit.
const sparqlInBatches = async (ids, toQuery) => {
  const rows = [];
  for (let i = 0; i < ids.length; i += 300) {
    const batch = ids.slice(i, i + 300).map((id) => `<${id}>`);
    rows.push(...(await sparql(toQuery(batch.join(" ")))));
  }
  return rows;
};

// Map of "IATA ICAO" to the places a Wikidata airport item serves (P931), as
// { name, population, metro }. The name is the English label, or "" if there
// is none. Items are matched on both their IATA (P238) and ICAO (P239) codes,
// which skips items that only reuse an IATA code, such as an air base. Only
// places that Wikidata classes as a human settlement (Q486972) are kept, which
// drops countries, provinces, islands and stray values (one airport lists a
// pastry). metro is true for kinds of metropolitan area (Q1907114).
// The lookup is split into small queries, because one query that does all of
// it runs past Wikidata's 60-second limit.
const servedPlaces = async () => {
  const served = await sparql(`SELECT ?iata ?icao ?place WHERE {
    ?airport wdt:P238 ?iata ; wdt:P239 ?icao ; wdt:P931 ?place .
  }`);
  const placeIds = [...new Set(served.map((b) => b.place.value))];
  const placeRows = await sparqlInBatches(
    placeIds,
    (ids) => `SELECT ?place ?class ?name ?population WHERE {
      VALUES ?place { ${ids} }
      ?place wdt:P31 ?class .
      OPTIONAL { ?place wdt:P1082 ?population }
      SERVICE wikibase:label {
        bd:serviceParam wikibase:language "en" . ?place rdfs:label ?name .
      }
    }`,
  );
  const classIds = [...new Set(placeRows.map((b) => b.class.value))];
  const classRows = await sparqlInBatches(
    classIds,
    (ids) => `SELECT ?class ?settlement ?metro WHERE {
      VALUES ?class { ${ids} }
      BIND(EXISTS { ?class wdt:P279* wd:Q486972 } AS ?settlement)
      BIND(EXISTS { ?class wdt:P279* wd:Q1907114 } AS ?metro)
    }`,
  );
  const kind = new Map(
    classRows.map((b) => [
      b.class.value,
      {
        settlement: b.settlement.value === "true",
        metro: b.metro.value === "true",
      },
    ]),
  );

  const place = new Map();
  for (const b of placeRows) {
    const p = place.get(b.place.value) ?? {
      name: "",
      population: 0,
      settlement: false,
      metro: false,
    };
    // The label service falls back to the item id when there is no English name.
    if (!/^Q\d+$/.test(b.name.value)) p.name = b.name.value;
    p.population = Math.max(p.population, Number(b.population?.value ?? 0));
    p.settlement ||= kind.get(b.class.value)?.settlement ?? false;
    p.metro ||= kind.get(b.class.value)?.metro ?? false;
    place.set(b.place.value, p);
  }
  const byAirport = new Map();
  for (const b of served) {
    const p = place.get(b.place.value);
    if (!p?.settlement) continue;
    const key = `${b.iata.value} ${b.icao.value}`;
    if (!byAirport.has(key)) byAirport.set(key, []);
    const { name, population, metro } = p;
    byAirport.get(key).push({ name, population, metro });
  }
  return byAirport;
};

const freshAirports = async () => {
  const [airportsCsv, countriesCsv, served] = await Promise.all([
    fetchText(`${OURAIRPORTS}/airports.csv`),
    fetchText(`${OURAIRPORTS}/countries.csv`),
    servedPlaces(),
  ]);
  const countryName = new Map(
    parseCsv(countriesCsv).map((c) => [c.code, c.name]),
  );
  return parseCsv(airportsCsv)
    .filter((r) => AIRPORT_TYPES.has(r.type) && r.iata_code.trim())
    .map((r) => {
      const iata = r.iata_code.trim();
      const iso = r.iso_country.trim();
      return {
        iata,
        airport_name: r.name.trim(),
        city: cityFor(
          iata,
          r.municipality.trim(),
          iso,
          served.get(`${iata} ${r.icao_code.trim()}`),
        ),
        country: countryName.get(iso) ?? iso,
        lat: toNumber(r.latitude_deg),
        lon: toNumber(r.longitude_deg),
        iso_country: iso,
      };
    });
};

const freshAirlines = async () => {
  const [airlinesJson, openflightsCsv] = await Promise.all([
    fetchText(AIRLINES_URL),
    fetchText(OPENFLIGHTS_AIRLINES_URL),
  ]);
  // OpenFlights columns: id, name, alias, IATA, ICAO, callsign, country, active.
  const icaoByIata = new Map(
    parseCsv(openflightsCsv, false)
      .filter((r) => r[3] && r[3] !== "\\N" && r[4] && r[4] !== "\\N")
      .filter((r) => r[7] === "Y")
      .map((r) => [r[3], r[4]]),
  );
  return JSON.parse(airlinesJson)
    .filter((a) => a.code && a.name)
    .map((a) => ({
      name: a.name,
      icao: icaoByIata.get(a.code) ?? null,
      iata: a.code,
      icon: a.logo ?? null,
    }));
};

const report = (name, { list, stats }) =>
  `- ${name}: ${list.length} records. ${stats.added} added, ${stats.changed} changed, ` +
  `${stats.unchanged} unchanged, ${stats.kept} kept although the source no longer lists them.`;

if (import.meta.main) {
  const airports = mergeByIata(
    await readAsset("airports.json"),
    await freshAirports(),
  );
  // Sorted by code so each refresh diffs cleanly. Kept records get the
  // manual overrides too.
  airports.list.sort((a, b) => a.iata.localeCompare(b.iata));
  airports.list.forEach((a) => (a.city = CITY_OVERRIDES[a.iata] ?? a.city));

  const airlines = mergeByIata(
    await readAsset("airlines.json"),
    await freshAirlines(),
  );

  await writeAsset("airports.json", airports.list);
  await writeAsset("airlines.json", airlines.list);
  console.log(report("airports.json", airports));
  console.log(report("airlines.json", airlines));
}
