// Refreshes the bundled airport and airline lists and the airline logos from
// their upstream sources. Run with `node scripts/refresh-reference-data.mjs`.
// Sources, licences and the review steps are in docs/reference-data.md.
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Papa from "papaparse";

const OURAIRPORTS = "https://davidmegginson.github.io/ourairports-data";
const AIRLINES_URL =
  "https://raw.githubusercontent.com/besrourms/airlines/master/airlines.json";

const WIKIDATA_SPARQL = "https://query.wikidata.org/sparql";
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
// Wikidata and Commons block requests without a descriptive User-Agent.
const USER_AGENT =
  "fly-log-reference-data/1.0 (https://github.com/FedericoTartarini/fly-log)";

// The Soaring Symbols release the logos come from. Raise it by hand after
// reading the release notes, since a release can remove a mark at its
// owner's request.
const SOARING_SYMBOLS_VERSION = "0.4.1";

// A Commons logo counts as a square icon when its width divided by its height
// is within this range. Wordmarks are two to six times wider than tall.
const SQUARE_RATIO = [0.9, 1.1];
// Commons SVGs above this size are shipped as a 128 px PNG thumbnail instead.
const MAX_SVG_BYTES = 30_000;
const THUMB_PX = 128;

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

const fetchOk = async (url) => {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res;
};
const fetchText = async (url) => (await fetchOk(url)).text();
const fetchBytes = async (url) =>
  Buffer.from(await (await fetchOk(url)).arrayBuffer());

const parseCsv = (text) =>
  Papa.parse(text, { header: true, skipEmptyLines: true }).data;

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
      "User-Agent": USER_AGENT,
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

// The ICAO code is left empty here. checkIcao fills it in from Wikidata after
// the merge, which keeps the code a record already has until then.
const freshAirlines = async () =>
  JSON.parse(await fetchText(AIRLINES_URL))
    .filter((a) => a.code && a.name)
    .map((a) => ({
      name: a.name,
      icao: null,
      iata: a.code,
      icon: a.logo ?? null,
    }));

// Words that many airline names share, so they say nothing about which
// airline a name belongs to.
const GENERIC_WORDS = new Set(
  (
    "air airline airlines airways aviation lines line ltd limited inc llc sa " +
    "co company corporation the de del transport transportes linhas aereas " +
    "aerea aereo lineas express international jsc pjsc ojsc pt plc"
  ).split(" "),
);
const plain = (s) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
// "X dba Y" names two airlines' worth of name, and text in brackets is
// usually an abbreviation, so both are split off.
const nameParts = (name) =>
  name
    .replace(/\(.*?\)/g, " ")
    .split(/\bdba\b/i)
    .filter((p) => p.trim());
const wordsOf = (part) => [
  ...new Set(
    plain(part)
      .split(/[^a-z0-9]+/)
      .filter((w) => w && !GENERIC_WORDS.has(w)),
  ),
];
const nameKeys = (name) =>
  new Set(
    nameParts(name)
      .flatMap((p) => [
        plain(p).replace(/[^a-z0-9]/g, ""),
        wordsOf(p).sort().join(" "),
      ])
      .filter(Boolean),
  );

// Two names are the same airline when they match ignoring accents, case,
// spaces and punctuation ("VietjetAir", "VietJet Air"), or when they have the
// same words once generic ones are dropped ("Royal Brunei", "Royal Brunei
// Airlines"). "Lufthansa" and "Lufthansa Cargo" are different airlines.
export const sameName = (a, b) => {
  const keys = nameKeys(b);
  return [...nameKeys(a)].some((k) => keys.has(k));
};

// Looser: every distinctive word of one name is in the other ("Air
// Wisconsin Airlines Corporation", "Air Wisconsin").
const overlappingName = (a, b) =>
  nameParts(a).some((p) =>
    nameParts(b).some((q) => {
      const [x, y] = [wordsOf(p), wordsOf(q)];
      const [short, long] = x.length <= y.length ? [x, y] : [y, x];
      return short.length > 0 && short.every((w) => long.includes(w));
    }),
  );

