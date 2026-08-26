# Current Editorial Decisions

**Status:** authoritative editorial constraints for the current English source text  
**Last reviewed:** 2026-08-26

This file records decisions that have already been made during editorial review so that later edits, older branches, catalog material or automated rewriting do not silently reintroduce material that was explicitly removed. Before changing `content/en/`, contributors should check this file together with `CONTRIBUTING.md`.

## Preface and opening

- The Preface must remain concise enough to fit on **one printed page** in the normal PDF layout.
- Its function is limited to the meaning of *gongfu*, the purpose of the book, the provenance and limits of the knowledge presented, and the GitHub/collaboration note.
- The Preface must **not** preview the parts, chapters or subjects of the book in detail.
- The opening/index must remain brief and must not become a second Preface or a summary of the chapters.
- Do **not** recommend a non-linear reading strategy, skipping between sections, an alternative reading order, or a prescribed path through the book.
- Do **not** reintroduce headings such as `How to use this book` or `Read the book as one developing argument`.
- The sentence `The lessons are wider than any catalogue: they apply to kitchen knives in general.` was explicitly removed and must not return.

## Structure and repetition

- A complete explanation belongs **once**, in the chapter where it is most useful. Elsewhere, use a brief reminder or cross-reference rather than teaching the same subject again.
- The book should read as continuous prose, not as a collection of knowledge-base cards or repeated mini-summaries.
- Do not duplicate the complete sharpening procedure across the bevel, burr, maintenance and sharpening chapters.
  - `single-and-double-bevels.md` owns bevel geometry, steering, handedness and geometric consequences.
  - `the-burr.md` owns the concept and diagnostic meaning of the burr.
  - `basic-sharpening-process.md` owns the complete practical sharpening and deburring procedure.
  - `routine-care.md` owns ordinary maintenance between sharpenings.
- Do not repeat the full explanation of round-tip nakiri geometry in the cutting-technique chapter: Knife Shapes explains **why** the form works; Cutting Techniques explains **how** to perform the movement.
- Do not repeat the mechanism of single-bevel handedness in the cutting-technique chapter: the bevel chapter explains the mechanism; the technique chapter explains the practical adaptation.
- Avoid end-of-section `What to remember` or `Practice principle` blocks when they merely repeat the preceding paragraphs.
- Avoid unnecessary headings that label an aside such as a historical connection, practical message or memory aid when the material belongs naturally in the prose.
- Single-bevel explanations should be discursive and explanatory rather than written as a question-and-answer sequence.

## Knife shapes and images

- `Knife Shapes and Their Uses` remains one of the first principal sections of the book.
- Each represented knife form should use one clear, complete, authorized Xinzuo product image adjacent to its explanation, with consistent visual orientation and without clipped or damaged blades.
- The **curved paring knife** uses **Xinzuo B9H-SG**.
- The **straight paring knife** uses **Xinzuo B1Z-SG**.
- There is **no flat-cut/flat-blade paring category** in the book. Do not reintroduce it, including as a sentence explaining why it was excluded.
- `Ultimate Utility Knife` was removed and must not return as a knife form.
- Granton-style hollows, dimples and hammered finishes are **surface features**, not autonomous knife shapes.
- Honesuki coverage must include its stiff triangular geometry, poultry use and selected fish-filleting/seam work, and must distinguish it from a long flexible Western fillet knife.
- The discussion of flexible versus rigid blades must not claim that hardness itself creates ordinary elastic flexibility; geometry, especially thickness, is the dominant factor.
- Fillet Knife and Carving Knife remain distinct forms.
- For image selection, Roast Carving uses the approved B37S-10QR reference and Classic Carving should use the clearest approved Xinzuo carving image.

## Weight, balance and ergonomics

- Explain the three practical grip positions clearly: **handle grip**, **intermediate/hybrid grip**, and **pinch grip**.
- Explain that moving the hand changes the balance experienced by the user.
- A handle that looks long behind the hand can be functionally important as counterweight, especially on blade-forward knives and with advanced grips.
- Specifications and photographs cannot reliably predict ergonomics or cutting feel. Knives with very similar dimensions and specifications can feel significantly different once held and used.
- When possible, physically trying the knife remains the best way to choose between otherwise plausible options; the comparison with choosing shoes by fit is acceptable.
- Do not equate a Santoku's fuller front with a simple claim that a heavier knife creates more cutting force. Distinguish local front mass and inertia from total knife weight, while preserving the importance of edge geometry and sharpness.

## Metallurgy and terminology

- Carbon dissolved in iron must not simply be called an `inclusion`. Explain carbon primarily as an **interstitial** solute occupying spaces in the iron crystal lattice, while allowing for carbides and other phases where relevant.
- For the educational example, **0.5% carbon by mass corresponds approximately to one carbon atom for every 43 iron atoms**, not one atom in 200.
- Use **toughness** as the technical materials term; `robustness` may be used only as ordinary explanatory language where appropriate.
- Powder metallurgy must not be described as if loose powder remains in the finished blade.
- Moderate hardness does not automatically make a steel easy to sharpen. DIN 1.4116 should not be reduced to `easy to sharpen`; Blue Steel No. 2 can sharpen very readily despite substantially higher hardness.
- Heat-treatment discussions should distinguish vacuum processing, quenching, sub-zero/deep-freeze or cryogenic processing where appropriate, tempering and carbide/microstructure effects without treating any single process as a universal quality badge.

## Sharpening and maintenance

- Keep **one complete practical sharpening method**, in `content/en/10-sharpening/basic-sharpening-process.md`.
- The bevel chapter should explain the geometry that the sharpening process must preserve, not repeat the complete process.
- The burr chapter should explain what the burr is, how it behaves and why it matters, not repeat the complete deburring procedure.
- Routine maintenance remains separate from sharpening.
- The `two medium coins` example is only an approximate visual memory aid for a chef-knife angle near 15 degrees; it must never be presented as a universal angle gauge.
- Professional/Japanese sharpening discussion may mention frequent maintenance and water-stone response where relevant, but should not reduce sharpening behaviour to HRC alone.

## Taxonomy and history

- Do not use `Japanese knives` as a blanket label for all Asian knife traditions. Prefer the specific tradition or `Asian knives` when the broader category is genuinely intended.
- Do not add Sakai or other historical digressions merely because they are interesting. History belongs only where it serves the technical or practical purpose of the book.
- Historical material should be integrated into the relevant explanation rather than repeatedly reintroduced as separate mini-histories.

## Publication workflow

- English under `content/en/` is the source of truth for meaning.
- Active translations are refreshed from the approved English text after merge.
- Every substantive content change should be checked in the generated English PDF before merge.
- After merge, the automated publication workflow must regenerate the current PDFs, versioned GitHub Release and GitHub Pages edition.

## Regression rule

If an older branch, catalog, translation, automated rewrite or future contribution conflicts with a decision in this file, this file wins unless the editorial decision is explicitly changed in a later review.
