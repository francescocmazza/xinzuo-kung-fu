# Xinzuo Academy

Xinzuo Academy is the interactive staff-training layer built on top of **The Gongfu of Xinzuo** knowledge base.

The book remains the source of truth. Academy content must point back to canonical knowledge-base pages and must not become a second, divergent technical manual.

## Product principles recovered from the original design

- remote, browser-based and free to access;
- three levels: **Base**, **Intermediate**, **Advanced**;
- short learning content followed immediately by a multiple-choice learning question;
- learning questions are formative, not scored;
- a wrong answer shows the reason, lets the learner continue, then re-tests the same concept later with a different question;
- first delayed recovery happens after **4–8 interactions**;
- concepts have mastery states: **weak**, **nearly acquired**, **acquired**;
- macro-topics end with a mini-test that reports results but is not the certification gate;
- the final assessment is pass/fail, with the working rule **80% overall and zero errors on critical knowledge**;
- a failed final assessment triggers remediation before retry;
- progress is tracked by stable `concept_id`, not merely by page completion;
- training must support consultative product advice: understand the customer's work and recommend the best-fit knife rather than teach aggressive selling;
- manager reporting and durable multi-device progress belong to the product architecture.

## v0.1 scope

This branch implements the first functional vertical slice:

1. responsive learner application under `academy/`;
2. full three-level curriculum map;
3. complete first Base module, **Safety & Control**;
4. English and Italian course data with stable IDs;
5. formative question flow with explanation on every answer;
6. delayed remediation/retest after 4–8 interactions;
7. per-concept mastery state;
8. informational mini-test;
9. local browser persistence for the beta;
10. deterministic validation of course/question data and source-page references;
11. GitHub Pages publication hook.

The remaining modules are intentionally present as locked curriculum entries rather than low-quality placeholder lessons.

## Source-of-truth rule

Each teachable concept carries a canonical `source_path` that points into `content/en/`.

The Academy may simplify, sequence and test the knowledge, but technical changes must originate in the English knowledge base first.

## Data model

The localized files `data/course.en.json` and `data/course.it.json` share identical IDs.

Important entities:

- `level.id`
- `module.id`
- `lesson.id`
- `concept_id`
- learning-question `id`
- recovery-question `id`
- mini-test question `id`
- `critical` flag

The validator rejects duplicate IDs, missing source pages, locale structure drift, broken answer keys and inconsistent final-certification rules.

## Adaptive learning state

The browser beta stores:

- completed lesson/question IDs;
- interaction counter;
- concept attempts and correct answers;
- current mastery state;
- next delayed-review interaction;
- mini-test attempts/results.

When a learner misses a learning question, the concept becomes `weak`. A different recovery question is scheduled 4–8 interactions later. A successful recovery moves the concept to `nearly_acquired`; a later successful verification can move it to `acquired`.

This is deliberately concept-based so the same logic can later be moved from local storage to a server without changing the course content.

## Planned production persistence

The architecture recovered from the original design is:

```text
GitHub knowledge base
        ↓
Academy curriculum + question bank
        ↓
adaptive learning engine
        ↓
progress service
        ↓
staff dashboard / manager dashboard
```

For the shared production service, the intended low-cost stack remains **Cloudflare Pages/Workers + D1**. The beta does not require that backend yet: it proves the learning model first and avoids coupling content authoring to authentication/database work.

The server phase should persist at minimum:

- learner;
- role/team;
- concept mastery;
- attempts;
- due reviews;
- module/level completion;
- final assessment attempts;
- certification state;
- source/course revision used for each assessment.

## Certification rule

The final-certification contract is already fixed in course metadata:

- minimum score: 80%;
- critical knowledge errors allowed: 0;
- failure requires remediation before retry.

v0.1 does **not** expose a fake final certificate because only one module has a production-quality question bank. Certification is unlocked only when the required modules and final bank exist.

## No gamification by default

Progress and mastery are visible. Leaderboards, points, streak pressure and decorative badges are intentionally absent until there is a real training reason to add them.
