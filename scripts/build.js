#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'src');
const EXT_DIR = path.join(ROOT, 'extension');

const PARTS = ['state.js', 'styles.js', 'ai-config.js', 'ai-client.js', 'ui.js'];

function readNorm(filePath) {
  return fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
}

function buildOutputs() {
  const meta = readNorm(path.join(SRC_DIR, 'meta.js')).trimEnd();
  const body = PARTS.map(name => readNorm(path.join(SRC_DIR, name)).replace(/\n+$/, '')).join('\n\n');

  const userscript = [
    meta,
    '',
    '(() => {',
    "  'use strict';",
    body,
    '})();',
    ''
  ].join('\n');

  const extensionCore = [
    '// Auto-generated from src/ by scripts/build.js — do not edit directly.',
    'window.__fuoStartCore = () => {',
    "  'use strict';",
    body,
    '};',
    ''
  ].join('\n');

  return { userscript, extensionCore };
}

function main() {
  const checkOnly = process.argv.includes('--check');
  const { userscript, extensionCore } = buildOutputs();

  const targets = [
    { path: path.join(ROOT, 'fuo-reui.user.js'), content: userscript, label: 'fuo-reui.user.js' },
    { path: path.join(EXT_DIR, 'core.js'), content: extensionCore, label: 'extension/core.js' }
  ];

  if (checkOnly) {
    let ok = true;
    for (const target of targets) {
      if (!fs.existsSync(target.path)) {
        console.error('Missing built file:', target.label);
        ok = false;
        continue;
      }
      const current = readNorm(target.path);
      if (current !== target.content) {
        console.error('Out-of-date built file (run `npm run build`):', target.label);
        ok = false;
      }
    }
    if (!ok) process.exit(1);
    console.log('Build check passed: fuo-reui.user.js and extension/core.js are up to date.');
    return;
  }

  fs.mkdirSync(EXT_DIR, { recursive: true });
  for (const target of targets) {
    fs.writeFileSync(target.path, target.content, 'utf8');
    console.log('Built', target.label, '(' + Buffer.byteLength(target.content, 'utf8') + ' bytes)');
  }
}

main();
