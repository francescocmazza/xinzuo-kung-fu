# Xinzuo Academy

Xinzuo Academy is the interactive learning layer built on **The Gongfu of Xinzuo** knowledge base.

The English book remains the technical source of truth. Academy content simplifies, sequences and tests that knowledge; technical changes must originate in the book first.

## Curriculum v0.2

The Academy uses the same nine knowledge domains at every level so that **Base, Intermediate and Advanced differ mainly by depth of competence, not by topic**:

1. Knife System & Construction
2. Steel Performance Foundations
3. Metallurgy, Heat Treatment & Steels
4. Damascus & Blade Construction
5. Geometry & Bevels
6. Knife Types, Balance & Ergonomics
7. Cutting Technique & Safe Use
8. Maintenance & Cutting Boards
9. Sharpening Foundations & Diagnosis

The levels deliberately ask for different kinds of thinking:

- **Base** — recognize terminology, understand essential mechanisms and make safe everyday choices. It contains 27 lessons: three in every domain.
- **Intermediate** — apply the same knowledge to realistic trade-offs, cause-and-effect relationships and user needs.
- **Advanced** — diagnose conflicting evidence, connect multiple variables and justify a technically defensible decision.

All three levels are active in both English and Italian.

## Question design

Every active lesson contains a learning question and two delayed-review variants. Every module ends with an informational mini-test.

Question banks are validated to prevent obvious answer shortcuts:

- exactly four options;
- balanced correct-answer positions across A–D;
- the correct answer may not be the uniquely longest or shortest option too often across the bank;
- Intermediate and Advanced concepts must use multiple genuinely different scenarios and answer sets;
- higher-level and certification banks reject obviously irrelevant distractors that turn questions into guessing exercises;
- answer order is shuffled in the browser;
- the server also shuffles final-assessment options;
- explanations are shown after formative answers.

Correctness must therefore come from the content rather than from option position or answer length.

## Italian translation policy

`course.en.json` is the Academy source of truth. `course.it.json` is reviewed through the current **ChatGPT differential translation workflow**, using the same Italian terminology guidance as the book.

The Academy translation validator rejects stale Italian content, missing current ChatGPT provenance, legacy Marian/OPUS-MT output, forbidden terminology patterns, and structural drift between English and Italian.

The current workflow is `scripts/chatgpt_translate_academy.py` and is integrated into the existing **Prepare ChatGPT translation queue** Action.

## Final Base assessment

The Base final assessment:

- can be attempted **at any time**, even before lessons or mini-tests are complete;
- can be retried without a mandatory module-completion gate;
- covers all 27 Base concepts across all nine domains;
- requires **80% overall** and **zero critical-knowledge errors** to pass;
- keeps correct answers server-side;
- issues the Base certificate automatically after a pass.

Course completion is recommended preparation, not an access prerequisite.

## Adaptive learning

Progress is concept-based. A wrong formative answer marks a concept for delayed review. Successful later checks move the concept through `weak`, `nearly_acquired` and `acquired` states.

English and Italian share stable lesson, concept and assessment IDs, so changing course language does not create separate progress.

## Production architecture

GitHub knowledge base → bilingual Academy curriculum → adaptive learning engine → Cloudflare Worker + D1 → learner / manager / certificate views.

The Academy is published separately to GitHub Pages so Academy-only changes do not create a new book/PDF revision.
