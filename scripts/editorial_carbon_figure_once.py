from pathlib import Path
import hashlib, re, sys

ROOT = Path.cwd()
sys.path.insert(0, str(ROOT / 'scripts'))
from multilingual_site import digest, GLOSSARY, split_document

REL = Path('02-steels-and-metallurgy/alloying-elements.md')
ID = 'VIS-MET-CARBON-INTERSTITIAL-01'
IMAGE = 'iron-carbon-interstitial-matrix.webp'
SOURCE_SHA = '8ae89f0d501129af0a8b06196fb099d43ff945de'

def git_sha(data):
    return hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()

source_path = ROOT / 'content/en' / REL
old_source = source_path.read_text(encoding='utf-8')
assert git_sha(old_source.encode()) == SOURCE_SHA, 'Source changed: review before applying'
assert ID not in old_source, 'Figure is already present'

texts = {
'en': {
'anchor': 'Steel is made from microscopic iron crystals. Carbon atoms are much smaller than iron atoms, so they can fit into tiny spaces between iron atoms inside those crystals. They are not simply foreign particles mixed into the metal.',
'ratio': 'For a simplified alloy containing only iron and carbon, **1% carbon by mass corresponds to about 4.5% of all atoms: roughly one carbon atom for every 21 iron atoms**. This is the overall composition; how much carbon remains dissolved in the matrix depends on the steel and its heat treatment.',
'alt': 'Open-framework schematic with larger grey iron atoms, smaller dark interstitial carbon atoms and a cubic-cell inset.',
'caption': '<strong>Carbon in the iron matrix.</strong> Grey spheres represent iron atoms; smaller dark spheres illustrate carbon in interstitial sites, between the iron atoms. The open framework makes depth easier to see; its lines are visual guides, not physical rods. The inset shows a schematic body-centred cubic unit cell.',
'note': 'Conceptual illustration, not to scale or suitable for counting atomic proportions. The cubic-cell inset does not imply that ferrite can dissolve 1% carbon by mass; carbon can also be bound in carbides.'
},
'it': {
'anchor': "L'acciaio è fatto da microscopici cristalli di ferro. Gli atomi di carbonio sono molto più piccoli degli atomi di ferro, in modo da potersi adattare in piccoli spazi tra gli atomi di ferro all'interno di questi cristalli. Non sono semplicemente particelle estranee mescolate nel metallo.",
'ratio': "In una lega semplificata composta soltanto da ferro e carbonio, **l'1% di carbonio in peso corrisponde a circa il 4,5% degli atomi totali: all'incirca un atomo di carbonio ogni 21 atomi di ferro**. Questa è la composizione complessiva; la quantità di carbonio che rimane disciolta nella matrice dipende dall'acciaio e dal trattamento termico.",
'alt': 'Schema a reticolo aperto con atomi di ferro grigi più grandi, atomi di carbonio interstiziali scuri più piccoli e una cella cubica nel riquadro.',
'caption': '<strong>Il carbonio nella matrice di ferro.</strong> Le sfere grigie rappresentano gli atomi di ferro; quelle scure, più piccole, illustrano il carbonio negli interstizi, gli spazi tra gli atomi di ferro. Il reticolo aperto rende visibile la profondità; i segmenti sono guide grafiche, non collegamenti materiali. Nel riquadro è schematizzata una cella cubica a corpo centrato.',
'note': "Schema concettuale, non in scala e non utilizzabile per contare le proporzioni atomiche. Il riquadro cubico non implica che la ferrite possa sciogliere l'1% in peso di carbonio: parte del carbonio può essere legata nei carburi."
},
'zh-Hans': {
'anchor': '钢是由微型铁晶体制成的。 碳原子比铁原子小得多, 因此它们可以融入这些晶体中的铁原子之间的小空间。 它们不仅仅是与金属混合的外星粒子。',
'ratio': '在仅由铁和碳组成的简化合金中，**碳的质量分数为 1% 时，其原子分数约为 4.5%，即大约每 21 个铁原子对应 1 个碳原子**。这是整体成分；实际有多少碳溶解在基体中，取决于钢种及其热处理。',
'alt': '开放式晶格示意图：较大的灰色铁原子、较小的深色间隙碳原子，以及右上角的立方晶胞小图。',
'caption': '<strong>铁基体中的碳。</strong>灰色球表示铁原子，较小的深色球表示占据铁原子间隙位置的碳原子。开放式框架有助于看清三维排列；线段只是作图辅助线，并非实体连接杆。右上角小图示意体心立方晶胞。',
'note': '本图为概念示意图，未按比例绘制，不适合通过数球来计算原子比例。立方晶胞小图并不表示铁素体能够溶解质量分数为 1% 的碳；碳也可以结合在碳化物中。'
}}

def figure(t):
    return (f'<figure class="kb-learning-figure" data-visual-id="{ID}">\n'
            f'<img src="../../assets/images/approved/{IMAGE}" alt="{t["alt"]}" width="1200" height="900">\n'
            f'<figcaption>{t["caption"]}</figcaption>\n'
            f'<div class="kb-learning-figure__note">{t["note"]}</div>\n'
            '</figure>')

for lang, t in texts.items():
    path = source_path if lang == 'en' else ROOT / 'translations' / lang / REL
    old = path.read_text(encoding='utf-8')
    assert old.count(t['anchor']) == 1, f'Anchor mismatch: {lang}'
    if lang != 'en':
        metadata, _ = split_document(old)
        assert metadata['source_hash'] == digest(lang, old_source, GLOSSARY.read_text()), f'Stale translation: {lang}'
    new = old.replace(t['anchor'], t['ratio'] + '\n\n' + t['anchor'] + '\n\n' + figure(t))
    if lang != 'en':
        new_hash = digest(lang, source_path.read_text(encoding='utf-8'), GLOSSARY.read_text())
        new = re.sub(r'(?m)^source_hash: .*$', 'source_hash: ' + new_hash, new, count=1)
    path.write_text(new, encoding='utf-8')
    assert new.count(ID) == 1

rights = ROOT / 'content/en/assets/IMAGE_RIGHTS.md'
r = rights.read_text(encoding='utf-8')
anchor = '## Xinzuo catalog and product images'
assert r.count(anchor) == 1
r = r.replace(anchor, 'The text-free `images/approved/iron-carbon-interstitial-matrix.webp` is an AI-assisted original project illustration selected and approved by the repository owner. It is a print-optimized copy of the supplied `reticolo_bcc_di_ferro_e_carbonio.png`, with no added text or changes to the illustrated composition. Its translatable caption identifies it as a conceptual illustration, not an atom-counted or crystallographically exact representation of a finished blade.\n\n' + anchor)
rights.write_text(r, encoding='utf-8')
print('Updated English source, Italian and Simplified Chinese captions, and illustration provenance.')
