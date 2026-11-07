import fs from "node:fs";
import path from "node:path";

export type CsvRow = Record<string, string>;

export const RAW_DIR = path.join(process.cwd(), "data", "raw");

/** RFC-4180 parser (quoted fields, "" escapes, CRLF/LF, multi-line fields). */
export function parseCsv(text: string): { header: string[]; rows: string[][] } {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const header = (rows.shift() ?? []).map((h) => h.replace(/^﻿/, "").trim());
  return { header, rows: rows.filter((r) => r.some((v) => v.trim())) };
}

/** Load data/raw/<name>.csv as trimmed objects keyed by header. */
export function loadCsv(name: string): CsvRow[] {
  const file = path.join(RAW_DIR, `${name}.csv`);
  if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
  const { header, rows } = parseCsv(fs.readFileSync(file, "utf8"));
  return rows.map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? "").trim()])));
}