// Checks an airline's ICAO code against the Wikidata items that have its IATA
// code (P229). Only items with the same name count, so the code of an older
// airline that used the same IATA code is not picked up. In order:
// 1. "confirmed": a same-name item has the airline's code (P230).
// 2. "confirmed": no item has the same name, but one with an overlapping name
//    has the airline's code, so both codes and part of the name agree.
// 3. "corrected", or "added" if the airline had no code: the same-name items
//    that are still flying (no P576) have exactly one code between them, or,
//    if none is still flying, all of them do.
// 4. "removed", or "none" if the airline had no code: no item confirms a
//    code, or they give several, so the code is left empty, not guessed.
// items are { id, icao: [...], names: [...], dissolved }. Returns the code,
// the verdict and the ids of the items that decided it.
export const checkIcao = (airline, items) => {
  const named = items.filter((it) =>
    it.names.some((n) => sameName(n, airline.name)),
  );
  const ids = (list) => list.map((it) => it.id);
  const own = airline.icao;
  const confirming = named.filter((it) => it.icao.includes(own));
  if (own && confirming.length)
    return { icao: own, verdict: "confirmed", items: ids(confirming) };
  const overlapping = items.filter(
    (it) =>
      it.icao.includes(own) &&
      it.names.some((n) => overlappingName(n, airline.name)),
  );
  if (own && !named.length && overlapping.length)
    return { icao: own, verdict: "confirmed", items: ids(overlapping) };
  const live = named.filter((it) => !it.dissolved && it.icao.length);
  const deciding = live.length ? live : named.filter((it) => it.icao.length);
  const codes = new Set(deciding.flatMap((it) => it.icao));
  if (codes.size === 1)
    return {
      icao: [...codes][0],
      verdict: own ? "corrected" : "added",
      items: ids(deciding),
    };
  return {
    icao: null,
    verdict: own ? "removed" : "none",
    items: ids(deciding),
  };
};

// Wikidata items with an IATA airline code (P229), grouped by that code, as
// { id, icao, names, dissolved, logos }. names holds the English and
// multilingual labels and aliases, and logos the Commons file names of the
// logo images (P154).
const airlineItems = async () => {
  const rows =
    await sparql(`SELECT ?item ?iata ?icao ?name ?dissolved ?logo WHERE {
    ?item wdt:P229 ?iata .
    OPTIONAL { ?item wdt:P230 ?icao }
    OPTIONAL { ?item wdt:P576 ?dissolved }
    OPTIONAL { ?item wdt:P154 ?logo }
    OPTIONAL {
      ?item rdfs:label|skos:altLabel ?name .
      FILTER(LANG(?name) IN ("en", "mul"))
    }
  }`);
  const byId = new Map();
  for (const b of rows) {
    const id = b.item.value.split("/").pop();
    if (!byId.has(id))
      byId.set(id, {
        id,
        iata: new Set(),
        icao: new Set(),
        names: new Set(),
        dissolved: false,
        logos: new Set(),
      });
    const it = byId.get(id);
    it.iata.add(b.iata.value);
    if (b.icao) it.icao.add(b.icao.value);
    if (b.name) it.names.add(b.name.value);
    if (b.dissolved) it.dissolved = true;
    // The value is a Special:FilePath URL ending in the file name.
    if (b.logo) it.logos.add(decodeURIComponent(b.logo.value.split("/").pop()));
  }
  const byIata = new Map();
  for (const it of byId.values()) {
    const item = {
      ...it,
      icao: [...it.icao],
      names: [...it.names],
      logos: [...it.logos],
    };
    for (const code of it.iata) {
      if (!byIata.has(code)) byIata.set(code, []);
      byIata.get(code).push(item);
    }
  }
  return byIata;
};

// Unpacks the pinned Soaring Symbols release from npm. Its dist/ folder holds
// each airline's files, including marks an airline shares with another one.
const soaringSymbols = async () => {
  const dir = await mkdtemp(join(tmpdir(), "soaring-symbols-"));
  const tgz = join(dir, "package.tgz");
  await writeFile(
    tgz,
    await fetchBytes(
      `https://registry.npmjs.org/soaring-symbols/-/soaring-symbols-${SOARING_SYMBOLS_VERSION}.tgz`,
    ),
  );
  execFileSync("tar", ["xzf", tgz, "-C", dir]);
  const dist = join(dir, "package", "dist");
  const catalog = JSON.parse(
    await readFile(join(dist, "airlines.json"), "utf8"),
  );
  return { dist, catalog };
};

