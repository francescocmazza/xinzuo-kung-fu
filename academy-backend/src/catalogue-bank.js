import catalogue from '../data/catalog.json' with { type: 'json' };
export const CATALOGUE = catalogue;
const pair = (it,en) => ({it,en});
export const TYPES = {
 butcher: pair('Coltello da macellaio','Butcher knife'), slicing: pair('Slicing (denominazione listino)','Slicing knife (price-list name)'),
 paring: pair('Spelucchino','Paring knife'), utility: pair('Coltello universale','Utility knife'),
 chef: pair('Coltello chef (denominazione catalogo)','Chef knife (catalogue name)'), gyuto: pair('Gyuto','Gyuto'),
 santoku: pair('Santoku','Santoku'), bunka: pair('Bunka','Bunka'), nakiri: pair('Nakiri','Nakiri'),
 bread: pair('Coltello da pane','Bread knife'), boning: pair('Coltello da disosso','Boning knife'),
 honesuki: pair('Honesuki','Honesuki'), fillet: pair('Coltello per filettare','Fillet knife'),
 carving: pair('Coltello per affettare','Carving knife'), steak: pair('Coltello da bistecca','Steak knife'),
 cheese: pair('Coltello da formaggio','Cheese knife'), butter: pair('Coltello da burro','Butter knife'),
 ham: pair('Coltello da prosciutto','Ham knife'), frozen: pair('Coltello per surgelati','Frozen-food knife'),
 deba: pair('Deba','Deba'), sashimi: pair('Coltello sashimi','Sashimi knife'), sakimaru: pair('Sakimaru','Sakimaru'),
 kiritsuke: pair('Kiritsuke','Kiritsuke'), viking: pair('Viking (denominazione catalogo)','Viking (catalogue name)'),
 cleaver: pair('Mannaia cinese da taglio, non da ossa','Chinese cutting cleaver, not a bone chopper'),
 bone: pair('Mannaia da ossa','Bone chopper'), chopper: pair('Chopper (denominazione catalogo)','Chopper (catalogue name)')
};
// Applications follow the existing English knowledge base, not steel/price marketing claims.
export const USES = {
 butcher:pair('Porzionare carne con tagli controllati; non usare su ossa senza specifica dedicata.','Portion meat with controlled cuts; do not use on bones without a dedicated specification.'),
 slicing:pair('Affettare alimenti con passate regolari e controllate.','Slice ingredients with even, controlled strokes.'),
 paring:pair('Pelare e rifinire piccoli ortaggi o frutti con controllo della punta.','Peel and trim small fruit or vegetables with controlled tip work.'),
 utility:pair('Tagliare piccoli alimenti e fare rifiniture quando una lama chef è ingombrante.','Cut small ingredients and trim where a chef blade is too large.'),
 chef:pair('Preparazioni generali di verdure, carne disossata e pesce; controllare il profilo per il movimento.','General vegetables, boneless meat and fish preparation; match the motion to the actual profile.'),
 gyuto:pair('Preparazioni generali e tagli a spingere con il tratto più piatto della lama.','General preparation and push cuts using the flatter part of the edge.'),
 santoku:pair('Tagli a spingere e tranciatura controllata di verdure, anche carne e pesce senza ossa.','Push cuts and controlled chopping of vegetables, also boneless meat and fish.'),
 bunka:pair('Verdure e pesce, con lavori fini di punta grazie alla punta angolata; evitare torsioni.','Vegetables and fish, with precise K-tip work; avoid twisting.'),
 nakiri:pair('Tagliare verdure sul tagliere a spingere; non usarlo per ossa.','Push-cut vegetables on a board; do not use for bones.'),
 bread:pair('Affettare pane e croste con la seghettatura e movimenti avanti-indietro.','Slice bread and crusts with the serrated edge and a sawing motion.'),
 boning:pair('Separare carne dalle ossa e lavorare attorno alle articolazioni, senza spaccare ossa.','Separate meat from bones and work around joints, without chopping bones.'),
 honesuki:pair('Disossare pollame lavorando con precisione nelle articolazioni, senza spaccare ossa dure.','Debone poultry with precise joint work, without chopping hard bones.'),
 fillet:pair('Separare filetti e pelle dal pesce seguendo la struttura, senza colpire la lisca.','Separate fish fillets and skin following the structure, without striking the backbone.'),
 carving:pair('Affettare arrosti e carne disossata con passate lunghe e controllate.','Slice roasts and boneless meat with long, controlled strokes.'),
 steak:pair('Tagliare porzioni di carne nel piatto; evitare urti e torsioni del filo.','Cut portions of meat at the table; avoid edge impacts and twisting.'),
 cheese:pair('Porzionare formaggi con la lama dedicata, secondo consistenza e profilo.','Portion cheese with the dedicated blade, matching texture and profile.'),
 butter:pair('Porzionare e spalmare burro o creme morbide.','Portion and spread butter or soft spreads.'),
 ham:pair('Ricavare fette di prosciutto con passate lunghe e regolari.','Cut ham slices with long, even strokes.'),
 frozen:pair('Tagliare alimenti congelati con il modello dedicato, senza usare la lama come leva.','Cut frozen food with the dedicated model, without levering.'),
 deba:pair('Preparare il pesce con una lama robusta e controllata; non è una mannaia per ossa dure.','Break down fish with a robust, controlled blade; it is not a hard-bone chopper.'),
 sashimi:pair('Affettare pesce crudo con passate lunghe e pulite, senza segare ripetutamente.','Slice raw fish with long, clean strokes, avoiding repeated sawing.'),
 sakimaru:pair('Affettare pesce e preparazioni senza ossa con una lama lunga e punta specifica.','Slice fish and boneless ingredients with a long blade and distinctive tip.'),
 kiritsuke:pair('Tagli precisi e affettatura di pesce e verdure con punta angolata; evitare torsioni.','Precise cuts and slicing of fish and vegetables with an angled tip; avoid twisting.'),
 viking:pair('Preparazioni senza ossa con il profilo specifico; il nome non autorizza colpi su ossa.','Prepare boneless ingredients using the specific profile; the name does not imply bone chopping.'),
 cleaver:pair('Tagliare verdure e alimenti senza ossa con lama larga; non confonderla con una mannaia da ossa.','Cut vegetables and boneless ingredients with the broad blade; do not confuse it with a bone chopper.'),
 bone:pair('Lavorare ossa compatibili con il modello usando colpi controllati e tagliere stabile.','Work on bones appropriate to the model with controlled strokes and a stable board.'),
 chopper:pair('Tranciare alimenti con la lama larga; verificare la specifica prima di usarla sulle ossa.','Chop food with the broad blade; check the specification before using it on bones.')
};
export function shuffle(values) {
 const a=[...values];
 for(let i=a.length-1;i>0;i--){const n=new Uint32Array(1);crypto.getRandomValues(n);const j=n[0]%(i+1);[a[i],a[j]]=[a[j],a[i]];}
 return a;
}
export function selectProducts(enabled, previous=[], count=5) {
 const chosen=[];const series=shuffle(CATALOGUE.series.filter(s=>enabled.has(s.id)));
 const pools=series.map(s=>{
  const all=CATALOGUE.products.filter(p=>p.series===s.id&&p.quizReady!==false);
  const fresh=all.filter(p=>!previous.includes(p.id));
  return shuffle(fresh.length?fresh:all);
 });
 while(chosen.length<count && pools.some(p=>p.length)) for(const pool of pools){if(pool.length && chosen.length<count)chosen.push(pool.pop());}
 return chosen;
}
function localized(s,locale){if(typeof s==='object')return s[locale]||s.en;const a=s.split(' / ');return a.length===2?(locale==='it'?a[0]:a[1]):s;}
function options(correct,values,locale){return shuffle([correct,...shuffle([...new Set(values)].filter(v=>v!==correct)).slice(0,3)]).map(v=>({id:crypto.randomUUID(),value:v,label:localized(v,locale)}));}
export function buildCard(p,locale='it') {
 const s=CATALOGUE.series.find(s=>s.id===p.series);const steel=p.steel;
 const layerText=n=>n===null?(locale==='it'?'Numero di strati non dichiarato':'Layer count not specified'):`${n} ${locale==='it'?'strati':'layers'}`;
 const values={series:s.id,type:p.type,handle:p.handle,steel,layers:p.layers===null?null:layerText(p.layers),use:p.type};
 const pools={series:CATALOGUE.series.map(s=>s.id),type:Object.keys(TYPES),handle:CATALOGUE.products.map(p=>p.handle).filter(Boolean),steel:[...CATALOGUE.products.map(p=>p.steel).filter(Boolean),'7Cr17MoV','8Cr14MoV'],layers:[null,3,37,49,53,67,73,110,145].map(layerText),use:Object.keys(USES)};
 const fields=Object.keys(values).filter(key=>values[key]!==null).map(key=>{
  const family=v=>String(v).toLowerCase().replace('north american ','').replace('nordamericano ','').replace(/.*(g10|micarta|ebano|ebony).*/,'$1').replace('ebano','ebony');
  const pool=key==='handle'?pools[key].filter(v=>v===values[key]||family(v)!==family(values[key])):pools[key];
  const opts=options(values[key],pool,locale);
  if(key==='type'||key==='use')opts.forEach(o=>o.label=localized((key==='type'?TYPES:USES)[o.value],locale));
  return {key,options:opts.map(({id,label})=>({id,label})),correct:opts.find(o=>o.value===values[key]).id,correctLabel:opts.find(o=>o.value===values[key]).label};
 });
 return {productId:p.id,image:p.image,series:s.id,sku:p.sku,sourcePage:p.sourcePage,sourceRow:p.sourceRow,notes:p.notes,price:p.price,fields};
}
export function publicCard(card,index,total){return {index,total,image:card.image,askPrice:card.price!==null,fields:card.fields.map(({key,options})=>({key,options}))};}
export function gradeCard(card,answers){
 const details=card.fields.map(f=>({key:f.key,correct:answers[f.key]===f.correct,expected:f.correctLabel}));
 const price=typeof answers.price==='number'?answers.price:NaN;
 if(card.price!==null) details.push({key:'price',correct:Number.isFinite(price)&&price>=0&&Math.abs(price-card.price)<=card.price*CATALOGUE.priceTolerance+1e-8,expected:`€${card.price.toFixed(2)} (±15%)`});
 return {series:card.series,sku:card.sku,sourcePage:card.sourcePage,sourceRow:card.sourceRow,notes:card.notes,priceUnavailable:card.price===null,details,correct:details.filter(d=>d.correct).length,total:details.length};
}
