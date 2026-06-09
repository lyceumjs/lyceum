#!/usr/bin/env node
/**
 * Builds example/fixtures/lyceum-demo.h5p (FR-009): official H5P content-type
 * libraries (from the public H5P Hub) + OUR OWN minimal content parameters.
 *
 * This script is for provenance/regeneration ONLY — it touches the network. The
 * smoke run and the dev host never do; they use the committed fixture.
 *
 * Requires: `unzip` and `zip` on PATH. Usage: node example/scripts/build-fixture.mjs
 */
import { execSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HUB_URL = 'https://api.h5p.org/v1/content-types/H5P.MultiChoice';
const here = path.dirname(fileURLToPath(import.meta.url));
const outFile = path.resolve(here, '../fixtures/lyceum-demo.h5p');

// Our own content (CC0): one deterministic multiple-choice question.
const content = {
  question: '<p>Who owns the learning-management domain in a Lyceum integration?</p>\n',
  answers: [
    {
      correct: true,
      text: '<div>Lyceum — the engine owns courses, content and learning records</div>\n',
      tipsAndFeedback: { tip: '', chosenFeedback: '', notChosenFeedback: '' },
    },
    {
      correct: false,
      text: '<div>The host application</div>\n',
      tipsAndFeedback: { tip: '', chosenFeedback: '', notChosenFeedback: '' },
    },
    {
      correct: false,
      text: '<div>The database</div>\n',
      tipsAndFeedback: { tip: '', chosenFeedback: '', notChosenFeedback: '' },
    },
  ],
  behaviour: {
    enableRetry: true,
    enableSolutionsButton: true,
    singlePoint: true,
    randomAnswers: false, // deterministic order (FR-010)
    showSolutionsRequiresInput: true,
    type: 'auto',
    confirmCheckDialog: false,
    confirmRetryDialog: false,
    autoCheck: false,
  },
};

const work = mkdtempSync(path.join(tmpdir(), 'lyceum-fixture-'));
try {
  console.log(`[fixture] downloading official libraries: ${HUB_URL}`);
  const response = await fetch(HUB_URL);
  if (!response.ok) throw new Error(`Hub download failed: HTTP ${response.status}`);
  const hubPackage = path.join(work, 'hub.h5p');
  writeFileSync(hubPackage, Buffer.from(await response.arrayBuffer()));

  const unpacked = path.join(work, 'unpacked');
  mkdirSync(unpacked);
  execSync(`unzip -q ${JSON.stringify(hubPackage)} -d ${JSON.stringify(unpacked)}`);

  // Keep the official libraries + their h5p.json dependency list; replace the
  // third-party demo content (and its image) with our own parameters.
  const h5pJson = JSON.parse(
    execSync(`cat ${JSON.stringify(path.join(unpacked, 'h5p.json'))}`).toString(),
  );
  const metadata = {
    ...h5pJson,
    title: 'Lyceum Demo Quiz',
    license: 'U', // metadata enum; the actual content params are CC0 — see fixtures/README.md
  };
  rmSync(path.join(unpacked, 'content'), { recursive: true, force: true });
  mkdirSync(path.join(unpacked, 'content'));
  writeFileSync(path.join(unpacked, 'h5p.json'), JSON.stringify(metadata));
  writeFileSync(path.join(unpacked, 'content', 'content.json'), JSON.stringify(content));

  mkdirSync(path.dirname(outFile), { recursive: true });
  rmSync(outFile, { force: true });
  // -X drops platform extras for a more reproducible archive.
  execSync(`cd ${JSON.stringify(unpacked)} && zip -q -X -r out.h5p .`);
  copyFileSync(path.join(unpacked, 'out.h5p'), outFile);
  console.log(`[fixture] wrote ${outFile}`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
