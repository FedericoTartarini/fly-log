// Stores the derived fields (coordinates, distance, flight time, countries,
// airline, co2_kg, enrichment_version) on flight documents saved before the
// app computed them at write time (#41), or with an older ENRICHMENT_VERSION.
// Until it runs, the app enriches those documents on read instead.
//
// It reads every user's flights with the Admin SDK, so it needs Application
// Default Credentials for a Google account with access to the project:
//
//   gcloud auth application-default login
//
// Dry run, the default, which only reads and reports:
//
//   npm run backfill:enrichment
//
// Write the fields:
//
//   npm run backfill:enrichment -- --write
//
// FIREBASE_PROJECT_ID overrides the project (default fly-log-78b66).
import { readFile } from "node:fs/promises";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { buildMaps } from "../src/utils/referenceData.ts";
import {
  deriveFlightFields,
  isEnriched,
} from "../src/utils/flightEnrichment.ts";

const write = process.argv.includes("--write");
const projectId = process.env.FIREBASE_PROJECT_ID ?? "fly-log-78b66";

const readJson = async (name) =>
  JSON.parse(
    await readFile(new URL(`../src/assets/${name}`, import.meta.url), "utf8"),
  );
const maps = buildMaps(
  await readJson("airports.json"),
  await readJson("airlines.json"),
);

initializeApp({ credential: applicationDefault(), projectId });
const db = getFirestore();

// Flights live at flights/{uid}/records/{id}; skip any other "records".
const docs = (await db.collectionGroup("records").get()).docs.filter(
  (d) => d.ref.parent.parent?.parent.id === "flights",
);
const stale = docs.filter((d) => !isEnriched(d.data()));

console.log(
  `${projectId}: ${docs.length} flights, ${stale.length} need enriching.`,
);

if (!write) {
  for (const d of stale.slice(0, 5)) {
    console.log(d.ref.path, deriveFlightFields(d.data(), maps));
  }
  console.log("Dry run, nothing written. Re-run with --write to update.");
} else {
  // A batch holds at most 500 writes.
  for (let i = 0; i < stale.length; i += 450) {
    const batch = db.batch();
    for (const d of stale.slice(i, i + 450)) {
      batch.update(d.ref, deriveFlightFields(d.data(), maps));
    }
    await batch.commit();
    console.log(`Updated ${Math.min(i + 450, stale.length)}/${stale.length}`);
  }
}
