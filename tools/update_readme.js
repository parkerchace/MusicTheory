#!/usr/bin/env node
/**
 * update_readme.js
 * Scans JS modules for structured header comments and regenerates a module overview table
 * between AUTO-GENERATED markers in README.md.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const README_PATH = path.join(ROOT, 'README.md');
const START_MARK = '<!-- AUTO-GENERATED: MODULE TABLE START -->';
const END_MARK = '<!-- AUTO-GENERATED: MODULE TABLE END -->';

function getJsFiles(dir) {
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.js'))
    .filter(f => !f.includes('.old'))
    .filter(f => !f.includes('test-'))
    .filter(f => !f.includes('tmp-'))
    .filter(f => !f.includes('validate-'))
    .map(f => path.join(dir, f));
}

function parseHeader(content) {
  // Grab first JSDoc style block comment
  const match = content.match(/\/\*\*([\s\S]*?)\*\//);
  if (!match) return null;
  const block = match[1];
  const lines = block.split(/\r?\n/).map(l => l.replace(/^\s*\*\s?/, '').trim()).filter(Boolean);
  const data = { module: '', description: '', exports: [], features: [] };
  for (const line of lines) {
    if (line.startsWith('@module ')) data.module = line.replace('@module ', '').trim();
    else if (line.startsWith('@description ')) data.description = line.replace('@description ', '').trim();
    else if (line.startsWith('@exports ')) data.exports.push(line.replace('@exports ', '').trim());
    else if (line.startsWith('@feature ')) data.features.push(line.replace('@feature ', '').trim());
  }
  if (!data.module) return null; // require at least module name
  return data;
}

function extractClasses(content) {
  const classNames = [];
  const regex = /class\s+([A-Za-z0-9_]+)/g;
  let m;
  while ((m = regex.exec(content))) classNames.push(m[1]);
  return [...new Set(classNames)];
}

function buildTable(entries) {
  if (!entries.length) return '\n_No module metadata found. Add JSDoc headers to modules._\n';
  const header = '| Module | Description | Exports | Features | Lines |\n|--------|-------------|---------|----------|-------|';
  const rows = entries.map(e => {
    return `| ${e.module} | ${e.description || ''} | ${e.exports.join('<br>') || e.classes.join('<br>')} | ${e.features.join('<br>')} | ${e.lines} |`;
  });
  return ['','### 🧩 Module Overview (auto-generated)', header, ...rows, ''].join('\n');
}

function main() {
  const jsFiles = getJsFiles(ROOT);
  const entries = [];
  for (const file of jsFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const header = parseHeader(content);
    const lines = content.split(/\r?\n/).length;
    const classes = extractClasses(content);
    if (header) {
      entries.push({ ...header, lines, classes, file: path.basename(file) });
    } else {
      // fallback minimal entry
      entries.push({
        module: path.basename(file),
        description: '',
        exports: [],
        features: [],
        lines,
        classes,
        file: path.basename(file)
      });
    }
  }

  // Sort entries by file name for consistency
  entries.sort((a, b) => a.file.localeCompare(b.file));

  console.log(`Found ${entries.length} modules:`);
  entries.forEach(e => console.log(`  - ${e.module} (${e.lines} lines)`));

  const tableMd = buildTable(entries);
  let readme = fs.readFileSync(README_PATH, 'utf8');
  if (!readme.includes(START_MARK) || !readme.includes(END_MARK)) {
    console.error('README markers not found. Aborting.');
    process.exit(1);
  }
  const newReadme = readme.replace(new RegExp(`${START_MARK}[\\s\\S]*?${END_MARK}`, 'g'), `${START_MARK}\n${tableMd}\n${END_MARK}`);
  if (newReadme === readme) {
    console.log('README unchanged.');
  } else {
    fs.writeFileSync(README_PATH, newReadme, 'utf8');
    console.log('✅ README updated successfully!');
  }
}

if (require.main === module) {
  main();
}

module.exports = { parseHeader, buildTable };
