#!/usr/bin/env node
/*
 * Reads my AI reading notes from absolute local paths, applies the optional
 * <start_post>/<end_post> filter, parses headers + bullet hierarchy into a
 * tree, and writes src/data/reading.json.
 *
 * Runs as a `prebuild` and `predev` hook. On CI (or anywhere the source
 * files are missing), exits 0 without overwriting the existing JSON — the
 * committed JSON is what gets deployed.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const outPath = path.join(repoRoot, 'src/data/reading.json');

const SOURCES = [
  '/home/jayoo/code/Notes/AI/Research Summary.md',
  '/home/jayoo/code/Notes/AI/Reading List.md',
];

const START_TAG = '<start_post>';
const END_TAG = '<end_post>';

function applyTagFilter(content) {
  const startIdx = content.indexOf(START_TAG);
  if (startIdx === -1) return content;
  const after = startIdx + START_TAG.length;
  const endIdx = content.indexOf(END_TAG, after);
  return endIdx === -1 ? content.slice(after) : content.slice(after, endIdx);
}

function cleanTitle(s) {
  return s
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/[:：]\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function countIndent(indentStr) {
  let depth = 0;
  let i = 0;
  while (i < indentStr.length) {
    if (indentStr[i] === '\t') {
      depth++;
      i++;
    } else if (indentStr.slice(i, i + 4) === '    ') {
      depth++;
      i += 4;
    } else if (indentStr.slice(i, i + 2) === '  ') {
      depth++;
      i += 2;
    } else {
      i++;
    }
  }
  return depth;
}

function parseItem(raw) {
  const linkMatch = raw.match(/^\[([^\]]+)\]\(([^)]+)\)\s*(.*)$/);
  if (linkMatch) {
    return {
      title: linkMatch[1].trim(),
      url: linkMatch[2].trim(),
      note: linkMatch[3].trim(),
      children: [],
    };
  }
  return { title: raw.trim(), url: '', note: '', children: [] };
}

function attachItem(rootItems, stack, item, depth) {
  stack.length = depth;
  if (depth === 0 || stack.length === 0) {
    rootItems.push(item);
  } else {
    const parent = stack[stack.length - 1];
    if (parent) parent.children.push(item);
    else rootItems.push(item);
  }
  stack[depth] = item;
}

function countAllItems(items) {
  let n = 0;
  for (const it of items) {
    n += 1 + countAllItems(it.children);
  }
  return n;
}

function parseFile(content) {
  const filtered = applyTagFilter(content);
  const lines = filtered.split('\n');

  const sections = [];
  let currentSection = null;
  let currentSubsection = null;
  let itemStack = [];

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const title = cleanTitle(headingMatch[2]);
      if (!title) continue;
      if (level === 1) {
        currentSection = { title, items: [], subsections: [] };
        currentSubsection = null;
        itemStack = [];
        sections.push(currentSection);
      } else {
        if (!currentSection) {
          currentSection = { title: 'Other', items: [], subsections: [] };
          sections.push(currentSection);
        }
        currentSubsection = { title, items: [] };
        currentSection.subsections.push(currentSubsection);
        itemStack = [];
      }
      continue;
    }

    const bulletMatch = line.match(/^(\s*)[-*+]\s+(.+)$/);
    if (bulletMatch) {
      const depth = countIndent(bulletMatch[1]);
      const item = parseItem(bulletMatch[2]);
      const target = currentSubsection ?? currentSection;
      if (!target) continue;
      attachItem(target.items, itemStack, item, depth);
    }
  }

  for (const section of sections) {
    let total = countAllItems(section.items);
    for (const sub of section.subsections) {
      sub.count = countAllItems(sub.items);
      total += sub.count;
    }
    section.count = total;
  }

  return sections;
}

function main() {
  const allSections = [];
  let foundAny = false;

  for (const filePath of SOURCES) {
    if (!fs.existsSync(filePath)) {
      console.warn(`[sync-reading] source not found: ${filePath} (skipping)`);
      continue;
    }
    foundAny = true;
    const content = fs.readFileSync(filePath, 'utf8');
    const sections = parseFile(content);
    allSections.push(...sections);
    console.log(
      `[sync-reading] ${path.basename(filePath)}: ${sections.length} top-level sections, ${sections.reduce((a, s) => a + s.count, 0)} items`,
    );
  }

  if (!foundAny) {
    console.warn('[sync-reading] no source files found — keeping existing src/data/reading.json');
    return;
  }

  const output = {
    generatedAt: new Date().toISOString(),
    sections: allSections,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n');
  console.log(`[sync-reading] wrote ${path.relative(repoRoot, outPath)} (${allSections.length} sections, ${allSections.reduce((a, s) => a + s.count, 0)} items)`);
}

main();
