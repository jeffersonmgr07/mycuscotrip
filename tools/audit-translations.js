#!/usr/bin/env node
/**
 * Translation coverage audit for My Cusco Trip.
 *
 * Checks, for /en/ and /pt/:
 *   1. Dictionary parity — assets/data/ui-translations.json: keys whose en/pt value
 *      is identical to the es value (likely never translated) or empty.
 *   2. Product-catalog parity — for every assets/data/*.json that has i18n mirrors
 *      under assets/data/i18n/{en,pt}/, compares product count and internalCode/id sets
 *      against the Spanish source, and flags price/currency/status mismatches.
 *   3. Hardcoded Spanish in HTML — scans /en/*.html and /pt/*.html (recursively) for a
 *      list of common Spanish-only words appearing in visible text, SKIPPING any line
 *      that carries a data-i18n / data-i18n-label attribute (that text is replaced at
 *      runtime by MyCuscoTripI18n and is not a real bug — see docs/reservation-code-notes.md
 *      pattern used across this codebase). This is a heuristic, not a full HTML parse:
 *      it will miss Spanish spread across multiple lines and can still flag the odd
 *      Spanish/Portuguese cognate (e.g. "reserva", "cancelar"); treat the output as a
 *      prioritized worklist, not a certified zero/nonzero verdict.
 *
 * Usage: node tools/audit-translations.js [repoRoot]
 * Writes: docs/translation-audit-en.md, docs/translation-audit-pt.md,
 *         docs/translation-parity-report.md
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(process.argv[2] || ".");

// Spanish-only words/phrases unlikely to appear in correct EN or PT copy.
// Deliberately excludes es/pt cognates (reserva, reservas, cancelar, número, método...)
// to keep the false-positive rate low.
const SPANISH_MARKERS = [
  "Próximamente", "Consultar precio", "Guardar", "Cerrar modal", "Buscar disponibilidad",
  "Precio final", "Precio por Adulto", "Precio estimado", "Comprar", "Reportes",
  "Comprobante", "Pasajeros", "Fecha del viaje",
  "Saldo pendiente", "Recojo", "Cupos", "Itinerario propuesto", "Enlace privado",
  "Propuesta privada", "Reserva no encontrada", "Ir a Mi Reserva",
  "Validación oficial", "Consultar disponibilidad ", "Cotización", "vitrinas públicas",
  "Se emite voucher", "equipo de reservas", "hora aproximada", "según tu fecha",
  "sujeta a disponibilidad", "sujeto a disponibilidad", "en preparación",
];

const IGNORE_DIRS = new Set(["node_modules", ".git", "backend"]);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith(".html")) out.push(full);
  }
  return out;
}

function scanHtmlForSpanish(lang) {
  const dir = path.join(ROOT, lang);
  if (!fs.existsSync(dir)) return [];
  const files = walk(dir);
  const hits = [];
  for (const file of files) {
    const lines = fs.readFileSync(file, "utf8").split("\n");
    lines.forEach((line, idx) => {
      if (line.includes("data-i18n")) return; // dynamically translated at runtime
      for (const marker of SPANISH_MARKERS) {
        if (line.includes(marker)) {
          hits.push({
            file: path.relative(ROOT, file),
            line: idx + 1,
            marker,
            snippet: line.trim().slice(0, 160),
          });
        }
      }
    });
  }
  return hits;
}

function loadJsonSafe(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (error) {
    return null;
  }
}

function auditDictionary(lang) {
  const dictPath = path.join(ROOT, "assets/data/ui-translations.json");
  const dict = loadJsonSafe(dictPath);
  if (!dict || !dict.es || !dict[lang]) return { missingKeys: [], untranslated: [], empty: [] };

  const es = dict.es;
  const target = dict[lang];
  const missingKeys = [];
  const untranslated = [];
  const empty = [];

  for (const key of Object.keys(es)) {
    if (!(key in target)) {
      missingKeys.push(key);
      continue;
    }
    const esVal = String(es[key] ?? "").trim();
    const targetVal = String(target[key] ?? "").trim();
    if (!targetVal) {
      empty.push(key);
    } else if (esVal && targetVal === esVal && /[a-zA-Z]/.test(esVal)) {
      untranslated.push({ key, value: esVal });
    }
  }
  return { missingKeys, untranslated, empty };
}

function findCatalogFiles() {
  const dataDir = path.join(ROOT, "assets/data");
  return fs
    .readdirSync(dataDir)
    .filter((f) => f.endsWith(".json") && f !== "ui-translations.json")
    .map((f) => f);
}

function productParity() {
  const catalogs = findCatalogFiles();
  const rows = [];
  for (const file of catalogs) {
    const esPath = path.join(ROOT, "assets/data", file);
    const esData = loadJsonSafe(esPath);
    if (!esData || !Array.isArray(esData.products)) continue;

    const esCodes = new Set(esData.products.map((p) => p.internalCode || p.id));

    for (const lang of ["en", "pt"]) {
      const langPath = path.join(ROOT, "assets/data/i18n", lang, file);
      if (!fs.existsSync(langPath)) {
        rows.push({ file, lang, issue: "missing i18n file", detail: langPath });
        continue;
      }
      const langData = loadJsonSafe(langPath);
      if (!langData || !Array.isArray(langData.products)) {
        rows.push({ file, lang, issue: "unreadable / no products array" });
        continue;
      }
      const langCodes = new Set(langData.products.map((p) => p.internalCode || p.id));
      if (langCodes.size !== esCodes.size) {
        rows.push({
          file,
          lang,
          issue: "product count mismatch",
          detail: `es=${esCodes.size} ${lang}=${langCodes.size}`,
        });
      }
      for (const code of esCodes) {
        if (!langCodes.has(code)) {
          rows.push({ file, lang, issue: "missing product", detail: code });
        }
      }

      // Price/currency/status parity per matching product
      const esByCode = new Map(esData.products.map((p) => [p.internalCode || p.id, p]));
      const langByCode = new Map(langData.products.map((p) => [p.internalCode || p.id, p]));
      for (const [code, esProduct] of esByCode) {
        const langProduct = langByCode.get(code);
        if (!langProduct) continue;
        if ((esProduct.priceFrom ?? null) !== (langProduct.priceFrom ?? null)) {
          rows.push({
            file,
            lang,
            issue: "priceFrom mismatch",
            detail: `${code}: es=${esProduct.priceFrom} ${lang}=${langProduct.priceFrom}`,
          });
        }
        if ((esProduct.currency || "") !== (langProduct.currency || "")) {
          rows.push({
            file,
            lang,
            issue: "currency mismatch",
            detail: `${code}: es=${esProduct.currency} ${lang}=${langProduct.currency}`,
          });
        }
        if ((esProduct.status || "") !== (langProduct.status || "")) {
          rows.push({
            file,
            lang,
            issue: "status mismatch",
            detail: `${code}: es=${esProduct.status} ${lang}=${langProduct.status}`,
          });
        }
      }
    }
  }
  return rows;
}

function writeLangReport(lang, hits, dictAudit) {
  const lines = [];
  lines.push(`# Translation audit — ${lang.toUpperCase()}`);
  lines.push("");
  lines.push(`Generated by \`tools/audit-translations.js\`.`);
  lines.push("");
  lines.push("## 1. Hardcoded Spanish found in HTML (heuristic scan, data-i18n lines skipped)");
  lines.push("");
  if (hits.length === 0) {
    lines.push("No hardcoded-Spanish markers found by this heuristic scan.");
  } else {
    lines.push("| File | Line | Marker | Snippet |");
    lines.push("|---|---|---|---|");
    for (const hit of hits) {
      lines.push(`| ${hit.file} | ${hit.line} | ${hit.marker} | \`${hit.snippet.replace(/\|/g, "\\|")}\` |`);
    }
  }
  lines.push("");
  lines.push("## 2. ui-translations.json — keys identical to Spanish (likely untranslated)");
  lines.push("");
  if (dictAudit.untranslated.length === 0) {
    lines.push("None found.");
  } else {
    lines.push("| Key | Value (same in es and " + lang + ") |");
    lines.push("|---|---|");
    for (const { key, value } of dictAudit.untranslated) {
      lines.push(`| ${key} | ${value.replace(/\|/g, "\\|")} |`);
    }
  }
  lines.push("");
  lines.push("## 3. ui-translations.json — empty values");
  lines.push("");
  lines.push(dictAudit.empty.length === 0 ? "None found." : dictAudit.empty.map((k) => `- ${k}`).join("\n"));
  lines.push("");
  lines.push("## 4. ui-translations.json — keys missing entirely");
  lines.push("");
  lines.push(dictAudit.missingKeys.length === 0 ? "None found." : dictAudit.missingKeys.map((k) => `- ${k}`).join("\n"));
  lines.push("");

  fs.writeFileSync(path.join(ROOT, `docs/translation-audit-${lang}.md`), lines.join("\n"));
}

function writeParityReport(rows) {
  const lines = [];
  lines.push("# Translation / catalog parity report");
  lines.push("");
  lines.push("Generated by `tools/audit-translations.js`. Compares each `assets/data/*.json` catalog");
  lines.push("(source of truth: Spanish) against its `assets/data/i18n/{en,pt}/` mirrors: product count,");
  lines.push("internalCode/id parity, and priceFrom/currency/status agreement per product.");
  lines.push("");
  if (rows.length === 0) {
    lines.push("No parity issues found.");
  } else {
    lines.push("| Catalog | Lang | Issue | Detail |");
    lines.push("|---|---|---|---|");
    for (const row of rows) {
      lines.push(`| ${row.file} | ${row.lang} | ${row.issue} | ${row.detail || ""} |`);
    }
  }
  fs.writeFileSync(path.join(ROOT, "docs/translation-parity-report.md"), lines.join("\n"));
}

function main() {
  fs.mkdirSync(path.join(ROOT, "docs"), { recursive: true });

  const enHits = scanHtmlForSpanish("en");
  const ptHits = scanHtmlForSpanish("pt");
  const enDict = auditDictionary("en");
  const ptDict = auditDictionary("pt");
  const parityRows = productParity();

  writeLangReport("en", enHits, enDict);
  writeLangReport("pt", ptHits, ptDict);
  writeParityReport(parityRows);

  console.log(`EN: ${enHits.length} HTML hits, ${enDict.untranslated.length} untranslated dict keys, ${enDict.empty.length} empty, ${enDict.missingKeys.length} missing`);
  console.log(`PT: ${ptHits.length} HTML hits, ${ptDict.untranslated.length} untranslated dict keys, ${ptDict.empty.length} empty, ${ptDict.missingKeys.length} missing`);
  console.log(`Parity issues: ${parityRows.length}`);
  console.log("Reports written to docs/translation-audit-en.md, docs/translation-audit-pt.md, docs/translation-parity-report.md");
}

main();
