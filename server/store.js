import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createSeed } from './seed.js';

const dataDirectory = path.resolve(process.cwd(), 'data');
const dataFile = path.join(dataDirectory, 'area1.json');
let writeQueue = Promise.resolve();

export async function initStore() {
  await fs.mkdir(dataDirectory, { recursive: true });
  let db;
  try {
    db = JSON.parse(await fs.readFile(dataFile, 'utf8'));
  } catch {
    await atomicWrite(createSeed());
    return;
  }
  const defaults = createSeed();
  let changed = false;
  for (const key of ['brandAssets', 'brandTextVersions', 'brandGenerations', 'brandInvitations', 'editorialContents', 'partnerEntries', 'shares', 'downloadEvents', 'hospitalityProperties', 'hospitalityRequests', 'courses', 'courseEnrollments', 'certificates', 'governanceMembers', 'governanceSessions', 'mfaChallenges', 'fundDirectionOptions', 'fundDirectionWindows', 'governancePreferences', 'briefingSessions', 'operationsMembers', 'operationsSessions', 'productCatalog', 'deliveryAddresses', 'serviceEntitlements', 'serviceActivationEvents', 'transparencyProjects', 'logisticsPlans', 'subcontractorLinks']) {
    if (!Array.isArray(db[key])) {
      db[key] = defaults[key];
      changed = true;
    }
  }
  if ((db.meta?.schemaVersion ?? 1) < defaults.meta.schemaVersion) {
    db.meta.schemaVersion = defaults.meta.schemaVersion;
    changed = true;
  }
  if (changed) await atomicWrite(db);
}

export async function readDb() {
  const raw = await fs.readFile(dataFile, 'utf8');
  return JSON.parse(raw);
}

export function updateDb(mutator) {
  const operation = writeQueue.then(async () => {
    const db = await readDb();
    const result = await mutator(db);
    db.meta.updatedAt = new Date().toISOString();
    await atomicWrite(db);
    return result;
  });
  writeQueue = operation.catch(() => undefined);
  return operation;
}

async function atomicWrite(db) {
  const temporary = `${dataFile}.${process.pid}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(db, null, 2)}\n`, 'utf8');
  await fs.rename(temporary, dataFile);
}
