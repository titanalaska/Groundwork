// The plan data for every job: what each one calls for, and the notes that
// explain the numbers that argue with each other.
//
// This lived inside index.html until 9/21. It is its own file now because
// status.html -- the page Chris and Todd read -- was carrying a SECOND,
// hand-typed copy of the same quantities, and the two drifted apart every
// time one was corrected and the other was not. One file, both pages.
//
// Loaded with a plain <script src>, so JOBS is defined before either page
// runs. Do not make this a fetch: index.html uses JOBS synchronously from
// its first render, and the app has to work with no signal in the field.
//
// sw.js precaches it as CRITICAL. Without it the app has no job to show, so
// a missing jobs.js must fail the install rather than install broken.
var JOBS = {
  h2s: {
    label: "Home2Suites",
    short: "Home2Suites",
    groups: {
      trees: { label: "Trees", items: [
        ["Columnar Swedish Aspen", 28],
        ["Helena Maple", 22],
        ["Paper Birch", 15],
        ["Quaking Aspen", 8],
        ["Amur Maple", 3],
        ["Siberian Crabapple", 9]
      ]},
      shrubs: { label: "Shrubs", items: [
        ["Birchleaf Spirea", 58],
        ["Goldmound Spirea", 61],
        ["Creeping Juniper", 70],
        ["Savin Juniper", 34],
        ["Red-Twig Dogwood", 41],
        // The plan draws 73 Miss Kim (code SPA). 46 were on hand and are in;
        // the balance goes in as common purple, which is a different plant to
        // pull, so it gets its own row rather than hiding inside a 73. The BED
        // callouts still say SPA 73 -- that is what the sheet draws and the bed
        // view reports the drawing, not the substitution.
        ["Miss Kim Lilac", 46],
        // "(#2 sub)" is in the NAME, following the "Gold Crinkled Hair Grass
        // (sub)" convention, so the substitution and the pot exception are both
        // visible on the office TV without opening the notes. The name is the
        // storage key -- slug() makes this "hardy-purple-common-lilac-2-sub" --
        // so it must not be edited again once counts exist against it. Renamed
        // the same day the row was added, while it was still 0 and no backup
        // referenced it. That window is closed now.
        ["Hardy Purple Common Lilac (#2 sub)", 27],
        ["Late Lilac", 44],
        ["Rugosa Rose", 33]
      ]},
      grasses: { label: "Iris, perennials &amp; grasses", items: [
        ["Alaska Flag Iris", 338],
        ["Karl Foerster Reed Grass", 164],
        ["False Spirea", 252],
        ["Bishop&#39;s Weed (Goutweed)", 305],
        ["Gold Crinkled Hair Grass (sub)", 132],
        ["Hosta Patriot", 83],
        ["Sweet Woodruff", 67],
        ["Goatsbeard", 10]
      ]}
    },
    flags: [
      // Four of these closed out 9/20. Miss Kim and False Spirea were the two
      // schedule-vs-callout shortages; both are settled now, so only Miss Kim
      // keeps a line and only because the substitute is worth recording.
      // Bron's last load and the order-number mismatch are gone -- the crew
      // knows about the load, and the number was only ever "probably reissued".
      // A note nobody still needs is the reason this panel grew.
      "&#9989; <strong>Miss Kim Lilac &mdash; handled.</strong> Callouts total 73 against a schedule of 45. The 46 on hand went in; the remaining <strong>27</strong> go in as <strong>common purple lilac in #2 containers</strong>. The shrub spec on this job is <strong>#5, 18&quot; minimum at planting</strong>, so that is a size exception and it has been <strong>accepted</strong> &mdash; written down here because a smaller pot is the kind of thing that gets raised at walkthrough, and the answer should not have to be remembered.",
      "&#127807; <strong>Hair grass</strong> &mdash; <strong>Tufted Hair Grass is the APPROVED substitute</strong> for Gold Crinkled, routed through Chris. 68 on hand of 132, <strong>64 still to come</strong>. The species question is closed &mdash; order the balance as Tufted."
    ],
    // Spanish, one per note above, same order. Shown only while the count
    // matches -- a note added in English alone shows the English set.
    flagsEs: [
      "&#9989; <strong>Lila 'Miss Kim' &mdash; resuelto.</strong> Las anotaciones suman 73 contra un programa de 45. Las 46 que hab&iacute;a ya se plantaron; las <strong>27</strong> restantes van como <strong>lila com&uacute;n morada en contenedores #2</strong>. La especificaci&oacute;n de arbustos en este trabajo es <strong>#5, m&iacute;nimo 18&quot; al plantar</strong>, as&iacute; que es una excepci&oacute;n de tama&ntilde;o y ya fue <strong>aceptada</strong> &mdash; se anota aqu&iacute; porque una maceta m&aacute;s chica es lo que sale en la revisi&oacute;n final, y la respuesta no deber&iacute;a depender de la memoria.",
      "&#127807; <strong>Pasto (hair grass)</strong> &mdash; <strong>el pasto de mech&oacute;n es el sustituto APROBADO</strong> del ondulado dorado, aprobado a trav&eacute;s de Chris. Hay 68 de 132, <strong>faltan 64</strong>. La pregunta de la especie ya est&aacute; cerrada &mdash; pide el resto como pasto de mech&oacute;n."
    ]
  },
  charter: {
    label: "Wasilla Charter Academy",
    short: "Charter",
    groups: {
      trees: { label: "Trees", items: [
        ["Paper Birch", 6],
        ["Parkland Pillar Birch", 2]
      ]},
      shrubs: { label: "Shrubs", items: [
        ["Goldflame Spirea", 28],
        ["Hedge Cotoneaster", 34]
      ]},
      grasses: { label: "Grasses", items: [
        ["Karl Foerster Reed Grass", 134]
      ]}
    },
    flags: []
  },
  baxter: {
    label: "Baxter Family Housing",
    short: "Baxter",
    groups: {
      trees: { label: "Trees", items: [
        ["Paper Birch", 8],
        ["Prairiefire Crabapple", 8],
        ["White Spruce", 9],
        ["Hardy Purple Common Lilac", 2, true]
      ]},
      shrubs: { label: "Shrubs", items: [
        ["Yellow Potentilla", 55],
        ["Birchleaf Spirea", 26],
        ["Creeping Juniper", 11],
        ["Dwarf American Cranberry", 14],
        ["Rugosa Rose", 38]
      ]},
      grasses: { label: "Iris", items: [
        ["Alaska Flag Iris", 36]
      ]}
    },
    flags: []
  },
  wsrcc: {
    label: "WSRCC &mdash; 5800 Boundary Ave",
    short: "WSRCC",
    // Targets are the L501 Planting Schedule of the 01/29/2026 PERMIT DRAWINGS
    // (MOA stamp X26-1126, 04/21/26), which superseded the set these were first
    // built from. Quaking Aspen is gone -- it is not on the current plan at all
    // -- and Miss Canada Lilac is new. Everything totals 1008.
    //
    // "Colorado Green Spruce" keeps its old NAME on purpose: the schedule reads
    // Picea pungens 'Fat Albert', a BLUE cultivar, and that question is open
    // with Corvus. Renaming it here would both assert an unanswered question and
    // orphan the 20 already counted against this key.
    groups: {
      trees: { label: "Trees", items: [
        ["Columnar Swedish Aspen", 19],
        ["Helena Maple", 4],
        ["Paper Birch", 7],
        ["Scotch Pine", 16],
        ["Colorado Green Spruce", 19]
      ]},
      shrubs: { label: "Shrubs", items: [
        ["Abbottswood Potentilla", 118],
        ["Goldfinger Potentilla", 96],
        ["Pink Beauty Potentilla", 121],
        ["Birchleaf Spirea", 65],
        ["Ivory Halo Dogwood", 155],
        ["Red-Twig Dogwood", 118],
        ["Hedge Cotoneaster", 59],
        ["Miss Canada Lilac", 72]
      ]},
      grasses: { label: "Grasses", items: [
        ["Karl Foerster Reed Grass", 65],
        ["Overdam Reed Grass", 74]
      ]}
    },
    flags: [
      "&#9888;&#65039; <strong>The plan changed and these targets moved.</strong> The current set is dated 01/29/2026 and was approved by the Municipality on 04/21/26; it reached Titan on 09/16/26. <strong>Quaking Aspen is off this job entirely</strong> &mdash; it was 35, it is now not on the drawing. Trees dropped by 75 and shrubs rose by 75, because zone N sits under overhead lines: the revision replaced 71 required trees with 6&#39; utility shrubs.",
      "&#9888;&#65039; <strong>Miss Canada Lilac &mdash; 72 needed, none sourced.</strong> New to this revision, so it has never been on an order. Spec is <strong>6&#39; minimum height</strong>, and that height is code, not preference: L101 uses these in lieu of 71 required trees in zone N plus 1 in W1. The <strong>12</strong> in the nursery (counted 9/21, up from the 9 on the old inventory snapshot) are 5 gal and will not meet it, so they stay OUT of this job's count on purpose &mdash; they are nursery stock, not sourced material, and moving them over has not been approved. They ride in a substitution package, still unsettled &mdash; it may or may not go through Martin. Long lead &mdash; do not let this sit.",
      "&#127795; <strong>Matt wants Amur Maple in that package</strong> &mdash; the Bailey stock, as a substitution to put forward, <strong>not</strong> an approved one and not submitted. Recorded so it is on the page when the package gets settled. Two things to check before it is offered: the Bailey Amur Maple are <strong>5 gal</strong>, so they hit the same 6&#39; wall the lilacs do, and the yard figure for them has <strong>never been counted</strong> &mdash; it comes off the 8/11 inventory snapshot, which the 9/21 lilac count proved wrong in both directions. Count them before quoting a number to anybody.",
      "&#9888;&#65039; <strong>Pink Beauty Potentilla</strong> &mdash; 62 sorted, short 59 of 121. 3 additional units were rejected on quality and not counted.",
      "&#9989; <strong>Red-Twig Dogwood shows 176 against a target of 118 &mdash; that is correct, not a miscount.</strong> Ivory Halo is short and Chris and Todd approved filling that gap with surplus Red-Twig. 118 spec + 58 covering the Ivory Halo shortfall = 176. Total dogwood lands at 273 &mdash; 155 + 118 &mdash; and 97 + 176 on hand is exactly 273."
    ],
    // Spanish, one per note above, same order. Shown only while the count
    // matches -- a note added in English alone shows the English set.
    flagsEs: [
      "&#9888;&#65039; <strong>El plano cambi&oacute; y estas metas se movieron.</strong> El juego actual es del 01/29/2026 y el Municipio lo aprob&oacute; el 04/21/26; le lleg&oacute; a Titan el 09/16/26. <strong>El &aacute;lamo tembl&oacute;n sali&oacute; por completo de este trabajo</strong> &mdash; eran 35, ya no est&aacute; en el plano. Los &aacute;rboles bajaron 75 y los arbustos subieron 75, porque la zona N queda debajo de cables el&eacute;ctricos: la revisi&oacute;n cambi&oacute; 71 &aacute;rboles requeridos por arbustos de servicio de 6&#39;.",
      "&#9888;&#65039; <strong>Lila 'Miss Canada' &mdash; se necesitan 72, ninguna conseguida.</strong> Es nueva en esta revisi&oacute;n, as&iacute; que nunca ha estado en un pedido. La especificaci&oacute;n es <strong>6&#39; de altura m&iacute;nima</strong>, y esa altura es c&oacute;digo, no gusto: la L101 las usa en lugar de 71 &aacute;rboles requeridos en la zona N m&aacute;s 1 en W1. Las <strong>12</strong> del vivero (contadas el 9/21, eran 9 en la foto vieja del inventario) son de 5 gal y no llegan, as&iacute; que se quedan FUERA del conteo de este trabajo a prop&oacute;sito &mdash; son del vivero, no material conseguido, y pasarlas no se ha aprobado. Van en un paquete de sustituci&oacute;n que todav&iacute;a no se decide &mdash; puede o no ir por Martin. Tardan en llegar &mdash; no lo dejes esperando.",
      "&#127795; <strong>Matt quiere arce de Amur en ese paquete</strong> &mdash; el de Bailey, como sustituci&oacute;n para proponer, <strong>no</strong> aprobada y no enviada. Se anota para que est&eacute; aqu&iacute; cuando se decida el paquete. Dos cosas antes de ofrecerlo: los arces de Amur de Bailey son de <strong>5 gal</strong>, as&iacute; que chocan con el mismo m&iacute;nimo de 6&#39; que las lilas, y la cantidad en el patio <strong>nunca se ha contado</strong> &mdash; sale de la foto del inventario del 8/11, que el conteo de lilas del 9/21 demostr&oacute; que estaba mal para los dos lados. C&uacute;entalos antes de darle un n&uacute;mero a nadie.",
      "&#9888;&#65039; <strong>Potentila 'Pink Beauty'</strong> &mdash; 62 clasificadas, faltan 59 de 121. Otras 3 se rechazaron por calidad y no se contaron.",
      "&#9989; <strong>El cornejo de tallo rojo marca 176 contra una meta de 118 &mdash; eso est&aacute; bien, no es un error de conteo.</strong> Falta cornejo 'Ivory Halo' y Chris y Todd aprobaron cubrir ese hueco con el sobrante de tallo rojo. 118 de especificaci&oacute;n + 58 para cubrir lo que falta de 'Ivory Halo' = 176. El total de cornejo queda en 273 &mdash; 155 + 118 &mdash; y 97 + 176 que hay son exactamente 273."
    ]
  },

  // Palmer and Raspberry come off BuilderTrend PROPOSALS, not plan sets. There
  // are no bed callouts for either, so both are species-only -- hasBedView()
  // covers that automatically by listing only h2s and wsrcc. Neither appears in
  // SEED, so every count starts at zero, which is the truth: nothing has
  // arrived for either job.
  palmer: {
    label: "Palmer Public Library",
    short: "Palmer",
    groups: {
      trees: { label: "Trees", items: [
        ["Paper Birch", 24],
        ["Columnar Swedish Aspen", 9],
        ["Quaking Aspen", 7],
        ["Helena Maple", 3],
        ["Subalpine Fir Arizonica", 1]
      ]},
      // Lady Fern sits under Shrubs because that is where the PROPOSAL puts
      // it, and the proposal is the document this job gets ordered and
      // reconciled against. It is not a shrub -- Matt: "it does belong as a
      // perennial, it grows brand new every year" -- and it dies back to the
      // ground each winter. Matching the source document beats being right
      // about botany here. Do not move it.
      shrubs: { label: "Shrubs", items: [
        ["Lady Fern", 74],
        ["Rugosa Rose", 37],
        ["Birchleaf Spirea", 28],
        ["Alpine Currant", 24],
        ["Vanhoutte Spirea", 19]
      ]},
      grasses: { label: "Grasses", items: [
        ["Feather Reed Grass", 224],
        ["Gold Crinkled Hair Grass", 76]
      ]}
    },
    flags: [
      "&#128209; <strong>These counts come from the proposal</strong> printed 2/9/26, not from a plan set. There are no bed callouts, so there is no bed view for this job yet. Ask Chris for the planting plan and the plant schedule &mdash; WSRCC only reconciled because it had both.",
      "&#127807; <strong>Gold Crinkled Hair Grass, 76</strong> &mdash; the same species Home2Suites is substituting with Tufted through Chris. Expect the same call here before ordering."
    ],
    // Spanish, one per note above, same order. Shown only while the count
    // matches -- a note added in English alone shows the English set.
    flagsEs: [
      "&#128209; <strong>Estos conteos salen de la propuesta</strong> impresa el 2/9/26, no de un juego de planos. No hay anotaciones de camas, as&iacute; que todav&iacute;a no hay vista por cama para este trabajo. P&iacute;dele a Chris el plano de plantaci&oacute;n y el programa de plantas &mdash; WSRCC solo cuadr&oacute; porque ten&iacute;a los dos.",
      "&#127807; <strong>Pasto ondulado dorado, 76</strong> &mdash; la misma especie que Home2Suites est&aacute; sustituyendo con pasto de mech&oacute;n a trav&eacute;s de Chris. Espera la misma decisi&oacute;n aqu&iacute; antes de pedir."
    ]
  },
  raspberry: {
    label: "Raspberry Townhomes &mdash; Lot 4",
    short: "Raspberry",
    groups: {
      trees: { label: "Trees", items: [
        ["Paper Birch", 31],
        ["Colorado Green Spruce", 22],
        ["Helena Maple", 15],
        ["Columnar Swedish Aspen", 13],
        ["Lodgepole Pine", 13]
      ]},
      shrubs: { label: "Shrubs", items: [
        ["Hedge Cotoneaster", 111],
        ["Froebelii Spirea", 83],
        ["Gold Drop Potentilla", 81],
        ["Pink Beauty Potentilla", 71],
        ["Alpine Currant", 42],
        ["Flowering Raspberry", 12]
      ]}
    },
    flags: [
      "&#128209; <strong>These counts come from the proposal</strong> printed 7/7/26, not from a plan set. It cites drawings dated 1.21.25 and sheet <strong>L503-1</strong>, so a set exists &mdash; ask Chris for the planting plan and the plant schedule before treating these as final.",
      "&#9888;&#65039; <strong>94 trees at 2&quot; caliper.</strong> That is the size wall in the 2027 sourcing work, where Martin is the only vendor breaking it. Raise availability before this job is scheduled, not after."
    ],
    // Spanish, one per note above, same order. Shown only while the count
    // matches -- a note added in English alone shows the English set.
    flagsEs: [
      "&#128209; <strong>Estos conteos salen de la propuesta</strong> impresa el 7/7/26, no de un juego de planos. Cita planos del 1.21.25 y la hoja <strong>L503-1</strong>, as&iacute; que s&iacute; existe un juego &mdash; p&iacute;dele a Chris el plano de plantaci&oacute;n y el programa de plantas antes de tomar esto como final.",
      "&#9888;&#65039; <strong>94 &aacute;rboles de 2&quot; de calibre.</strong> Es el l&iacute;mite de tama&ntilde;o del trabajo de compras de 2027, donde Martin es el &uacute;nico proveedor que lo rompe. Pregunta por disponibilidad antes de programar este trabajo, no despu&eacute;s."
    ]
  },
  // Titan's own new building at the pit. Counts are Chris's scope list from
  // his "NTMB Landscaping Project" email of 9/18/26, taken off the landscape
  // permit drawings dated 7/16/25 -- not a proposal, and not a plan schedule
  // anyone has reconciled. 14 trees + 83 shrubs = 97. The plan is to serve it
  // from stock already in the nursery, so it is demand, not a buy.
  ntmb: {
    label: "Titan Maintenance Building &mdash; the pit",
    short: "NTMB",
    groups: {
      trees: { label: "Trees", items: [
        ["Quaking Aspen", 9],
        ["Helena Maple", 5]
      ]},
      shrubs: { label: "Shrubs", items: [
        ["Vanhoutte Spirea", 28],
        ["Early Forsythia", 20],
        ["Pink Beauty Potentilla", 19],
        ["Hedge Cotoneaster", 16]
      ]}
    },
    flags: [
      "&#128209; <strong>These counts come from Chris&#39;s scope email</strong> of 9/18/26, off landscape permit drawings dated <strong>7/16/25</strong> &mdash; 14 months old. Trees 2&quot; cal, shrubs #5.",
      "&#9888;&#65039; <strong>Provisional.</strong> Todd: grade and fences are the musts, landscaping is not settled. Gage: Corvus has to update the civil and landscape drawings before anything changes. Do not order against this.",
      "&#127807; <strong>Nursery stock first.</strong> Chris asked whether to substitute what the nursery has for what it does not. That call is still open."
    ],
    // Spanish, one per note above, same order. Shown only while the count
    // matches -- a note added in English alone shows the English set.
    flagsEs: [
      "&#128209; <strong>Estos conteos salen del correo de alcance de Chris</strong> del 9/18/26, de los planos del permiso de paisajismo del <strong>7/16/25</strong> &mdash; de hace 14 meses. &Aacute;rboles de 2&quot; de calibre, arbustos #5.",
      "&#9888;&#65039; <strong>Provisional.</strong> Todd: la nivelaci&oacute;n y las cercas son lo obligatorio, el paisajismo no est&aacute; decidido. Gage: Corvus tiene que actualizar los planos civiles y de paisajismo antes de que cambie algo. No pidas con esto.",
      "&#127807; <strong>Primero lo del vivero.</strong> Chris pregunt&oacute; si se sustituye lo que no hay con lo que s&iacute; tiene el vivero. Esa decisi&oacute;n sigue abierta."
    ]
  }
};