// The square icon Soaring Symbols has for an airline, or null. Its entry must
// have the same IATA code, still fly, and share the name or the ICAO code, so
// Bonza (AB) does not get Air Berlin's icon. A multicolour icon is icon.svg.
// Qantas ships only icon-mono.svg, drawn in currentColor, so it is painted in
// the airline's primary colour from the catalogue.
const soaringIcon = async (airline, { dist, catalog }) => {
  const entry = catalog.find(
    (c) =>
      c.iata === airline.iata &&
      !c.ceased &&
      (sameName(c.name, airline.name) ||
        (airline.icao && c.icao === airline.icao)),
  );
  if (!entry) return null;
  const read = (name) =>
    readFile(join(dist, "assets", entry.slug, name), "utf8").catch(() => null);
  const color = await read("icon.svg");
  const mono = color ? null : await read("icon-mono.svg");
  const primary = entry.branding?.primary_color;
  const svg =
    color ??
    (mono &&
      primary &&
      mono.replace('fill="currentColor"', `fill="${primary}"`));
  if (!svg) return null;
  return {
    data: Buffer.from(svg),
    file: `${airline.iata}.svg`,
    source: `Soaring Symbols ${SOARING_SYMBOLS_VERSION}`,
    url: `https://cdn.jsdelivr.net/npm/soaring-symbols@${SOARING_SYMBOLS_VERSION}/dist/assets/${entry.slug}/${color ? "icon.svg" : "icon-mono.svg"}`,
    licence:
      "Trademark of the airline. No licence granted, see the Soaring Symbols DISCLAIMER.md",
  };
};

// Size, type, URLs and licence of Commons files, by file name, asked 50 at a
// time. thumburl is a thumbnail THUMB_PX wide (a PNG for an SVG), or the
// original if that is smaller. author is the credit a CC licence asks for.
const commonsInfo = async (files) => {
  const info = new Map();
  for (let i = 0; i < files.length; i += 50) {
    const batch = files.slice(i, i + 50);
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      formatversion: "2",
      prop: "imageinfo",
      iiprop: "url|size|mime|extmetadata",
      iiextmetadatafilter: "License|LicenseShortName|Artist",
      iiurlwidth: String(THUMB_PX),
      titles: batch.map((f) => `File:${f}`).join("|"),
    });
    const { query } = await (await fetchOk(`${COMMONS_API}?${params}`)).json();
    const asked = new Map((query.normalized ?? []).map((n) => [n.to, n.from]));
    for (const page of query.pages) {
      const ii = page.imageinfo?.[0];
      if (!ii) continue;
      info.set((asked.get(page.title) ?? page.title).replace(/^File:/, ""), {
        ...ii,
        licence: ii.extmetadata?.License?.value ?? "",
        licenceName: ii.extmetadata?.LicenseShortName?.value ?? "",
        // Artist is HTML, often a link to the uploader.
        author: (ii.extmetadata?.Artist?.value ?? "")
          .replace(/<[^>]*>/g, "")
          .trim(),
      });
    }
  }
  return info;
};

// The first Commons logo of an airline's Wikidata items that is a square icon
// (see SQUARE_RATIO) under a public domain or Creative Commons licence, as
// the Commons `License` field gives it ("pd", "cc0", "cc-by-sa-4.0").
const commonsIcon = async (airline, files, info) => {
  const pick = files
    .map((f) => info.get(f))
    .find(
      (ii) =>
        ii &&
        ii.width / ii.height >= SQUARE_RATIO[0] &&
        ii.width / ii.height <= SQUARE_RATIO[1] &&
        /^(pd|cc)/i.test(ii.licence),
    );
  if (!pick) return null;
  const svg = pick.mime === "image/svg+xml" && pick.size <= MAX_SVG_BYTES;
  const url = svg ? pick.url : pick.thumburl;
  // Thumbnail URLs end in a query string, so the extension comes from the path.
  const ext = svg ? "svg" : new URL(url).pathname.split(".").pop();
  return {
    data: await fetchBytes(url),
    file: `${airline.iata}.${ext}`,
    source: "Wikimedia Commons",
    url: pick.descriptionurl,
    licence: pick.licenceName,
    // Only CC BY and CC BY-SA ask for credit.
    author: /^cc-by/i.test(pick.licence) ? pick.author : undefined,
  };
};

const LOGOS = new URL("../src/assets/logos/", import.meta.url);

