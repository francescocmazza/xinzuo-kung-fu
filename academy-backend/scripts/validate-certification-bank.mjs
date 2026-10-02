import { BASE_CERTIFICATION_BANK } from "../src/certification-bank.js";

function words(value) {
  return String(value || "").trim().split(/\s+/).filter(Boolean).length;
}

function fail(message) {
  throw new Error(message);
}

if (BASE_CERTIFICATION_BANK.length !== 27) {
  fail(`Expected 27 Base certification questions, found ${BASE_CERTIFICATION_BANK.length}`);
}

const ids = new Set();
const concepts = new Set();
const positions = { a: 0, b: 0, c: 0, d: 0 };
const longest = { en: 0, it: 0 };
const shortest = { en: 0, it: 0 };
const weakDistractorTerms = [
  "logo",
  "gift box",
  "packaging",
  "user's email",
  "handle color",
  "blade engraving color",
  "scatola regalo",
  "confezione regalo",
  "email dell'utente",
  "colore del manico",
  "colore dell'incisione",
];

for (const question of BASE_CERTIFICATION_BANK) {
  if (ids.has(question.id)) fail(`Duplicate question id: ${question.id}`);
  ids.add(question.id);
  concepts.add(question.conceptId);

  if (!Array.isArray(question.options) || question.options.length !== 4) {
    fail(`${question.id}: expected exactly four options`);
  }
  const optionIds = question.options.map(option => option.id);
  if (new Set(optionIds).size !== 4 || !optionIds.includes(question.correct)) {
    fail(`${question.id}: invalid option IDs or answer key`);
  }
  positions[question.correct] += 1;

  for (const locale of ["en", "it"]) {
    if (!question.prompt?.[locale]) fail(`${question.id}: missing ${locale} prompt`);
    const lengths = question.options.map(option => words(option[locale]));
    const correctIndex = question.options.findIndex(option => option.id === question.correct);
    const correctLength = lengths[correctIndex];
    const max = Math.max(...lengths);
    const min = Math.min(...lengths);
    if (correctLength === max && lengths.filter(v => v === max).length === 1) longest[locale] += 1;
    if (correctLength === min && lengths.filter(v => v === min).length === 1) shortest[locale] += 1;

    for (const option of question.options) {
      const value = String(option[locale] || "").toLowerCase();
      if (weakDistractorTerms.some(term => value.includes(term))) {
        fail(`${question.id}: implausibly irrelevant ${locale} distractor: ${option[locale]}`);
      }
    }
  }
}

if (concepts.size !== 27) fail(`Expected 27 distinct Base concepts, found ${concepts.size}`);

for (const [id, count] of Object.entries(positions)) {
  const share = count / BASE_CERTIFICATION_BANK.length;
  if (share < 0.15 || share > 0.35) {
    fail(`Correct-option position ${id} is imbalanced: ${count}/27`);
  }
}

for (const locale of ["en", "it"]) {
  if (longest[locale] / BASE_CERTIFICATION_BANK.length > 0.35) {
    fail(`${locale}: correct answer is uniquely longest too often: ${longest[locale]}/27`);
  }
  if (shortest[locale] / BASE_CERTIFICATION_BANK.length > 0.35) {
    fail(`${locale}: correct answer is uniquely shortest too often: ${shortest[locale]}/27`);
  }
}

console.log("Certification bank audit OK", {
  questions: BASE_CERTIFICATION_BANK.length,
  concepts: concepts.size,
  positions,
  longest,
  shortest,
});
