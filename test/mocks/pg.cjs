"use strict";

/**
 * In-memory mock for the `pg` module.
 * Used when USE_MOCK_PROVIDER=1 so postgresql-storage tests can run
 * without a real Postgres database.
 *
 * Supports the subset of SQL used by SqlProvider:
 *   CREATE TABLE, INSERT, SELECT, UPDATE, DELETE
 */

// Shared table storage across all MockPool instances within one test file.
// Each test file gets its own module scope via Vitest isolation.
const tables = new Map();

function parseTableName(sql) {
  // Try quoted identifier first (handles spaces, dots, etc.)
  const quoted = sql.match(
    /(?:FROM|INTO|UPDATE|TABLE)\s+(?:IF\s+NOT\s+EXISTS\s+)?"([^"]+)"/i
  );
  if (quoted) return quoted[1];
  // Fallback to unquoted identifier
  const unquoted = sql.match(
    /(?:FROM|INTO|UPDATE|TABLE)\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i
  );
  return unquoted ? unquoted[1] : null;
}

function ensureTable(name) {
  if (!tables.has(name)) {
    tables.set(name, { rows: [], serial: 0 });
  }
  return tables.get(name);
}

// pg parses TIMESTAMPTZ as Date and JSON as object; mirror that for stored values
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
function coercePgValue(v) {
  if (v === undefined) return null;
  if (typeof v === "string" && ISO_DATE_RE.test(v)) return new Date(v);
  if (typeof v === "string" && (v.startsWith("[") || v.startsWith("{"))) {
    try {
      return JSON.parse(v);
    } catch {}
  }
  return v;
}

class MockPool {
  constructor() {}

  async query(text, params) {
    params = params || [];
    const sql = text.trim();

    // CREATE TABLE
    if (/^CREATE\s+TABLE/i.test(sql)) {
      const name = parseTableName(sql);
      if (name) ensureTable(name);
      return { rows: [], rowCount: 0 };
    }

    // INSERT
    if (/^INSERT/i.test(sql)) {
      const name = parseTableName(sql);
      const table = ensureTable(name);
      table.serial++;

      const colMatch = sql.match(/\(([^)]+)\)\s*VALUES/i);
      const cols = colMatch ? colMatch[1].split(",").map((c) => c.trim()) : [];

      const row = { id: table.serial };
      cols.forEach((col, i) => {
        row[col] = coercePgValue(params[i]);
      });
      table.rows.push(row);

      const returning = /RETURNING\s+\*/i.test(sql);
      return { rows: returning ? [{ ...row }] : [], rowCount: 1 };
    }

    // SELECT
    if (/^SELECT/i.test(sql)) {
      const name = parseTableName(sql);
      const table = ensureTable(name);

      const whereMatch = sql.match(/WHERE\s+(\w+)\s*=\s*\$(\d+)/i);
      if (whereMatch) {
        const col = whereMatch[1];
        const idx = parseInt(whereMatch[2]) - 1;
        const val = params[idx];
        const rows = table.rows.filter((r) => String(r[col]) === String(val));
        return { rows: rows.map((r) => ({ ...r })), rowCount: rows.length };
      }

      return {
        rows: table.rows.map((r) => ({ ...r })),
        rowCount: table.rows.length,
      };
    }

    // UPDATE
    if (/^UPDATE/i.test(sql)) {
      const name = parseTableName(sql);
      const table = ensureTable(name);

      const setMatch = sql.match(/SET\s+(.+?)\s+WHERE/i);
      const whereMatch = sql.match(/WHERE\s+(\w+)\s*=\s*\$(\d+)/i);

      if (setMatch && whereMatch) {
        const setClauses = setMatch[1]
          .split(",")
          .map((s) => {
            const m = s.trim().match(/(\w+)\s*=\s*\$(\d+)/);
            return m ? { col: m[1], idx: parseInt(m[2]) - 1 } : null;
          })
          .filter(Boolean);

        const whereCol = whereMatch[1];
        const whereIdx = parseInt(whereMatch[2]) - 1;
        const whereVal = params[whereIdx];

        let count = 0;
        table.rows.forEach((row) => {
          if (String(row[whereCol]) === String(whereVal)) {
            setClauses.forEach(({ col, idx }) => {
              row[col] = coercePgValue(params[idx]);
            });
            count++;
          }
        });
        return { rows: [], rowCount: count };
      }
      return { rows: [], rowCount: 0 };
    }

    // DELETE
    if (/^DELETE/i.test(sql)) {
      const name = parseTableName(sql);
      const table = ensureTable(name);

      const whereMatch = sql.match(/WHERE\s+(\w+)\s*=\s*\$(\d+)/i);
      if (whereMatch) {
        const col = whereMatch[1];
        const idx = parseInt(whereMatch[2]) - 1;
        const val = params[idx];
        const before = table.rows.length;
        table.rows = table.rows.filter((r) => String(r[col]) !== String(val));
        return { rows: [], rowCount: before - table.rows.length };
      }

      const count = table.rows.length;
      table.rows = [];
      return { rows: [], rowCount: count };
    }

    return { rows: [], rowCount: 0 };
  }

  async end() {}
}

module.exports = { Pool: MockPool };
