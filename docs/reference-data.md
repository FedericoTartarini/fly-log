# Reference data

The app ships three reference datasets. `scripts/refresh-reference-data.mjs`
regenerates the first two from their sources. The GitHub Action
`.github/workflows/refresh-reference-data.yml` runs it on 1 January and 1 July
and opens a PR with the changes. You can also run the Action by hand from the
Actions tab.

| File                       | Source                                                                                                                                                                | Licence                                                    |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `src/assets/airports.json` | [OurAirports](https://ourairports.com/data/) `airports.csv` and `countries.csv`                                                                                       | Public domain                                              |
| `src/assets/airlines.json` | Names and IATA codes from [besrourms/airlines](https://github.com/besrourms/airlines). ICAO codes from [OpenFlights](https://openflights.org/data.php) `airlines.dat` | Unlicense (besrourms). Open Database License (OpenFlights) |
| `src/assets/logos/*.png`   | Not recorded. The PNGs were added in commit `33f5313` (August 2025) with no source                                                                                    | Unknown, so they are not refreshed automatically           |

OpenFlights stopped updating `airlines.dat` in 2017, so new airlines get no
ICAO code and therefore no logo. The ODbL asks us to credit OpenFlights, which
this page does.

The `icon` field in `airlines.json` is a URL that comes with the besrourms
list. The app does not read it.

## What the script does

- Airports: keeps large and medium airports that have an IATA code, the same
  filter as before, so the file stays near its current size.
- City names: OurAirports gives the municipality the airport sits in, such as
  "Sepang" for Kuala Lumpur (KUL). The script removes a trailing bracket
  ("Sydney (Mascot)" becomes "Sydney") and, for Britain and France, a trailing
  county ("Leeds, West Yorkshire" becomes "Leeds"). `CITY_OVERRIDES` in the
  script then sets the served city for airports where the municipality is a
  suburb or a nearby town. Add an entry there when you spot a wrong city.
- Codes that disappear from a source stay in the files, so flights logged
  against them still show a name and a map position. A field that the source
  leaves empty keeps its old value.

## Updating by hand

```bash
node scripts/refresh-reference-data.mjs
git diff --stat src/assets
```

The script prints how many records it added, changed and kept. Before merging,
spot-check a few airports you know in the diff, look at any airport whose
coordinates moved a long way, and run `npm run vitest`.

## Logos

`src/assets/logos/` holds one PNG per airline, named by ICAO code
(`QFA.png`). The app builds the path from the ICAO code in `airlines.json`
(`src/utils/flightService.ts`), and shows a fallback when the file is missing.
To refresh logos we would need a source whose licence allows redistribution.
Airline logos are trademarks, and the common GitHub logo collections carry no
licence, so they are left out of the automated refresh.
