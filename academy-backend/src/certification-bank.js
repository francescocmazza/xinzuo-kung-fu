export const BASE_CERTIFICATION_VERSION = "base-final-2026-10-v2";

export const BASE_CERTIFICATION_BANK = [
  {
    "id": "cert-base-001",
    "conceptId": "base.anatomy.parts",
    "critical": false,
    "prompt": {
      "en": "A customer points to the rear of the sharpened edge near the handle. Which part is it?",
      "it": "Un cliente indica la parte posteriore del filo vicino al manico. Quale parte è?"
    },
    "options": [
      {
        "id": "a",
        "en": "Heel",
        "it": "Tallone"
      },
      {
        "id": "b",
        "en": "Spine",
        "it": "Dorso"
      },
      {
        "id": "c",
        "en": "Tip",
        "it": "Punta"
      },
      {
        "id": "d",
        "en": "Bolster",
        "it": "Raccordo"
      }
    ],
    "correct": "a"
  },
  {
    "id": "cert-base-002",
    "conceptId": "base.anatomy.construction",
    "critical": false,
    "prompt": {
      "en": "Which comparison of tang styles is technically sound?",
      "it": "Quale confronto tra tipi di codolo è tecnicamente corretto?"
    },
    "options": [
      {
        "id": "a",
        "en": "A full tang proves better edge retention than a hidden tang.",
        "it": "Un codolo integrale prova una migliore tenuta del filo rispetto a uno nascosto."
      },
      {
        "id": "b",
        "en": "A through tang is simply another name for a full tang.",
        "it": "Un codolo passante è semplicemente un altro nome per codolo integrale."
      },
      {
        "id": "c",
        "en": "Tang style describes construction; execution and intended loads still matter.",
        "it": "Il tipo di codolo descrive la costruzione; contano ancora esecuzione e carichi previsti."
      },
      {
        "id": "d",
        "en": "A hidden tang cannot be durable in a kitchen knife.",
        "it": "Un codolo nascosto non può essere durevole in un coltello da cucina."
      }
    ],
    "correct": "c"
  },
  {
    "id": "cert-base-003",
    "conceptId": "base.steel.five_dimensions",
    "critical": false,
    "prompt": {
      "en": "Two steels have the same HRC. Which conclusion is safest?",
      "it": "Due acciai hanno lo stesso HRC. Qual è la conclusione più corretta?"
    },
    "options": [
      {
        "id": "a",
        "en": "They must have identical edge retention and toughness.",
        "it": "Devono avere identiche tenuta del filo e tenacità."
      },
      {
        "id": "b",
        "en": "They may still differ in wear, toughness and sharpening response.",
        "it": "Possono comunque differire per usura, tenacità e risposta all'affilatura."
      },
      {
        "id": "c",
        "en": "They must contain the same carbide population.",
        "it": "Devono contenere la stessa popolazione di carburi."
      },
      {
        "id": "d",
        "en": "They must have identical corrosion resistance.",
        "it": "Devono avere identica resistenza alla corrosione."
      }
    ],
    "correct": "b"
  },
  {
    "id": "cert-base-004",
    "conceptId": "base.steel.stainless_sharpening",
    "critical": false,
    "prompt": {
      "en": "Which statement about stainless knife steel is correct?",
      "it": "Quale affermazione sull'acciaio inox da coltello è corretta?"
    },
    "options": [
      {
        "id": "a",
        "en": "It cannot stain once chromium exceeds the stainless threshold.",
        "it": "Non può macchiarsi quando il cromo supera la soglia inox."
      },
      {
        "id": "b",
        "en": "Its sharpening response is determined only by HRC.",
        "it": "La risposta all'affilatura dipende solo dall'HRC."
      },
      {
        "id": "c",
        "en": "It never needs care after salty or acidic foods.",
        "it": "Non richiede mai cura dopo alimenti salati o acidi."
      },
      {
        "id": "d",
        "en": "It resists corrosion but still benefits from prompt cleaning and drying.",
        "it": "Resiste alla corrosione ma beneficia comunque di lavaggio e asciugatura tempestivi."
      }
    ],
    "correct": "d"
  },
  {
    "id": "cert-base-005",
    "conceptId": "base.metallurgy.alloying",
    "critical": false,
    "prompt": {
      "en": "What is the best way to use an alloy composition table?",
      "it": "Qual è il modo migliore di usare una tabella di composizione?"
    },
    "options": [
      {
        "id": "a",
        "en": "As one input together with heat treatment, microstructure and geometry",
        "it": "Come un dato insieme a trattamento termico, microstruttura e geometria"
      },
      {
        "id": "b",
        "en": "As a complete ranking of finished knife quality",
        "it": "Come classifica completa della qualità del coltello finito"
      },
      {
        "id": "c",
        "en": "By counting how many alloying elements are listed",
        "it": "Contando quanti elementi di lega sono elencati"
      },
      {
        "id": "d",
        "en": "By choosing the steel with the most chromium every time",
        "it": "Scegliendo sempre l'acciaio con più cromo"
      }
    ],
    "correct": "a"
  },
  {
    "id": "cert-base-006",
    "conceptId": "base.metallurgy.heat_pm",
    "critical": false,
    "prompt": {
      "en": "Why can powder metallurgy help highly alloyed knife steels?",
      "it": "Perché la metallurgia delle polveri può aiutare gli acciai da coltello molto legati?"
    },
    "options": [
      {
        "id": "a",
        "en": "It removes the need for heat treatment after steelmaking.",
        "it": "Elimina il bisogno di trattamento termico dopo la produzione."
      },
      {
        "id": "b",
        "en": "It guarantees easier sharpening than every conventional steel.",
        "it": "Garantisce affilatura più facile di ogni acciaio convenzionale."
      },
      {
        "id": "c",
        "en": "It can improve uniformity and carbide distribution before heat treatment.",
        "it": "Può migliorare uniformità e distribuzione dei carburi prima del trattamento termico."
      },
      {
        "id": "d",
        "en": "It guarantees greater toughness regardless of alloy content.",
        "it": "Garantisce maggiore tenacità a prescindere dalla lega."
      }
    ],
    "correct": "c"
  },
  {
    "id": "cert-base-007",
    "conceptId": "base.materials.blade_steels",
    "critical": false,
    "prompt": {
      "en": "Which statement best describes the Xinzuo steel range?",
      "it": "Quale frase descrive meglio la gamma di acciai Xinzuo?"
    },
    "options": [
      {
        "id": "a",
        "en": "The newest steel is automatically best for every customer.",
        "it": "L'acciaio più recente è automaticamente il migliore per tutti."
      },
      {
        "id": "b",
        "en": "Different steels target different balances of properties and use.",
        "it": "Acciai diversi mirano a equilibri diversi di proprietà e utilizzo."
      },
      {
        "id": "c",
        "en": "The highest HRC steel should always be recommended first.",
        "it": "L'acciaio con HRC più alto va sempre consigliato per primo."
      },
      {
        "id": "d",
        "en": "Carbon steel is always easier for every user to maintain.",
        "it": "L'acciaio al carbonio è sempre più facile da mantenere per tutti."
      }
    ],
    "correct": "b"
  },
  {
    "id": "cert-base-008",
    "conceptId": "base.materials.handles",
    "critical": false,
    "prompt": {
      "en": "What is the most defensible way to choose a handle material?",
      "it": "Qual è il modo più difendibile di scegliere un materiale del manico?"
    },
    "options": [
      {
        "id": "a",
        "en": "Choose the rarest material regardless of grip.",
        "it": "Scegliere il materiale più raro a prescindere dalla presa."
      },
      {
        "id": "b",
        "en": "Choose the densest material regardless of balance.",
        "it": "Scegliere il materiale più denso a prescindere dal bilanciamento."
      },
      {
        "id": "c",
        "en": "Choose the hardest surface regardless of comfort.",
        "it": "Scegliere la superficie più dura a prescindere dal comfort."
      },
      {
        "id": "d",
        "en": "Match material, shape, care and balance to the user's needs.",
        "it": "Abbinare materiale, forma, cura e bilanciamento alle esigenze dell'utente."
      }
    ],
    "correct": "d"
  },
  {
    "id": "cert-base-009",
    "conceptId": "base.damascus.construction",
    "critical": false,
    "prompt": {
      "en": "What distinguishes genuine layered Damascus from a laser-applied pattern?",
      "it": "Che cosa distingue un vero Damasco stratificato da un motivo applicato al laser?"
    },
    "options": [
      {
        "id": "a",
        "en": "The pattern comes from joined material layers rather than surface marking.",
        "it": "Il motivo deriva da strati di materiale uniti, non da una marcatura superficiale."
      },
      {
        "id": "b",
        "en": "The genuine blade always has the highest HRC.",
        "it": "La lama autentica ha sempre l'HRC più alto."
      },
      {
        "id": "c",
        "en": "The genuine blade always has more chromium.",
        "it": "La lama autentica ha sempre più cromo."
      },
      {
        "id": "d",
        "en": "The laser pattern can be identified only by the handle.",
        "it": "Il motivo laser si identifica soltanto dal manico."
      }
    ],
    "correct": "a"
  },
  {
    "id": "cert-base-010",
    "conceptId": "base.damascus.differential_wear",
    "critical": false,
    "prompt": {
      "en": "What can differential wear in full Damascus preserve without literally sharpening the knife?",
      "it": "Che cosa può preservare l'usura differenziale nel Damasco integrale senza affilare letteralmente il coltello?"
    },
    "options": [
      {
        "id": "a",
        "en": "The exact factory edge angle for the life of the knife",
        "it": "L'esatto angolo di fabbrica per tutta la vita del coltello"
      },
      {
        "id": "b",
        "en": "Complete immunity to edge wear and deformation",
        "it": "Totale immunità a usura e deformazione del filo"
      },
      {
        "id": "c",
        "en": "Useful slicing bite from evolving microscopic edge texture",
        "it": "Mordente utile in affettatura dalla microtexture del filo che evolve"
      },
      {
        "id": "d",
        "en": "A permanently polished apex with no maintenance",
        "it": "Un apice permanentemente lucidato senza manutenzione"
      }
    ],
    "correct": "c"
  },
  {
    "id": "cert-base-011",
    "conceptId": "base.geometry.families",
    "critical": false,
    "prompt": {
      "en": "Routine sharpening of a compound double-V edge normally works on which part?",
      "it": "L'affilatura ordinaria di un doppio V composto lavora normalmente su quale parte?"
    },
    "options": [
      {
        "id": "a",
        "en": "The whole primary grind every time",
        "it": "L'intera molatura primaria ogni volta"
      },
      {
        "id": "b",
        "en": "The small edge bevel at the apex",
        "it": "Il piccolo bisello del filo all'apice"
      },
      {
        "id": "c",
        "en": "The spine along the full blade",
        "it": "Il dorso lungo tutta la lama"
      },
      {
        "id": "d",
        "en": "The tang inside the handle",
        "it": "Il codolo dentro il manico"
      }
    ],
    "correct": "b"
  },
  {
    "id": "cert-base-012",
    "conceptId": "base.geometry.single_asymmetry",
    "critical": true,
    "prompt": {
      "en": "Before advising sharpening on a traditional single-bevel knife, what should staff verify?",
      "it": "Prima di consigliare l'affilatura di un tradizionale monobisello, che cosa va verificato?"
    },
    "options": [
      {
        "id": "a",
        "en": "Only the silhouette and country of origin",
        "it": "Solo la silhouette e il paese d'origine"
      },
      {
        "id": "b",
        "en": "Only the handle material and blade length",
        "it": "Solo materiale del manico e lunghezza"
      },
      {
        "id": "c",
        "en": "Only whether a Damascus pattern is visible",
        "it": "Solo se è visibile un motivo Damasco"
      },
      {
        "id": "d",
        "en": "The exact grind, reverse geometry and handed orientation",
        "it": "La geometria esatta, il retro e l'orientamento laterale"
      }
    ],
    "correct": "d"
  },
  {
    "id": "cert-base-013",
    "conceptId": "base.types.work_match",
    "critical": false,
    "prompt": {
      "en": "What should come first when recommending a knife family?",
      "it": "Che cosa viene prima quando si consiglia una famiglia di coltelli?"
    },
    "options": [
      {
        "id": "a",
        "en": "The customer's foods, quantities and cutting movements",
        "it": "Alimenti, quantità e movimenti di taglio del cliente"
      },
      {
        "id": "b",
        "en": "The most expensive steel grade available",
        "it": "L'acciaio più costoso disponibile"
      },
      {
        "id": "c",
        "en": "The most complex blade pattern in stock",
        "it": "Il motivo di lama più complesso disponibile"
      },
      {
        "id": "d",
        "en": "The handle material with the highest density",
        "it": "Il materiale del manico più denso"
      }
    ],
    "correct": "a"
  },
  {
    "id": "cert-base-014",
    "conceptId": "base.types.balance_fit",
    "critical": false,
    "prompt": {
      "en": "Why can the same knife feel more neutral in a pinch grip than in a rear handle grip?",
      "it": "Perché lo stesso coltello può sembrare più neutro in presa a pinza rispetto a una presa arretrata?"
    },
    "options": [
      {
        "id": "a",
        "en": "The blade physically becomes lighter in a pinch grip.",
        "it": "La lama diventa fisicamente più leggera in presa a pinza."
      },
      {
        "id": "b",
        "en": "The steel hardness falls when the hand moves forward.",
        "it": "La durezza diminuisce quando la mano avanza."
      },
      {
        "id": "c",
        "en": "The hand moves closer to blade mass and changes leverage.",
        "it": "La mano si avvicina alla massa della lama e cambia la leva."
      },
      {
        "id": "d",
        "en": "The tang shortens when the fingers reach the blade.",
        "it": "Il codolo si accorcia quando le dita raggiungono la lama."
      }
    ],
    "correct": "c"
  },
  {
    "id": "cert-base-015",
    "conceptId": "base.cutting.paths",
    "critical": true,
    "prompt": {
      "en": "Which movement combines forward travel with downward motion through the food?",
      "it": "Quale movimento combina avanzamento e discesa attraverso l'alimento?"
    },
    "options": [
      {
        "id": "a",
        "en": "Pure vertical descent",
        "it": "Discesa verticale pura"
      },
      {
        "id": "b",
        "en": "Advancing push cut",
        "it": "Taglio a spingere avanzato"
      },
      {
        "id": "c",
        "en": "Sideways board scraping",
        "it": "Raschiamento laterale del tagliere"
      },
      {
        "id": "d",
        "en": "Static in-hand peeling",
        "it": "Pelatura statica in mano"
      }
    ],
    "correct": "b"
  },
  {
    "id": "cert-base-016",
    "conceptId": "base.cutting.specialist",
    "critical": true,
    "prompt": {
      "en": "A hard fillet knife has reached its designed flex limit. What should the user do?",
      "it": "Un coltello da sfiletto duro ha raggiunto il limite di flessione previsto. Che cosa dovrebbe fare l'utente?"
    },
    "options": [
      {
        "id": "a",
        "en": "Twist the handle until the blade follows the contour.",
        "it": "Torcere il manico finché la lama segue il profilo."
      },
      {
        "id": "b",
        "en": "Lever against bone to increase available flex.",
        "it": "Fare leva sull'osso per aumentare la flessione."
      },
      {
        "id": "c",
        "en": "Strike the spine so the blade bends farther.",
        "it": "Colpire il dorso perché la lama si pieghi di più."
      },
      {
        "id": "d",
        "en": "Change the cutting angle rather than forcing more bend.",
        "it": "Cambiare l'angolo di taglio invece di forzare altra flessione."
      }
    ],
    "correct": "d"
  },
  {
    "id": "cert-base-017",
    "conceptId": "base.safety.setup_use",
    "critical": true,
    "prompt": {
      "en": "A thin hard blade binds in dense food. What is the safest response?",
      "it": "Una lama sottile e dura si blocca in un alimento denso. Qual è la risposta più sicura?"
    },
    "options": [
      {
        "id": "a",
        "en": "Withdraw it carefully and change the cut.",
        "it": "Estrarla con cautela e modificare il taglio."
      },
      {
        "id": "b",
        "en": "Twist the handle gently until the food opens.",
        "it": "Torcere leggermente il manico finché l'alimento si apre."
      },
      {
        "id": "c",
        "en": "Lever sideways with the blade face.",
        "it": "Fare leva lateralmente con la faccia della lama."
      },
      {
        "id": "d",
        "en": "Strike the spine while the blade remains trapped.",
        "it": "Colpire il dorso mentre la lama resta bloccata."
      }
    ],
    "correct": "a"
  },
  {
    "id": "cert-base-018",
    "conceptId": "base.safety.handling",
    "critical": true,
    "prompt": {
      "en": "A knife falls from the counter. What should you do?",
      "it": "Un coltello cade dal banco. Che cosa dovresti fare?"
    },
    "options": [
      {
        "id": "a",
        "en": "Catch the handle before it reaches the floor.",
        "it": "Afferrare il manico prima che tocchi terra."
      },
      {
        "id": "b",
        "en": "Block the blade with a foot.",
        "it": "Bloccare la lama con un piede."
      },
      {
        "id": "c",
        "en": "Step away and let it fall.",
        "it": "Allontanarti e lasciarlo cadere."
      },
      {
        "id": "d",
        "en": "Reach with both hands to stop it.",
        "it": "Allungare entrambe le mani per fermarlo."
      }
    ],
    "correct": "c"
  },
  {
    "id": "cert-base-019",
    "conceptId": "base.care.boards",
    "critical": true,
    "prompt": {
      "en": "Which board surface should be avoided for routine work with a fine kitchen edge?",
      "it": "Quale superficie va evitata nel lavoro quotidiano con un filo fine da cucina?"
    },
    "options": [
      {
        "id": "a",
        "en": "Suitable wood",
        "it": "Legno adatto"
      },
      {
        "id": "b",
        "en": "Glass",
        "it": "Vetro"
      },
      {
        "id": "c",
        "en": "Purpose-made plastic",
        "it": "Plastica specifica"
      },
      {
        "id": "d",
        "en": "Resilient synthetic board",
        "it": "Tagliere sintetico resiliente"
      }
    ],
    "correct": "b"
  },
  {
    "id": "cert-base-020",
    "conceptId": "base.care.routine",
    "critical": true,
    "prompt": {
      "en": "A carbon-steel blade shows a stable dark patina. How should it be interpreted?",
      "it": "Una lama al carbonio mostra una patina scura stabile. Come va interpretata?"
    },
    "options": [
      {
        "id": "a",
        "en": "It proves the blade has structurally failed.",
        "it": "Dimostra che la lama ha ceduto strutturalmente."
      },
      {
        "id": "b",
        "en": "It is always active corrosion that must be ground away.",
        "it": "È sempre corrosione attiva da molare via."
      },
      {
        "id": "c",
        "en": "It proves the steel has become stainless.",
        "it": "Dimostra che l'acciaio è diventato inox."
      },
      {
        "id": "d",
        "en": "It is different from active orange rust and may be normal.",
        "it": "È diversa dalla ruggine arancione attiva e può essere normale."
      }
    ],
    "correct": "d"
  },
  {
    "id": "cert-base-021",
    "conceptId": "base.sharpening.setup_contact",
    "critical": true,
    "prompt": {
      "en": "The marker disappears only at the very apex while most of the edge bevel remains inked. What does that suggest?",
      "it": "Il pennarello sparisce solo sull'apice mentre gran parte del bisello resta colorata. Che cosa suggerisce?"
    },
    "options": [
      {
        "id": "a",
        "en": "The sharpening angle may be too high.",
        "it": "L'angolo di affilatura può essere troppo alto."
      },
      {
        "id": "b",
        "en": "The stone is necessarily too fine.",
        "it": "La pietra è necessariamente troppo fine."
      },
      {
        "id": "c",
        "en": "The steel is necessarily too soft.",
        "it": "L'acciaio è necessariamente troppo morbido."
      },
      {
        "id": "d",
        "en": "The burr is already fully removed.",
        "it": "La bava è già completamente rimossa."
      }
    ],
    "correct": "a"
  },
  {
    "id": "cert-base-022",
    "conceptId": "base.sharpening.burr_test",
    "critical": true,
    "prompt": {
      "en": "Why should paper not be the only final sharpness test?",
      "it": "Perché la carta non dovrebbe essere l'unico test finale di affilatura?"
    },
    "options": [
      {
        "id": "a",
        "en": "Paper can never reveal roughness in an edge.",
        "it": "La carta non può mai rivelare ruvidità sul filo."
      },
      {
        "id": "b",
        "en": "Paper always damages a properly sharpened edge.",
        "it": "La carta danneggia sempre un filo ben affilato."
      },
      {
        "id": "c",
        "en": "A fragile wire edge can cut paper briefly but fail in food.",
        "it": "Un fragile filo residuo può tagliare brevemente la carta ma cedere sull'alimento."
      },
      {
        "id": "d",
        "en": "Paper works only on serrated knives.",
        "it": "La carta funziona solo sui coltelli seghettati."
      }
    ],
    "correct": "c"
  }
];
