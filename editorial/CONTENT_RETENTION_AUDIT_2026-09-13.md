# Content-retention audit — 2026-09-13

## Purpose

This audit was opened after the practical origin of *The Gongfu of Xinzuo* was found to be missing from the current Preface. The goal is to distinguish three different situations that can otherwise look similar in a later manuscript:

1. useful content accidentally disappearing during a shortening or rewrite;
2. useful content being deliberately moved to a better chapter;
3. material being deliberately removed because it is redundant, obsolete or outside the agreed scope.

The audit compares the manuscript from commit `f4ea7115d2401d71a9ce1c79199ea0cb681a11ef` (24 August 2026, immediately before the first major Preface shortening) with the current manuscript and reviews the high-risk editorial commits whose messages or diffs indicate removal, shortening, condensation, simplification or restructuring. The comparison spans 238 subsequent commits.

## Findings

| Area | Revision / change | Retention finding | Action |
|---|---|---|---|
| Preface — practical origin of the book | `dfa8dd8` — *Shorten and refocus preface on kung fu and technical foundations* (24 Aug) | **Unintended loss found.** The concrete story that the project began as an internal Xinzuo training manual to consolidate distributed know-how, then became a book for everyone because staff and customers ask many of the same questions, was removed. Later Preface rewrites restored a personal explanation of why Xinzuo is the frame of reference but did not restore this practical genesis. | Restored on this branch under **Why I wrote this book**. |
| Opening reading guide and chapter previews | `6ab481f`, `65a6a470`, consolidated in `54b130c` (26 Aug) | Intentional removal of duplicated meta-reading guidance and previews. No technical lesson depended on these passages. | No restoration. |
| Grip and balance section inside cutting techniques | `6ad4131` (25 Aug) | Intentional de-duplication. The detailed handle / hybrid / pinch-grip explanation was replaced by a cross-reference and remains in **Weight and Balance**. | No restoration. |
| Stainless-steel history inside Five Dimensions | `30e447e` (25 Aug) | Intentional de-duplication. The chapter explicitly redirects the historical chromium/passivation discussion to **Alloying Elements**, where the subject remains. | No restoration. |
| Flexible versus rigid blade explanation in Knife Shapes | `64125c7` (30 Aug) | The section was removed from **Knife Shapes**, but its central working rule — geometry determines how easily a blade bends; steel and heat treatment determine how safely it tolerates the bending — is present in **Anatomy of a Kitchen Knife**, including the hard-precision / tougher-working-blade memory aid. | No restoration; content is retained in the earlier foundational chapter. |
| Xinzuo steels “case study” framing | `d2447ed` (26 Aug) | Framing changed from generic case-study language to Xinzuo-centred language. Steel identities, trade-offs, heat-treatment discussion and selection logic remained. | No restoration. |
| Manuscript-wide plain-language pass | `6219841` (2 Sep) | High-volume wording changes, but the reviewed technical chapters keep their concepts, safety boundaries and structure. The commit itself explicitly states that technical meaning, safety qualifications, examples and structure are preserved, and spot checks of the high-deletion chapters confirm the important concepts remain. | No restoration. |
| Musashi-overlap restructuring | PR #44 / merge `72abb643` (4 Sep) | Distinctive tables, taxonomies and exercise sequences were restructured, while the underlying teaching points were retained in book-specific explanations. Review of the affected anatomy, metallurgy, Damascus, cutting and handle-material passages did not reveal another missing core section comparable to the Preface loss. | No restoration. |
| Sharpening simplification | `cc253329` / PR #46 (6 Sep) | **Intentional scope reduction, not an accidental deletion.** The main sharpening guide was deliberately condensed to a beginner method; advanced single-bevel and geometry-correction instruction was replaced with scope warnings. A separate two-level, approximately 30-page guide still exists in draft PR #45 and has never been merged. | Flagged for editorial awareness. Do not silently restore or merge it as part of this audit. |
| Knife-profile removals | several late-August / early-September edits, including flat-cut paring and Viking / utility clean-up | Deliberate catalogue/taxonomy decisions documented in the editorial requirements, not accidental loss. | No restoration. |
| Evidence-led Xinzuo editorial pass | PR #63 / merge `cd1454c` (13 Sep) | Eleven English-source files were revised to replace promotional claims with concrete technical evidence. The substantive differentiators remain: proprietary alloy development, industrial and academic metallurgy collaboration, upstream material involvement, controlled heat treatment, full-Damascus construction, material breadth and ergonomic variety. The practical origin story in the Preface was already absent before this PR. | No rollback. The missing origin story is restored separately on this branch. |

## Conclusion

The audit found **one clear content-retention failure of the same type that triggered this review**: the concrete explanation of why the book was created. It disappeared during the 24 August Preface shortening and was never fully restored.

No second accidental disappearance of a core teaching section was found in the current English source among the high-risk shortening, deletion and restructuring revisions reviewed. The apparent large deletions fall into two different groups:

- material that was moved or de-duplicated while remaining elsewhere in the book;
- material deliberately taken out of the agreed scope, most notably the advanced sharpening material.

The sharpening case should remain visible because it is a genuine scope decision rather than a semantic rewrite: `main` currently contains the beginner-focused path, while draft PR #45 contains the unmerged two-level long-form guide.

## Retention rule for future editorial passes

A passage must never be removed merely because a new outline or shorter rewrite omits it. For every substantial shortening, merge or manuscript-wide rewrite:

1. compare the new text with the immediately preceding substantive revision;
2. identify any deleted explanation that answers **why**, supports safe use, helps product selection or provides a memorable teaching model;
3. record whether that idea is **retained here**, **moved to another named chapter**, or **deliberately removed with a stated reason**;
4. treat a missing disposition as an editorial defect before merge.

The practical origin of the book — **internal Xinzuo training manual → shared technical foundation → book for everyone** — is now a protected Preface idea and should not be treated as disposable chapter-preview or meta-reading material.