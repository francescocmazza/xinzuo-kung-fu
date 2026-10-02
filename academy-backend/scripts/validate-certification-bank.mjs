import { CERTIFICATION_LEVELS } from "../src/certification-bank.js";

function words(value) {
  return String(value || "").trim().split(/\s+/).filter(Boolean).length;
}

function fail(message) {
  throw new Error(message);
}

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

const globalIds = new Set();
const summaries = {};

for (const [level, config] of Object.entries(CERTIFICATION_LEVELS)) {
  const bank = config.bank;
  if (!Array.isArray(bank) || bank.length !== 27) {
    fail(`${level}: expected 27 certification questions, found ${bank?.length ?? 0}`);
  }

  const concepts = new Set();
  const positions = { a: 0, b: 0, c: 0, d: 0 };
  const longest = { en: 0, it: 0 };
  const shortest = { en: 0, it: 0 };

  for (const question of bank) {
    if (globalIds.has(question.id)) fail(`Duplicate certification question id: ${question.id}`);
    globalIds.add(question.id);
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
        if (!option?.[locale]) fail(`${question.id}: missing ${locale} option text`);
        const value = String(option[locale]).toLowerCase();
        if (weakDistractorTerms.some(term => value.includes(term))) {
          fail(`${question.id}: implausibly irrelevant ${locale} distractor: ${option[locale]}`);
        }
      }
    }
  }

  if (concepts.size !== 27) {
    fail(`${level}: expected 27 distinct concepts, found ${concepts.size}`);
  }

  for (const [id, count] of Object.entries(positions)) {
    const share = count / bank.length;
    if (share < 0.15 || share > 0.35) {
      fail(`${level}: correct-option position ${id} is imbalanced: ${count}/27`);
    }
  }

  for (const locale of ["en", "it"]) {
    if (longest[locale] / bank.length > 0.30) {
      fail(`${level} ${locale}: correct answer is uniquely longest too often: ${longest[locale]}/27`);
    }
    if (shortest[locale] / bank.length > 0.30) {
      fail(`${level} ${locale}: correct answer is uniquely shortest too often: ${shortest[locale]}/27`);
    }
  }

  summaries[level] = {
    questions: bank.length,
    concepts: concepts.size,
    positions,
    longest,
    shortest,
  };
}

console.log("Certification bank audit OK", summaries);
