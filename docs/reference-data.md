# Reference data

The app ships three reference datasets. `scripts/refresh-reference-data.mjs`
regenerates all three from their sources. The GitHub Action
`.github/workflows/refresh-reference-data.yml` runs it on 1 January and 1 July
and opens a PR with the changes. You can also run the Action by hand from the
Actions tab.

| File                       | Source                                                                                                                                                                                                   | Licence                                                                                    |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `src/assets/airports.json` | [OurAirports](https://ourairports.com/data/) `airports.csv` and `countries.csv`. City names also use [Wikidata](https://www.wikidata.org/) (see [How city names are chosen](#how-city-names-are-chosen)) | Public domain (OurAirports). CC0 (Wikidata)                                                |
| `src/assets/airlines.json` | Names and IATA codes from [besrourms/airlines](https://github.com/besrourms/airlines). ICAO codes checked against Wikidata (see [How ICAO codes are checked](#how-icao-codes-are-checked))               | Unlicense (besrourms). CC0 (Wikidata). Open Database License (OpenFlights, see below)      |
| `src/assets/logos/`        | [Soaring Symbols](https://github.com/soaring-symbols/soaring-symbols), Wikimedia Commons, and older RadarBox PNGs. `sources.json` records each file (see [Logos](#logos))                                | Trademarks of the airlines. Commons files are public domain or CC. RadarBox has no licence |

Until November 2026 the ICAO codes came from
[OpenFlights](https://openflights.org/data.php) `airlines.dat`, and the codes
that Wikidata confirmed are still the ones OpenFlights gave. The ODbL asks us
to credit OpenFlights, which this page does, and to offer a database derived
from it under the same licence. `airlines.json` is such a database.

The `icon` field in `airlines.json` is a URL that comes with the besrourms
list. The app does not read it. The `logo` field is the file name in
`src/assets/logos/`, or null, and the app shows it.

## Sources compared

Checked on 2026-11-17. "Updated" is the date of the last commit that changed
the data file, from the GitHub API, or "live" for a database people edit
directly.

### Airports

| Source                                                                                                     | Licence                                                                                                                               | Updated            | Fields we need                                                               | Use in an MIT app                                          |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ---------------------------------------------------------------------------- | ---------------------------------------------------------- |
| [OurAirports](https://github.com/davidmegginson/ourairports-data)                                          | [Unlicense](https://github.com/davidmegginson/ourairports-data/blob/main/LICENSE) ("released into the public domain")                 | 2026-11-17 (daily) | IATA, ICAO, name, municipality, country, coordinates, airport size           | Yes, no conditions                                         |
| [Wikidata](https://www.wikidata.org/) via SPARQL                                                           | [CC0](https://www.wikidata.org/wiki/Wikidata:Licensing) for structured data                                                           | Live               | IATA (P238), ICAO (P239), place served (P931), coordinates                   | Yes, no conditions                                         |
| [OpenFlights `airports.dat`](https://github.com/jpatokal/openflights/blob/master/data/airports.dat)        | [ODbL](https://opendatacommons.org/licenses/odbl/1-0/), per [openflights.org/data](https://openflights.org/data.php)                  | 2019-05-13         | IATA, ICAO, name, city ("Main city served by airport"), country, coordinates | Yes, with credit, and derived data must stay ODbL          |
| [mwgg/Airports](https://github.com/mwgg/Airports)                                                          | [MIT](https://github.com/mwgg/Airports/blob/master/LICENSE)                                                                           | 2026-10-01         | IATA, ICAO, name, city, country, coordinates                                 | Yes, but the README does not say where the data comes from |
| [lxndrblz/Airports](https://github.com/lxndrblz/Airports)                                                  | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), per its README                                                       | 2026-10-03         | IATA, ICAO, name, IATA city code, geocoded location (not city served)        | Yes, with credit, and derived data must stay CC BY-SA      |
| [ip2location-iata-icao](https://github.com/ip2location/ip2location-iata-icao)                              | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), per its README                                                       | 2026-10-27         | IATA, ICAO, name, region, coordinates. No city                               | Yes, with credit, and derived data must stay CC BY-SA      |
| [Wikipedia, List of airports by IATA code](https://en.wikipedia.org/wiki/List_of_airports_by_IATA_code:_A) | [CC BY-SA 4.0](https://en.wikipedia.org/wiki/Wikipedia:Text_of_the_Creative_Commons_Attribution-ShareAlike_4.0_International_License) | Live               | IATA, ICAO, name, location served. No coordinates                            | Yes, with credit, and derived data must stay CC BY-SA      |

OurAirports stays the main source. It is the only one that is public domain,
updated daily, and has every field we need, including the airport size we
filter on. Its weak field is the city. Its data dictionary defines
`municipality` as "the primary municipality that the airport serves", but for
many large airports it holds the suburb the airport sits in, such as Sepang
for KUL or Ferno for MXP.

### Airlines

| Source                                                                                              | Licence                                                                | Updated    | Fields we need                                        | Use in an MIT app                                        |
| --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------- | ----------------------------------------------------- | -------------------------------------------------------- |
| [besrourms/airlines](https://github.com/besrourms/airlines)                                         | [Unlicense](https://github.com/BesrourMS/Airlines/blob/master/LICENSE) | 2025-11-07 | IATA, name. No ICAO, no active flag                   | Yes as licensed, but the README names no upstream source |
| [OpenFlights `airlines.dat`](https://github.com/jpatokal/openflights/blob/master/data/airlines.dat) | [ODbL](https://opendatacommons.org/licenses/odbl/1-0/)                 | 2017-02-02 | IATA, ICAO, name, active                              | Yes, with credit, and derived data must stay ODbL        |
| [Wikidata](https://www.wikidata.org/) via SPARQL                                                    | [CC0](https://www.wikidata.org/wiki/Wikidata:Licensing)                | Live       | IATA (P229), ICAO (P230), name, dissolved date (P576) | Yes, no conditions                                       |

Notes on the airline sources:

- besrourms has 1149 airlines and includes some that have stopped flying,
  such as Vanilla Air (JW). Its logo URLs point at `pics.avs.io`. I could not
  find where its names and codes come from, so its Unlicense rests on the
  author's word.
- OpenFlights says its own `Active` field "is not reliable". Its GitHub copy
  is "only a sporadically updated static snapshot". Of its active airlines with
  both codes, 854 rows share 835 IATA codes, so a few codes have two airlines.
- Wikidata had 2903 items with an IATA airline code on 2026-11-17, 2632 of
  them with an ICAO code too, and 1239 with both codes and no dissolution
  date. It is the only current, CC0 source with ICAO codes and an end date.

## Recommendation per field

| Field                       | Source                                      | Evidence                                                                                                                              |
| --------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Airport IATA, name, country | OurAirports                                 | Public domain, updated daily, and the existing app data already uses it                                                               |
| Airport coordinates         | OurAirports                                 | Same. The 2026-11 refresh moved no airport more than 0.5 degrees                                                                      |
| City served                 | OurAirports and Wikidata, by the rule below | Both claim to give the city served. Where they disagree, OpenFlights sides with Wikidata 252 times and with OurAirports 162 times     |
| Airline IATA, name          | besrourms (unchanged)                       | Weak. It is current, but its upstream source is unknown and it has no active flag                                                     |
| Airline ICAO                | Wikidata, by the rule below                 | CC0 and current. OpenFlights is frozen since 2017 and gave 261 airlines the code of another airline that once used the same IATA code |

## How city names are chosen

`cityFor` in the script picks the city for each airport. It uses two sources
that both say they give the city an airport serves: the OurAirports
`municipality`, and the places listed under "place served by transport hub"
(P931) on the airport's Wikidata item. The steps run in order and the first
one that applies wins.

1. A manual entry in `CITY_OVERRIDES`.
2. The OurAirports municipality, if Wikidata lists the same place. Two
   sources agree, so there is nothing to decide.
3. Wikidata's place, if it lists exactly one.
4. Wikidata's most populous place, if it lists several. For FKB (Karlsruhe
   and Baden-Baden), FMO (Münster and Osnabrück), LEJ (Leipzig and Halle)
   and PAD (Paderborn and Lippstadt) this gives the city the airport is named
   after first.
5. The OurAirports municipality.

Before the steps run, the script cleans up two OurAirports habits. It drops
text in brackets at the end ("Sydney (Mascot)" becomes "Sydney", "Olbia (SS)"
becomes "Olbia"). For Britain and France it also drops the text after a comma,
because there OurAirports writes the county or department after the town
("Leeds, West Yorkshire", "Marignane, Bouches-du-Rhône"). In the 2026-11-17
data 72 British and French airports in our filter have a comma in the
municipality, and in all 72 the part after the comma is a county, council
area or department. Two of those areas share a name with a city ("Ingliston,
Edinburgh" for EDI and "Chassieu, Lyon" for LYN), but Wikidata names the city
for both, so step 3 gives Edinburgh and Lyon anyway. Elsewhere the part after a comma can be the city itself ("Pendik,
Istanbul") or part of the name ("Washington, D.C."), so it is left alone.

The Wikidata lookup keeps only what can be checked mechanically:

- It matches the airport item on both IATA (P238) and ICAO (P239) codes, so
  an air base or closed airport that reuses an IATA code is not picked up.
- It keeps only places that Wikidata classes as a human settlement
  (Q486972). P931 also holds countries, provinces, islands and stray values.
  BEL lists the pastry "pastel de nata", and NOC lists a clock.
- In steps 3 and 4 a metropolitan area (Q1907114) only counts if nothing else
  is listed, so IAD gets "Washington, D.C." rather than "Washington
  metropolitan area".
- It uses the English label only. The newer multilingual (`mul`) labels gave
  TIW a sentence in Chichewa, so they are not used.

Why Wikidata comes before the OurAirports municipality in step 3: in the
2026-11-17 data, 535 airports that OpenFlights also lists have one Wikidata
place that differs from the OurAirports municipality. OpenFlights, a third
source, names the Wikidata place for 252 of them, the OurAirports
municipality for 162, and neither for 121. For large airports it is 95, 46
and 29. Names were compared ignoring accents, case and punctuation.

### Manual entries

`CITY_OVERRIDES` holds 31 airports, down from 94 in the first draft of this
PR. An airport gets an entry only when both of these hold:

- the rule's pick is named by just one source, and
- at least two other sources agree on a different place.

The sources counted are the Wikipedia "List of airports by IATA code"
location-served column, OpenFlights' city, the places on the Wikidata item,
the OurAirports municipality, and the IATA city code in lxndrblz/Airports.
Each entry's comment lists which of them back it and what the rule would give
without it. I checked large airports only, against the rule's output on
2026-11-17. Medium airports were not reviewed.

Of the 94 entries in the first draft, the rule now produces 69 by itself.
Eleven more keep their value as manual entries with evidence: CRK, DJE, EIS,
FUE, GJL, GOI, MRS, RMU, SZB, USM and YIW. The other 14 changed:

| Code | First draft           | Now              | Evidence                                                                                                               |
| ---- | --------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------- |
| ADB  | Izmir                 | İzmir            | Wikidata's English label                                                                                               |
| ANU  | St. John's            | Antigua          | Wikipedia and OpenFlights both say Antigua. Wikidata says St. John's but has no English label for it                   |
| BDJ  | Banjarmasin           | Banjarbaru       | OurAirports and Wikidata both list Banjarbaru, where the airport is                                                    |
| BEN  | Benghazi              | Benina           | OurAirports and Wikidata both say Benina. Wikipedia and OpenFlights both say Benghazi. A tie, so the rule's pick stays |
| BVC  | Boa Vista             | Sal Rei          | Wikidata's only settlement. Boa Vista is the island                                                                    |
| CEB  | Cebu                  | Lapu-Lapu        | OurAirports ("Cebu City/Lapu-Lapu City"), Wikidata and Wikipedia all name Lapu-Lapu                                    |
| FEZ  | Fes                   | Fez              | Wikidata's English label                                                                                               |
| FKB  | Karlsruhe/Baden-Baden | Karlsruhe        | Wikidata lists both. Karlsruhe is the more populous                                                                    |
| IAD  | Washington            | Washington, D.C. | Wikidata's English label                                                                                               |
| ILO  | Iloilo                | Iloilo City      | Wikidata's English label                                                                                               |
| KCZ  | Kochi                 | Kōchi            | Wikipedia "Kōchi", OpenFlights "Kochi". Wikidata's label is "Kōchi-shi"                                                |
| OVD  | Asturias              | Oviedo           | Wikipedia and Wikidata both say Oviedo. No source said Asturias, which is the region                                   |
| TPE  | Taipei                | Taoyuan          | OurAirports and Wikipedia say Taoyuan. OpenFlights and the IATA city code say Taipei. A tie, so the rule's pick stays  |
| UTP  | Pattaya               | Rayong           | OurAirports and Wikipedia say Rayong. Only OpenFlights says Pattaya                                                    |

The five airports flagged in review:

- **OVD**: "Oviedo", not "Asturias". Wikipedia's list gives "Oviedo,
  Asturias", and Wikidata's P931 is Oviedo. Asturias is the region and the
  airport's name. OurAirports gives the village Ranón.
- **FUE**: "Fuerteventura". Wikipedia, OpenFlights and Wikidata all give the
  island, which has no single city the airport serves. OurAirports gives El
  Matorral.
- **CRK**: "Angeles City". OpenFlights says Angeles City, and Wikidata lists
  Angeles (no English label) next to Manila. Wikipedia gives "Clark Special
  Economic Zone" and OurAirports gives Mabalacat. The evidence is thin.
- **TPE**: "Taoyuan". The airport is in Taoyuan City. Sources split two
  against two, as shown above, so the rule's pick stands.
- **SZB**: "Kuala Lumpur". Wikipedia, OpenFlights and the IATA city code
  (SZB is grouped under KUL) all say Kuala Lumpur. OurAirports says Subang and
  Wikidata says Subang Jaya, where the airport is.

## How ICAO codes are checked

`checkIcao` in the script checks every airline's ICAO code on every run. It
looks at the Wikidata items that have the airline's IATA code (P229), and
counts only those whose English or multilingual label or alias names the same
airline. Names match when they are equal ignoring accents, case, spaces and
punctuation ("VietjetAir" and "VietJet Air"), or when they have the same words
once generic ones such as "Air" and "Airlines" are dropped ("Royal Brunei" and
"Royal Brunei Airlines"). A name written "X dba Y" is read as both names. The
name check matters because an IATA code passes from a closed airline to a new
one, and OpenFlights often kept the old airline's ICAO code: Bonza (AB) had
Air Berlin's BER, and Toki Air (BV) had Blue Panorama's BPA.

The steps run in order, and the first one that applies wins.

1. **Confirmed**: a same-name item has the airline's code (P230).
2. **Confirmed**: no item has the same name, but an item whose name contains
   all the distinctive words of the airline's name, or the other way round,
   has the airline's code. Both codes and part of the name agree, as for "Air
   Wisconsin Airlines Corporation(AWAC)" (AWI).
3. **Corrected**, or **added** if the airline had no code: the same-name
   items still flying (no P576) give exactly one code between them, or, when
   none is still flying, all the same-name items do.
4. **Removed**, or left empty: no item confirms a code, or the items give
   several. The code is removed rather than guessed.

The first run, on 2026-11-17, checked the 1149 airlines:

| Verdict   | Airlines | Examples                                                                                                                                                                        |
| --------- | -------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Confirmed |      351 | Qantas QFA, Emirates UAE, Delta DAL                                                                                                                                             |
| Corrected |      261 | Lufthansa GEC to DLH (Q9325), Singapore Airlines SQC to SIA (Q32245), VietjetAir RAC to VJC (Q853878), Gulf Air GBA to GFA (Q473231), Norse Atlantic UK Z9H to UBT (Q113213169) |
| Added     |      168 | Avion Express NVD (Q791093)                                                                                                                                                     |
| Removed   |      171 | Lufthansa Systems SA1, Bonza BER (Air Berlin's), AJet VLU (Wikidata gives both THY and TKJ)                                                                                     |
| Empty     |      198 | Airlines that had no code and that Wikidata does not confirm one for                                                                                                            |

GEC is Lufthansa Cargo and SQC is Singapore Airlines Cargo, so the name check
keeps a cargo or regional subsidiary apart from its parent. The Action's PR
lists every corrected, added and removed code with the Wikidata items behind
it.

## Codes that disappear

Codes that disappear from a source stay in the files, so flights logged
against them still show a name and a map position. Federico chose this on
2026-11-15.

Example: Palm Beach International (PBI) was renamed President Donald J. Trump
International Airport. The FAA changed its location identifier to DJT and its
ICAO code to KDJT on 9 July 2026
([AirlineGeeks](https://airlinegeeks.com/2026/07/09/palm-beach-airport-officially-renamed-for-trump/),
[Fox Business](https://www.foxbusiness.com/fox-news-travel/faa-begins-djt-transition-trump-airport-rename-takes-effect)).
Fox Business reports the IATA code was due to change to DJT on 18 August 2026. OurAirports now lists the airport as DJT, so the refresh adds a DJT
record and keeps the old PBI record for flights logged before the change.

The merge also keeps an old value when the source leaves a field empty. On
2026-11-17 no record needed this. No OurAirports name, municipality or
coordinate was empty for an airport we already had. The rule is a guard
against a future gap, not a fix for a case seen so far. ICAO codes are the
exception. The besrourms list has none, so the merge keeps each airline's
current code, and `checkIcao` then confirms, corrects or removes it.

## Updating by hand

```bash
node scripts/refresh-reference-data.mjs
git diff --stat src/assets
```

The script takes two to three minutes, most of it Wikidata queries. It
retries a failed Wikidata query twice, then stops without writing anything.
It prints how many records it added, changed and kept, how many ICAO codes it
confirmed, corrected and removed, and how many airlines have a logo from each
source. Before merging, spot-check a few airports you know in the diff, look
at any airport whose coordinates moved a long way, look at the new and changed
logos, and run `npm run vitest`.

## Logos

`src/assets/logos/` holds one square icon per airline, named by IATA code
(`QF.svg`, `AF.png`), so an airline without an ICAO code can have one too. The
refresh sets each airline's `logo` field in `airlines.json` to the file name,
or to null when there is none, and the app stores it on each flight as
`airline_icon_path`. The flights list, the flight card and the boarding pass
show the file from `/logos/`, and the airline's IATA code when there is no
file. Vite copies the SVG, PNG and JPG files to `dist/logos/`.
`sources.json` stays out of the build.

`sources.json` records, for every file, the IATA code, the source, the source
URL, the licence, the author where a CC licence asks for credit, and the date
it was fetched. A file keeps its date until its content changes.

The script tries three sources in order, and the first one with a logo wins.

1. **[Soaring Symbols](https://github.com/soaring-symbols/soaring-symbols)**,
   the release pinned in `SOARING_SYMBOLS_VERSION` (0.4.1), downloaded from
   npm. It takes `assets/<slug>/icon.svg`, a square icon on a 24 by 24
   viewBox. The catalogue entry must have the airline's IATA code, must not
   have ceased, and must share the name or the ICAO code, so Bonza (AB) does
   not get Air Berlin's icon. Qantas has only `icon-mono.svg`, drawn in
   `currentColor`, so the script paints it in the catalogue's primary colour.
2. **Wikimedia Commons**, through the logo (P154) of the airline's Wikidata
   items that pass the [ICAO name check](#how-icao-codes-are-checked) and are
   still flying. A file counts only when it is a square icon, meaning its
   width divided by its height is between 0.9 and 1.1, and when its Commons
   `License` field starts with `pd` or `cc` (public domain, CC0, CC BY, CC
   BY-SA). The script reads both from the Commons `imageinfo` API. An SVG of
   up to 30 KB is copied as it is, and anything else as a 128 px thumbnail.
3. **RadarBox**: the PNG the app already shipped, kept only when neither
   source above has an icon.

On 2026-11-17, 520 of the 1149 airlines have a logo: 119 from Soaring Symbols,
9 from Commons and 392 from RadarBox. Before, 377 had one, all from RadarBox.
Commons adds few because most airline logos on Commons are wordmarks. Of the
384 P154 files of the airlines, 12 were square, and 11 of those had a free
licence. 254 were more than three times wider than tall.

### Licences and trademarks

An airline's logo is its trademark, whatever the licence of the file.

- **Soaring Symbols.** Its
  [DISCLAIMER](https://github.com/soaring-symbols/soaring-symbols/blob/v0.4.1/DISCLAIMER.md)
  says its MIT licence "covers only the project's source code and catalog
  data", that every mark "is a trademark and, where applicable, a copyrighted work of
  its owner", that the project "grants no license to use them", and that "the
  marks are provided to identify airlines and alliances, for example next to a
  flight in a travel app". That is the use here. The DISCLAIMER also says an
  owner can ask for a mark to be removed, and that the removal comes in the
  next patch release. Raising `SOARING_SYMBOLS_VERSION` therefore also
  removes it here, because the script deletes any logo whose source no longer
  has it.
- **Wikimedia Commons.** Most airline logos there are public domain under
  [PD-textlogo](https://commons.wikimedia.org/wiki/Template:PD-textlogo),
  because they are only text and simple shapes. Many also carry the
  [Trademarked](https://commons.wikimedia.org/wiki/Template:Trademarked)
  template, because a public domain file can still be a trademark (see
  [Commons:Non-copyright restrictions](https://commons.wikimedia.org/wiki/Commons:Non-copyright_restrictions)).
  CC BY and CC BY-SA files ask for credit, which `sources.json` and this page
  give.
- **RadarBox.** The 807 PNGs were added in commit `33f5313` (August 2025)
  with no source. They match the `radarbox_logos` folder of
  [Jxck-S/airline-logos](https://github.com/Jxck-S/airline-logos), which has
  no licence. Only the 389 that 392 airlines still use as a fallback are kept,
  each renamed from its ICAO code to the airline's IATA code. Wikidata gives
  three of those ICAO codes to two airlines each (TOK, GSW and BHA), so three
  files are kept twice. Jambojet (JM) has Kenya Airways' KQA on Wikidata, so
  it shows the Kenya Airways PNG. The other 418,
  for ICAO codes that no airline in `airlines.json` has after the ICAO check,
  were deleted. The refresh never adds a RadarBox logo, it only keeps one.

The 130 SVG wordmarks in `src/assets/airlines_logos/` were deleted. They came
from Soaring Symbols at commit `95a6e9f`, nothing used them, and wordmarks do
not fit the round 36 px logo in the flights list.
