export const BASE_CERTIFICATION_VERSION = "base-final-2026-09-v1";

export const BASE_CERTIFICATION_BANK = [
  {
    id:"cert-base-001", conceptId:"safety.workstation", critical:true,
    prompt:{en:"Before the first cut, which preparation is correct?",it:"Prima del primo taglio, quale preparazione è corretta?"},
    options:[
      {id:"a",en:"Stabilize board and food, clear the blade path, dry hands/handle, then position the knife.",it:"Stabilizzare tagliere e alimento, liberare il percorso della lama, asciugare mani/manico e poi posizionare il coltello."},
      {id:"b",en:"Start slowly and correct the board only if it moves.",it:"Iniziare lentamente e correggere il tagliere solo se si muove."},
      {id:"c",en:"Hold the food harder and add downward force.",it:"Tenere più forte l'alimento e aumentare la forza verso il basso."},
      {id:"d",en:"Wet the board so the blade cannot bounce.",it:"Bagnare il tagliere per evitare rimbalzi della lama."}
    ], correct:"a"
  },
  {
    id:"cert-base-002", conceptId:"safety.food_stability", critical:true,
    prompt:{en:"A round ingredient rolls on the board. What should happen first?",it:"Un alimento rotondo rotola sul tagliere. Che cosa bisogna fare prima?"},
    options:[
      {id:"a",en:"Create a flat supporting face.",it:"Creare una faccia di appoggio piatta."},
      {id:"b",en:"Use a heavier knife.",it:"Usare un coltello più pesante."},
      {id:"c",en:"Increase fingertip pressure.",it:"Aumentare la pressione dei polpastrelli."},
      {id:"d",en:"Start the cut faster.",it:"Iniziare il taglio più velocemente."}
    ], correct:"a"
  },
  {
    id:"cert-base-003", conceptId:"safety.tool_fit_and_lateral_stress", critical:true,
    prompt:{en:"A thin hard blade becomes stuck in dense food. What is the correct action?",it:"Una lama sottile e dura resta bloccata in un alimento denso. Qual è l'azione corretta?"},
    options:[
      {id:"a",en:"Withdraw it carefully and adjust the cut.",it:"Estrarla con cautela e modificare il taglio."},
      {id:"b",en:"Twist the handle until the food opens.",it:"Torcere il manico finché l'alimento si apre."},
      {id:"c",en:"Lever sideways with the blade face.",it:"Fare leva lateralmente con la faccia della lama."},
      {id:"d",en:"Strike the spine.",it:"Colpire il dorso."}
    ], correct:"a"
  },
  {
    id:"cert-base-004", conceptId:"safety.washing_transfer_carrying", critical:true,
    prompt:{en:"Which handling situation is explicitly unsafe?",it:"Quale situazione di manipolazione è esplicitamente pericolosa?"},
    options:[
      {id:"a",en:"Leaving a sharp knife hidden under soapy water.",it:"Lasciare un coltello affilato nascosto nell'acqua saponata."},
      {id:"b",en:"Washing one knife at a time with the edge visible.",it:"Lavare un coltello alla volta mantenendo visibile il filo."},
      {id:"c",en:"Carrying a knife low and still for a short distance.",it:"Trasportare un coltello basso e fermo per una breve distanza."},
      {id:"d",en:"Presenting the handle toward the receiver.",it:"Orientare il manico verso chi riceve il coltello."}
    ], correct:"a"
  },
  {
    id:"cert-base-005", conceptId:"anatomy.blade_parts", critical:false,
    prompt:{en:"What is the bevel?",it:"Che cos'è il bisello?"},
    options:[
      {id:"a",en:"The geometry that narrows the blade toward the apex.",it:"La geometria che restringe la lama verso l'apice."},
      {id:"b",en:"The rear end of the handle.",it:"La parte terminale del manico."},
      {id:"c",en:"The upper unsharpened side.",it:"Il lato superiore non affilato."},
      {id:"d",en:"A surface finish only.",it:"Soltanto una finitura superficiale."}
    ], correct:"a"
  },
  {
    id:"cert-base-006", conceptId:"geometry.single_bevel_and_handedness", critical:true,
    prompt:{en:"A profile is traditionally associated with single-bevel knives. What must staff do before giving handedness or sharpening advice?",it:"Una forma è tradizionalmente associata ai coltelli a bisello singolo. Che cosa deve fare il personale prima di dare indicazioni su handedness o affilatura?"},
    options:[
      {id:"a",en:"Check the exact model's grind and specification.",it:"Controllare geometria e specifiche del modello esatto."},
      {id:"b",en:"Assume it is right-handed.",it:"Presumere che sia destrorso."},
      {id:"c",en:"Assume every traditional form is single bevel.",it:"Presumere che ogni forma tradizionale sia monobisello."},
      {id:"d",en:"Treat it as 50/50 without checking.",it:"Trattarlo come 50/50 senza verificare."}
    ], correct:"a"
  },
  {
    id:"cert-base-007", conceptId:"geometry.double_bevel", critical:false,
    prompt:{en:"Does 'double bevel' guarantee a perfectly symmetrical 50/50 grind?",it:"La definizione 'doppio bisello' garantisce una geometria perfettamente simmetrica 50/50?"},
    options:[
      {id:"a",en:"No. Both sides are sharpened, but the proportions can be asymmetric.",it:"No. Entrambi i lati sono affilati, ma le proporzioni possono essere asimmetriche."},
      {id:"b",en:"Yes, always.",it:"Sì, sempre."},
      {id:"c",en:"Only on forged knives.",it:"Solo sui coltelli forgiati."},
      {id:"d",en:"Only on stainless knives.",it:"Solo sui coltelli inox."}
    ], correct:"a"
  },
  {
    id:"cert-base-008", conceptId:"shapes.work_before_name", critical:false,
    prompt:{en:"What should come first in a knife recommendation?",it:"Che cosa deve venire prima in una raccomandazione di un coltello?"},
    options:[
      {id:"a",en:"The customer's foods, quantities and cutting movements.",it:"Alimenti, quantità e movimenti di taglio del cliente."},
      {id:"b",en:"The most complex Damascus pattern.",it:"Il motivo Damasco più complesso."},
      {id:"c",en:"The highest HRC.",it:"L'HRC più alto."},
      {id:"d",en:"The most expensive series.",it:"La serie più costosa."}
    ], correct:"a"
  },
  {
    id:"cert-base-009", conceptId:"shapes.specialist_geometry", critical:true,
    prompt:{en:"Which statement about a deba is correct?",it:"Quale affermazione sul deba è corretta?"},
    options:[
      {id:"a",en:"It is a fish-butchery specialist, not a universal heavy-bone cleaver.",it:"È uno specialista della lavorazione del pesce, non una mannaia universale per ossa pesanti."},
      {id:"b",en:"It is intended for prying frozen objects apart.",it:"È destinato a fare leva su oggetti congelati."},
      {id:"c",en:"It should flex deeply around a rib cage.",it:"Deve flettersi profondamente attorno alla gabbia toracica."},
      {id:"d",en:"Its weight makes twisting safe.",it:"Il suo peso rende sicura la torsione."}
    ], correct:"a"
  },
  {
    id:"cert-base-010", conceptId:"shapes.long_slicing", critical:false,
    prompt:{en:"What makes a long slicer effective?",it:"Che cosa rende efficace uno slicer lungo?"},
    options:[
      {id:"a",en:"Using its length in a long drawing stroke.",it:"Usare la sua lunghezza in una lunga corsa in trazione."},
      {id:"b",en:"Repeated short sawing strokes.",it:"Ripetuti brevi movimenti a sega."},
      {id:"c",en:"Heavy vertical impact.",it:"Impatto verticale pesante."},
      {id:"d",en:"Sideways leverage.",it:"Leva laterale."}
    ], correct:"a"
  },
  {
    id:"cert-base-011", conceptId:"care.board_surface_hardness", critical:true,
    prompt:{en:"Which routine cutting surface should be avoided with a fine kitchen edge?",it:"Quale superficie di taglio quotidiana va evitata con un filo fine da cucina?"},
    options:[
      {id:"a",en:"Glass.",it:"Vetro."},
      {id:"b",en:"Suitable wood.",it:"Legno adatto."},
      {id:"c",en:"Purpose-made resilient synthetic.",it:"Sintetico resiliente specifico."},
      {id:"d",en:"Suitable purpose-made plastic.",it:"Plastica specifica adatta."}
    ], correct:"a"
  },
  {
    id:"cert-base-012", conceptId:"care.washing_and_drying", critical:true,
    prompt:{en:"What is the correct routine after cutting salty or acidic food?",it:"Qual è la routine corretta dopo aver tagliato alimenti salati o acidi?"},
    options:[
      {id:"a",en:"Hand wash/rinse promptly and dry blade and handle completely.",it:"Lavare/risciacquare a mano tempestivamente e asciugare completamente lama e manico."},
      {id:"b",en:"Leave residues until the end of the day.",it:"Lasciare i residui fino a fine giornata."},
      {id:"c",en:"Soak the knife overnight.",it:"Lasciare il coltello in ammollo tutta la notte."},
      {id:"d",en:"Put it in the dishwasher.",it:"Metterlo in lavastoviglie."}
    ], correct:"a"
  },
  {
    id:"cert-base-013", conceptId:"care.safe_storage", critical:true,
    prompt:{en:"Which storage condition is inappropriate?",it:"Quale condizione di conservazione è inappropriata?"},
    options:[
      {id:"a",en:"The edge loose among metal utensils in a drawer.",it:"Il filo libero tra utensili metallici in un cassetto."},
      {id:"b",en:"A suitable fitted guard.",it:"Una protezione lama adatta."},
      {id:"c",en:"A suitable knife block.",it:"Un ceppo adatto."},
      {id:"d",en:"A fitted saya.",it:"Una saya adatta."}
    ], correct:"a"
  },
  {
    id:"cert-base-014", conceptId:"sharpening.stone_setup", critical:true,
    prompt:{en:"The stone support moves during sharpening. What should happen?",it:"Il supporto della pietra si muove durante l'affilatura. Che cosa bisogna fare?"},
    options:[
      {id:"a",en:"Stop and stabilize it before continuing.",it:"Fermarsi e stabilizzarlo prima di continuare."},
      {id:"b",en:"Increase pressure.",it:"Aumentare la pressione."},
      {id:"c",en:"Move faster.",it:"Andare più velocemente."},
      {id:"d",en:"Change to a finer grit.",it:"Passare a una grana più fine."}
    ], correct:"a"
  },
  {
    id:"cert-base-015", conceptId:"sharpening.edge_bevel_contact", critical:true,
    prompt:{en:"What does the marker method verify during sharpening?",it:"Che cosa verifica il metodo del pennarello durante l'affilatura?"},
    options:[
      {id:"a",en:"Where the stone contacts and removes material on the edge bevel.",it:"Dove la pietra tocca e rimuove materiale sul bisello del filo."},
      {id:"b",en:"The steel hardness.",it:"La durezza dell'acciaio."},
      {id:"c",en:"The exact stone grit.",it:"La grana esatta della pietra."},
      {id:"d",en:"Whether the knife is forged.",it:"Se il coltello è forgiato."}
    ], correct:"a"
  },
  {
    id:"cert-base-016", conceptId:"sharpening.burr_control", critical:true,
    prompt:{en:"What is the correct burr target?",it:"Qual è il target corretto della bava?"},
    options:[
      {id:"a",en:"The smallest detectable burr that is continuous along the whole edge.",it:"La più piccola bava rilevabile ma continua lungo tutto il filo."},
      {id:"b",en:"The largest burr possible.",it:"La bava più grande possibile."},
      {id:"c",en:"A burr only in the middle.",it:"Una bava soltanto al centro."},
      {id:"d",en:"A burr left attached for durability.",it:"Una bava lasciata attaccata per aumentare la durata."}
    ], correct:"a"
  },
  {
    id:"cert-base-017", conceptId:"sharpening.deburr_and_test", critical:true,
    prompt:{en:"Why should paper not be the only final sharpness test?",it:"Perché la carta non dovrebbe essere l'unico test finale di affilatura?"},
    options:[
      {id:"a",en:"A fragile wire edge can cut paper once but fail in food.",it:"Un wire edge fragile può tagliare la carta una volta ma fallire sull'alimento."},
      {id:"b",en:"Paper never shows catches.",it:"La carta non mostra mai impuntamenti."},
      {id:"c",en:"Paper always damages the edge.",it:"La carta danneggia sempre il filo."},
      {id:"d",en:"Paper only works on serrations.",it:"La carta funziona solo con i seghettati."}
    ], correct:"a"
  },
  {
    id:"cert-base-018", conceptId:"consultation.function_first", critical:false,
    prompt:{en:"When should steel grades be compared in a customer consultation?",it:"Quando vanno confrontati gli acciai in una consulenza al cliente?"},
    options:[
      {id:"a",en:"After identifying knife families whose geometry already suits the customer's work.",it:"Dopo aver identificato famiglie di coltelli la cui geometria è già adatta al lavoro del cliente."},
      {id:"b",en:"Before asking what the customer cuts.",it:"Prima di chiedere che cosa taglia il cliente."},
      {id:"c",en:"Steel should be the only selection criterion.",it:"L'acciaio deve essere l'unico criterio di scelta."},
      {id:"d",en:"Only after payment.",it:"Solo dopo il pagamento."}
    ], correct:"a"
  },
  {
    id:"cert-base-019", conceptId:"consultation.grip_and_balance", critical:false,
    prompt:{en:"Why can the same knife feel differently balanced to two users?",it:"Perché lo stesso coltello può sembrare bilanciato diversamente a due utenti?"},
    options:[
      {id:"a",en:"Grip position changes leverage relative to the same mass distribution.",it:"La posizione della presa cambia la leva rispetto alla stessa distribuzione delle masse."},
      {id:"b",en:"The knife changes its physical weight.",it:"Il coltello cambia il proprio peso fisico."},
      {id:"c",en:"Only blade steel controls balance.",it:"Solo l'acciaio della lama controlla il bilanciamento."},
      {id:"d",en:"Balance is purely decorative.",it:"Il bilanciamento è puramente decorativo."}
    ], correct:"a"
  },
  {
    id:"cert-base-020", conceptId:"consultation.function_fit_selection", critical:false,
    prompt:{en:"Which sequence summarizes the Xinzuo consultation method?",it:"Quale sequenza riassume il metodo di consulenza Xinzuo?"},
    options:[
      {id:"a",en:"Function → fit → selection.",it:"Function → fit → selection."},
      {id:"b",en:"Price → hardness → appearance.",it:"Prezzo → durezza → estetica."},
      {id:"c",en:"Damascus → price → function.",it:"Damasco → prezzo → funzione."},
      {id:"d",en:"Hardness → handle → task.",it:"Durezza → manico → compito."}
    ], correct:"a"
  }
];
