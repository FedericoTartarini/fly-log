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

// Same filter as before: major and regional airports that have an IATA code.
const AIRPORT_TYPES = new Set(["large_airport", "medium_airport"]);

// OurAirports gives the municipality the airport sits in, which is often a
// suburb or a nearby town. Users know an airport by the city it serves, so
// these replace the municipality. Only large airports were checked (against
// OpenFlights' city names), so add others here when you spot them.
const CITY_OVERRIDES = {
  ACE: "Arrecife",
  ADB: "Izmir",
  ANU: "St. John's",
  ATH: "Athens",
  BDJ: "Banjarmasin",
  BEN: "Benghazi",
  BGY: "Bergamo",
  BNX: "Banja Luka",
  BRU: "Brussels",
  BVC: "Boa Vista",
  CAY: "Cayenne",
  CCS: "Caracas",
  CEB: "Cebu",
  CGY: "Cagayan de Oro",
  CHQ: "Chania",
  CRK: "Angeles City",
  CXR: "Nha Trang",
  DJE: "Djerba",
  DJJ: "Jayapura",
  DPS: "Denpasar",
  EDI: "Edinburgh",
  EIS: "Tortola",
  ENU: "Enugu",
  FEZ: "Fes",
  FKB: "Karlsruhe/Baden-Baden",
  FMO: "Münster",
  FUE: "Fuerteventura",
  GJL: "Jijel",
  GOI: "Goa",
  GRZ: "Graz",
  HEA: "Herat",
  HNL: "Honolulu",
  IAD: "Washington",
  IAR: "Yaroslavl",
  ILO: "Iloilo",
  ISB: "Islamabad",
  ISL: "Istanbul",
  IST: "Istanbul",
  KBP: "Kyiv",
  KCZ: "Kochi",
  KNO: "Medan",
  KRK: "Kraków",
  KSF: "Kassel",
  KUL: "Kuala Lumpur",
  KUT: "Kutaisi",
  LEJ: "Leipzig",
  LIL: "Lille",
  LIN: "Milan",
  LJU: "Ljubljana",
  LLW: "Lilongwe",
  LXA: "Lhasa",
  LYN: "Lyon",
  LYS: "Lyon",
  MCT: "Muscat",
  MFM: "Macau",
  MPL: "Montpellier",
  MRS: "Marseille",
  MVD: "Montevideo",
  MXP: "Milan",
  NDR: "Nador",
  NGO: "Nagoya",
  NRT: "Tokyo",
  NTL: "Newcastle",
  ORN: "Oran",
  OSR: "Ostrava",
  OTP: "Bucharest",
  OUD: "Oujda",
  OVD: "Asturias",
  PAD: "Paderborn",
  PTY: "Panama City",
  RMU: "Murcia",
  RZE: "Rzeszów",
  SAW: "Istanbul",
  SDJ: "Sendai",
  SHE: "Shenyang",
  SKP: "Skopje",
  SZB: "Kuala Lumpur",
  TIA: "Tirana",
  TLM: "Tlemcen",
  TLS: "Toulouse",
  TPE: "Taipei",
  TRN: "Turin",
  TRS: "Trieste",
  TZL: "Tuzla",
  USM: "Ko Samui",
  UTP: "Pattaya",
  VRN: "Verona",
  VVO: "Vladivostok",
  WMI: "Warsaw",
  XIY: "Xi'an",
  XNN: "Xining",
  YIW: "Yiwu",
  ZAD: "Zadar",
  ZAG: "Zagreb",
};

// "Sydney (Mascot)" -> "Sydney". In Britain and France OurAirports adds the
// county or department after a comma: "Leeds, West Yorkshire" -> "Leeds".
// Elsewhere the part after a comma is often the city ("Pendik, Istanbul"), so
// those are left alone and fixed through CITY_OVERRIDES.
export const cleanCity = (iata, municipality, isoCountry) => {
  if (CITY_OVERRIDES[iata]) return CITY_OVERRIDES[iata];
  let city = municipality.replace(/\s*\(.*\)\s*$/, "");
  if (isoCountry === "GB" || isoCountry === "FR") city = city.split(",")[0];
  return city.trim() || municipality;
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

const freshAirports = async () => {
  const [airportsCsv, countriesCsv] = await Promise.all([
    fetchText(`${OURAIRPORTS}/airports.csv`),
    fetchText(`${OURAIRPORTS}/countries.csv`),
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
        city: cleanCity(iata, r.municipality.trim(), iso),
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
  // Sorted by code so each refresh diffs cleanly. Re-applying the city clean-up
  // to kept records lets a new override reach them too.
  airports.list.sort((a, b) => a.iata.localeCompare(b.iata));
  airports.list.forEach(
    (a) => (a.city = cleanCity(a.iata, a.city, a.iso_country)),
  );

  const airlines = mergeByIata(
    await readAsset("airlines.json"),
    await freshAirlines(),
  );

  await writeAsset("airports.json", airports.list);
  await writeAsset("airlines.json", airlines.list);
  console.log(report("airports.json", airports));
  console.log(report("airlines.json", airlines));
}