// Finds a square logo for every airline, by IATA code: Soaring Symbols first,
// then Commons, then the RadarBox PNG the airline already had. Downloads
// everything before it writes, then replaces the logos folder's contents and
// its sources.json, and sets each airline's `logo` to the file name or null.
// An entry keeps its old fetch date when the file has not changed, so a
// refresh only shows real changes.
const refreshLogos = async (airlines, wikidataByIata) => {
  const today = new Date().toISOString().slice(0, 10);
  const oldSources = JSON.parse(
    await readFile(new URL("sources.json", LOGOS), "utf8").catch(() => "[]"),
  );
  const oldByIata = new Map(oldSources.map((s) => [s.iata, s]));
  const ss = await soaringSymbols();

  const filesOf = (airline) =>
    (wikidataByIata.get(airline.iata) ?? [])
      .filter(
        (it) =>
          !it.dissolved && it.names.some((n) => sameName(n, airline.name)),
      )
      .flatMap((it) => it.logos);
  const found = new Map();
  for (const airline of airlines)
    found.set(airline.iata, await soaringIcon(airline, ss));
  const missing = airlines.filter((a) => !found.get(a.iata));
  const info = await commonsInfo([...new Set(missing.flatMap(filesOf))]);
  for (const airline of missing)
    found.set(airline.iata, await commonsIcon(airline, filesOf(airline), info));

  const sources = [];
  const writes = [];
  for (const airline of [...airlines].sort((a, b) =>
    a.iata.localeCompare(b.iata),
  )) {
    const logo = found.get(airline.iata);
    const old = oldByIata.get(airline.iata);
    let entry = null;
    if (logo) {
      const { data, ...meta } = logo;
      const oldData = old
        ? await readFile(new URL(old.file, LOGOS)).catch(() => null)
        : null;
      const same = old?.file === meta.file && oldData?.equals(data);
      entry = {
        iata: airline.iata,
        ...meta,
        fetched: same ? old.fetched : today,
      };
      writes.push([meta.file, data]);
    } else if (old?.source === "RadarBox") {
      entry = old;
    }
    airline.logo = entry?.file ?? null;
    if (entry) sources.push(entry);
  }

  const keep = new Set([...sources.map((s) => s.file), "sources.json"]);
  for (const file of await readdir(LOGOS))
    if (!keep.has(file)) await rm(new URL(file, LOGOS));
  for (const [file, data] of writes)
    await writeFile(new URL(file, LOGOS), data);
  await writeFile(
    new URL("sources.json", LOGOS),
    JSON.stringify(sources, null, 2) + "\n",
  );
  await rm(join(ss.dist, "..", ".."), { recursive: true });

  const bySource = {};
  for (const s of sources) bySource[s.source] = (bySource[s.source] ?? 0) + 1;
  return { bySource, total: sources.length };
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

  // Every airline's ICAO code is checked against Wikidata on every run.
  const wikidataByIata = await airlineItems();
  const icaoChanges = [];
  const verdicts = {};
  for (const airline of airlines.list) {
    const { icao, verdict, items } = checkIcao(
      airline,
      wikidataByIata.get(airline.iata) ?? [],
    );
    verdicts[verdict] = (verdicts[verdict] ?? 0) + 1;
    if (verdict !== "confirmed" && verdict !== "none")
      icaoChanges.push(
        `- ${airline.iata} ${airline.name}: ${airline.icao ?? "none"} -> ` +
          `${icao ?? "none"} (${verdict}${items.length ? ", " + items.join(" ") : ""})`,
      );
    airline.icao = icao;
  }

  // Logos are written as soon as they are all downloaded, and the lists
  // right after, so a failed download leaves every file as it was.
  const logos = await refreshLogos(airlines.list, wikidataByIata);

  await writeAsset("airports.json", airports.list);
  await writeAsset("airlines.json", airlines.list);
  console.log(report("airports.json", airports));
  console.log(report("airlines.json", airlines));
  console.log(
    `- ICAO codes checked against Wikidata: ` +
      Object.entries(verdicts)
        .map(([v, n]) => `${n} ${v}`)
        .join(", ") +
      ".",
  );
  console.log(
    `- Logos: ${logos.total} airlines have one. ` +
      Object.entries(logos.bySource)
        .map(([s, n]) => `${n} from ${s}`)
        .join(", ") +
      ".",
  );
  if (icaoChanges.length) {
    console.log(
      "\n<details><summary>ICAO changes, with the Wikidata items</summary>\n",
    );
    console.log(icaoChanges.join("\n"));
    console.log("\n</details>");
  }
}
