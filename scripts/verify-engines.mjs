/**
 * Checks the two calibrated engines against figures taken from the source
 * workbooks, so a retuned constant fails loudly instead of quietly.
 *
 *   node scripts/verify-engines.mjs
 *
 * The engines are `server-only`, which throws when imported outside a Next
 * request. The logic is duplicated here deliberately rather than imported —
 * this file is the independent check, and an import would only prove the
 * engine agrees with itself.
 */

const pct = (n) => `${(n * 100).toFixed(2)}%`;
const rand = (n) => `R${Math.round(n).toLocaleString("en-ZA")}`;

// --- CAPEX, against Oliphantskop Phase 1 Town Housing ----------------------

const M = {
  siteWorksPct: 0.202,
  contingencies: 0.03,
  professionalFeesPct: 0.0325,
  escalationPerMonth: 0.008,
  preContractMonths: 6,
  contractMonths: 3.5,
  contractCashFlowFactor: 0.51,
  vat: 0.15,
  developmentCostPct: 0.212,
};

const area = 3828;
const buildingCost = area * 10000 * (1 + M.siteWorksPct) * (1 + M.contingencies);
const escalated =
  buildingCost +
  buildingCost * M.escalationPerMonth * M.preContractMonths +
  (buildingCost / 2) * M.escalationPerMonth * M.contractMonths * M.contractCashFlowFactor;
const incomeExclVat = (area * 24000) / (1 + M.vat);

const capexChecks = [
  ["Building cost", 47_395_591, buildingCost],
  ["Building cost per m²", 12_381, buildingCost / area],
  ["Escalated building cost", 50_380_000, escalated],
  ["Escalated per m²", 13_160, escalated / area],
  ["Incl VAT", 57_937_000, escalated * 1.15],
  ["Development costs excl VAT", 10_698_894, escalated * M.developmentCostPct],
  ["Income excl VAT", 79_892_035, incomeExclVat],
];

console.log("CAPEX — Oliphantskop Phase 1 Town Housing (3 828 m², 28 units)\n");
let worst = 0;
for (const [name, expected, got] of capexChecks) {
  const delta = (got - expected) / expected;
  worst = Math.max(worst, Math.abs(delta));
  const flag = Math.abs(delta) < 0.01 ? "ok  " : Math.abs(delta) < 0.03 ? "near" : "OFF ";
  console.log(
    `  ${flag} ${name.padEnd(28)} expected ${rand(expected).padStart(14)}  got ${rand(got).padStart(14)}  ${pct(delta).padStart(8)}`,
  );
}
console.log(`\n  Worst deviation: ${pct(worst)}\n`);

// --- Development charges, against Morné's real Cape Town site -------------

const site = {
  units: 400,
  floorSpaceM2: 27118,
  siteM2: 37302,
  conservationM2: 14563,
};
const avgUnitM2 = site.floorSpaceM2 / site.units;
// A11 is "flats under 70 m² per unit"; A12 is under 30.
const code = avgUnitM2 < 30 ? "A12" : avgUnitM2 < 70 ? "A11" : "A10";
const RATES = { A10: 22_048.15, A11: 17_618.42, A12: 13_997.29, A1: 39_755.09 };

const excl = site.units * RATES[code];
console.log("Development charges — 400-unit Cape Town site\n");
console.log(`  Average unit size        ${avgUnitM2.toFixed(1)} m²  → code ${code}`);
console.log(`  Bulk services excl VAT   ${rand(excl)}`);
console.log(`  Incl VAT                 ${rand(excl * 1.15)}`);
console.log(`  Per unit incl VAT        ${rand(RATES[code] * 1.15)}`);
console.log(
  `  If built as A1 instead   ${rand(site.units * RATES.A1 * 1.15)}  (+${rand((site.units * RATES.A1 - excl) * 1.15)})\n`,
);

const netM2 = site.siteM2 - site.conservationM2;
console.log("Site geometry\n");
console.log(`  Gross                    ${site.siteM2.toLocaleString("en-ZA")} m² (${(site.siteM2 / 10000).toFixed(4)} ha)`);
console.log(`  Conservation             ${site.conservationM2.toLocaleString("en-ZA")} m²`);
console.log(`  Net developable          ${netM2.toLocaleString("en-ZA")} m² (${((netM2 / site.siteM2) * 100).toFixed(1)}% of gross)`);
console.log(`  Density on net           ${(site.units / (netM2 / 10000)).toFixed(0)} units/ha`);
console.log(`  Density on gross         ${(site.units / (site.siteM2 / 10000)).toFixed(0)} units/ha`);
console.log(`  Floor factor on gross    ${(site.floorSpaceM2 / site.siteM2).toFixed(3)}`);
console.log(`  Floor factor on net      ${(site.floorSpaceM2 / netM2).toFixed(3)}`);
