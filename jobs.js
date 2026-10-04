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
    // Boulders are NOT a plant group, on purpose. Every loop over `groups`
    // means plants -- the status page's "plants still needed", the Subs picker,
    // the Pull button, the vendor lookup -- and a rock in any of them is wrong.
    // Counts are Chris's, by email 9/28/26. The size is the L501 detail 7
    // schedule, identical on the Home2Suites, WSRCC and Charter sheets.
    boulders: {
      plan: "./beds-boulders/h2s-v1.jpg",
      items: [
        ["Type A Boulder (Class 4)", 18, "12&#39; &plusmn;1&#39; around &middot; 45&quot; &plusmn;3&quot; tall"],
        ["Type B Boulder (Class 3)", 28, "9&#39; &plusmn;1&#39; around &middot; 33&quot; &plusmn;3&quot; tall"]
      ]
    },
    // L102 General Note 5: moose fence at every deciduous tree, detail 4/L501.
    // Every tree on this job is deciduous, so the count is the tree list's.
    // stakesPerTree 0: detail 1/L501 shows no stakes; "Wood Stakes and Ties"
    // appears only in the submittal list. Jeremi flagged it 10/2/26 -- open.
    moose: {
      stakesPerTree: 0,
      note: "&#10067; <strong>Tree stakes?</strong> The tree planting detail shows <strong>none</strong>; only the submittal list mentions wood stakes. Ask Chris or Corvus before buying stakes.",
      noteEs: "&#10067; <strong>&iquest;Estacas para los &aacute;rboles?</strong> El detalle de plantaci&oacute;n <strong>no muestra ninguna</strong>; solo la lista de entregas menciona estacas de madera. Preg&uacute;ntale a Chris o a Corvus antes de comprar estacas."
    },
    flags: [
      // Four of these closed out 9/20. Miss Kim and False Spirea were the two
      // schedule-vs-callout shortages; both are settled now, so only Miss Kim
      // keeps a line and only because the substitute is worth recording.
      // Bron's last load and the order-number mismatch are gone -- the crew
      // knows about the load, and the number was only ever "probably reissued".
      // A note nobody still needs is the reason this panel grew.
      "&#9989; <strong>Miss Kim Lilac &mdash; handled.</strong> Callouts total 73 against a schedule of 45. The 46 on hand went in; the remaining <strong>27</strong> go in as <strong>common purple lilac in #2 containers</strong>. The shrub spec on this job is <strong>#5, 18&quot; minimum at planting</strong>, so that is a size exception and it has been <strong>accepted</strong> &mdash; written down here because a smaller pot is the kind of thing that gets raised at walkthrough, and the answer should not have to be remembered.",
      // Rewritten 9/28: the old note called this closed. Tufted IS approved, but
      // there is not enough of it, so the balance is an open substitution again.
      "&#9888;&#65039; <strong>Hair grass &mdash; 64 short, NOT settled. Top priority.</strong> Tufted Hair Grass is the approved substitute for Gold Crinkled, but there are only <strong>68 of 132</strong> and no more to be had. The remaining <strong>64</strong> have to go in as a <strong>different species</strong>. Matt&#39;s pick: <strong>forget-me-nots from Bell&#39;s Nursery</strong> &mdash; <strong>not approved yet</strong>. Route it through Chris the way the Tufted was: this is a permit set, and the sheet says to contact the landscape architect before any revision.",
      // Matt, 9/28/26: bought for this job and on site. /net-need reads this so
      // the yard's Blue Rug/Wilton (#147) is not counted against Home2.
      "&#9989; <strong>Creeping Juniper &mdash; bought and on site.</strong> The <strong>70</strong> for this job were bought for it and are on site, not planted yet. <strong>Do not pull juniper from the yard for Home2Suites.</strong>",
      // Matt, 9/28/26: 19 Helena were bought for WSRCC; its revision cut it to 4.
      // The other 15 are staged on THIS site until moved to the pit -- and this
      // job needs 22 Helena of its own, so the crew has to be told they are not.
      "&#9888;&#65039; <strong>15 Helena Maple on this site belong to Raspberry.</strong> They were bought for WSRCC and are staged here until they move to the pit nursery. <strong>Do not plant them at Home2Suites.</strong>"
    ],
    // Spanish, one per note above, same order. Shown only while the count
    // matches -- a note added in English alone shows the English set.
    flagsEs: [
      "&#9989; <strong>Lila 'Miss Kim' &mdash; resuelto.</strong> Las anotaciones suman 73 contra un programa de 45. Las 46 que hab&iacute;a ya se plantaron; las <strong>27</strong> restantes van como <strong>lila com&uacute;n morada en contenedores #2</strong>. La especificaci&oacute;n de arbustos en este trabajo es <strong>#5, m&iacute;nimo 18&quot; al plantar</strong>, as&iacute; que es una excepci&oacute;n de tama&ntilde;o y ya fue <strong>aceptada</strong> &mdash; se anota aqu&iacute; porque una maceta m&aacute;s chica es lo que sale en la revisi&oacute;n final, y la respuesta no deber&iacute;a depender de la memoria.",
      "&#9888;&#65039; <strong>Pasto (hair grass) &mdash; faltan 64, NO est&aacute; resuelto. Prioridad n&uacute;mero uno.</strong> El pasto de mech&oacute;n es el sustituto aprobado del ondulado dorado, pero solo hay <strong>68 de 132</strong> y no se consiguen m&aacute;s. Las <strong>64</strong> restantes tienen que ser de <strong>otra especie</strong>. La propuesta de Matt: <strong>nomeolvides (forget-me-not) de Bell&#39;s Nursery</strong> &mdash; <strong>todav&iacute;a no aprobada</strong>. P&aacute;salo por Chris como se hizo con el pasto de mech&oacute;n: es un juego de planos de permiso, y la hoja dice que hay que consultar al arquitecto paisajista antes de cualquier cambio.",
      "&#9989; <strong>Enebro rastrero &mdash; comprado y en el sitio.</strong> Los <strong>70</strong> de este trabajo se compraron para &eacute;l y ya est&aacute;n en el sitio, todav&iacute;a sin plantar. <strong>No saques enebro del vivero para Home2Suites.</strong>",
      "&#9888;&#65039; <strong>15 arces 'Helena' en este sitio son de Raspberry.</strong> Se compraron para WSRCC y est&aacute;n aqu&iacute; hasta que se lleven al vivero del pit. <strong>No los plantes en Home2Suites.</strong>"
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
    boulders: {
      // Jeremi's L1.1 overlay (10/2/26): a red, b blue, c orange. Chris's v1
      // markup left the c's uncoloured under the b circles.
      plan: "./beds-boulders/charter-v2.jpg",
      items: [
        ["Type A Boulder (Class 4)", 7, "12&#39; &plusmn;1&#39; around &middot; 45&quot; &plusmn;3&quot; tall"],
        ["Type B Boulder (Class 3)", 13, "9&#39; &plusmn;1&#39; around &middot; 33&quot; &plusmn;3&quot; tall"],
        ["Type C Boulder (Class 2)", 8, "6&#39; &plusmn;1&#39; around &middot; 21&quot; &plusmn;3&quot; tall"]
      ],
      // Matt, 10/3/26: the plan wins over Chris's 9/28 email (6 A, 13 B, no C).
      // Corvus L1.1 has three callouts -- (2)A (3)B (3)C, (4)A (8)B (5)C,
      // (1)A (2)B -- for 7 / 13 / 8. Jeremi's 10/2 map package agrees. The
      // sheet draws only 6 a's, so one Type A has no spot.
      note: "&#9888;&#65039; <strong>One Type A has no spot.</strong> The plan calls for 7 Type A but draws 6. Bring all 7; the owner&#39;s rep places boulders in the field anyway.",
      noteEs: "&#9888;&#65039; <strong>Una roca tipo A no tiene lugar.</strong> El plano pide 7 tipo A pero dibuja 6. Trae las 7; el representante del due&ntilde;o ubica las rocas en el sitio de todos modos."
    },
    // L5.1 detail 4, the same moose detail as Home2's. Unlike Home2 this sheet
    // has a staked tree detail: "(3) 2x2x6' wood stakes embedded 24" in ground."
    moose: {
      stakesPerTree: 3
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
    // Plan found 9/30/26 on the Trello card: "Baxter Landscaping Bid Set.pdf",
    // sheet L1 (The Boutet Company). Its schedule: "9 Boulders, 3' min diameter
    // (To protect plant materials from snow removal equipment. Seasonally
    // install reflective edge markers)". The size is Baxter's OWN, not borrowed
    // from the L501 detail the other three jobs share -- so `schedule: null`.
    //
    // The sheet DRAWS 10 symbols (counted by eye at 600 dpi, bed by bed; each is
    // rotated differently, so shape-matching could not do it). The target stays
    // at 9 -- the schedule's number and Chris's -- and the gap is a note.
    boulders: {
      plan: "./beds-boulders/baxter-v1.jpg",
      planCaption: "Where they go — H5 sheet L1, all 10 drawn circled. Tap to zoom.",
      schedule: null,
      items: [
        ["Class 3 Boulder", 9, "3&#39; min diameter"]
      ],
      note: "&#9888;&#65039; <strong>Plan draws 10, schedule says 9.</strong> Found on sheet L1 of the H5 bid set: 1 at the west bed end (McLean Pl stop sign), 2 in the mailbox light-pole island, 2 in Area A (fire hydrant), 2 in Area B (light pole), 3 on the Baxter Rd beds. The schedule and Chris both say <strong>9</strong>. They sit at bed ends <strong>to protect plants from the snow plows</strong> &mdash; reflective edge markers go on seasonally. Ask Chris which one comes off, or place 10.",
      noteEs: "&#9888;&#65039; <strong>El plano dibuja 10, el programa dice 9.</strong> Est&aacute; en la hoja L1 del juego de H5: 1 al final de la cama oeste (se&ntilde;al de alto de McLean Pl), 2 en la isla del poste de luz junto a los buzones, 2 en el &Aacute;rea A (hidrante), 2 en el &Aacute;rea B (poste de luz), 3 en las camas de Baxter Rd. El programa y Chris dicen <strong>9</strong>. Van al final de las camas <strong>para proteger las plantas de las m&aacute;quinas quitanieves</strong> &mdash; los marcadores reflectantes se ponen por temporada. Preg&uacute;ntale a Chris cu&aacute;l se quita, o coloca 10."
    },
    flags: [
      // Matt, 9/28/26. The 38 were bought on Dan's list for this job, so they
      // are not a claim on the yard. /net-need reads this note: without it the
      // Bailey rugosa gets split three ways and Palmer is told to buy 37.
      "&#9989; <strong>Rugosa Rose &mdash; covered by Danny&#39;s order.</strong> The <strong>38</strong> for this job came from Danny (Alaska Trees). <strong>Do not pull Bailey rugosa from the yard for Baxter</strong> &mdash; that stock is allocated to Home2Suites and Palmer.",
      // Matt, 9/28/26, same as Home2's: bought for this job, on site.
      "&#9989; <strong>Creeping Juniper &mdash; bought and on site.</strong> The <strong>11</strong> for this job were bought for it and are on site, not planted yet. <strong>Do not pull juniper from the yard for Baxter.</strong>"
    ],
    flagsEs: [
      "&#9989; <strong>Rosa rugosa &mdash; cubierta por el pedido de Danny.</strong> Las <strong>38</strong> de este trabajo vinieron de Danny (Alaska Trees). <strong>No saques rugosa de Bailey del vivero para Baxter</strong> &mdash; ese material est&aacute; asignado a Home2Suites y Palmer.",
      "&#9989; <strong>Enebro rastrero &mdash; comprado y en el sitio.</strong> Los <strong>11</strong> de este trabajo se compraron para &eacute;l y ya est&aacute;n en el sitio, todav&iacute;a sin plantar. <strong>No saques enebro del vivero para Baxter.</strong>"
    ]
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
    boulders: {
      plan: "./beds-boulders/wsrcc-v1.jpg",
      items: [
        ["Type A Boulder (Class 4)", 4, "12&#39; &plusmn;1&#39; around &middot; 45&quot; &plusmn;3&quot; tall"],
        ["Type B Boulder (Class 3)", 16, "9&#39; &plusmn;1&#39; around &middot; 33&quot; &plusmn;3&quot; tall"],
        ["Type C Boulder (Class 2)", 4, "6&#39; &plusmn;1&#39; around &middot; 21&quot; &plusmn;3&quot; tall"]
      ]
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
      // Rewritten 9/28. Matt: order the right plant for this job, this fall or
      // for spring delivery -- no substitution. The old note predicted one.
      "&#127807; <strong>Gold Crinkled Hair Grass, 76 &mdash; order the SPECIFIED plant, no substitute.</strong> Home2Suites ran out of options on this grass and had to sub; Palmer will not. Book it this fall or for spring delivery. <strong>No source yet:</strong> none of the five vendor lists read so far (Seed-n-Tree, Bron, McKay, Bailey, Stewart) carry it.",
      // Matt, 9/29/26: the 3 Helena in the nursery (Inventory #89, 1.5" B&B) go
      // to this job. They are older yard stock, which the spec rule does not
      // credit on its own -- this note is Matt's exception, and /net-need reads
      // it, so Palmer buys 0 Helena instead of 3.
      "&#9989; <strong>Helena Maple &mdash; all 3 from the nursery.</strong> The 3 in the yard (Inventory #89, 1.5&quot; B&amp;B) are held for Palmer. <strong>Buy 0. Do not pull them for another job.</strong>"
    ],
    // Spanish, one per note above, same order. Shown only while the count
    // matches -- a note added in English alone shows the English set.
    flagsEs: [
      "&#128209; <strong>Estos conteos salen de la propuesta</strong> impresa el 2/9/26, no de un juego de planos. No hay anotaciones de camas, as&iacute; que todav&iacute;a no hay vista por cama para este trabajo. P&iacute;dele a Chris el plano de plantaci&oacute;n y el programa de plantas &mdash; WSRCC solo cuadr&oacute; porque ten&iacute;a los dos.",
      "&#127807; <strong>Pasto ondulado dorado, 76 &mdash; pide la planta ESPECIFICADA, sin sustituto.</strong> En Home2Suites se acabaron las opciones con este pasto y hubo que sustituir; en Palmer no. P&iacute;delo este oto&ntilde;o o para entrega en primavera. <strong>Todav&iacute;a no hay proveedor:</strong> ninguna de las cinco listas le&iacute;das hasta ahora (Seed-n-Tree, Bron, McKay, Bailey, Stewart) lo tiene.",
      "&#9989; <strong>Arce 'Helena' &mdash; los 3 salen del vivero.</strong> Los 3 del vivero (inventario #89, 1.5&quot; B&amp;B) est&aacute;n apartados para Palmer. <strong>No se compran. No los saques para otro trabajo.</strong>"
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
      "&#9888;&#65039; <strong>94 trees at 2&quot; caliper.</strong> That is the size wall in the 2027 sourcing work, where Martin is the only vendor breaking it. Raise availability before this job is scheduled, not after.",
      // Matt, 9/28/26. /net-need reads this: these 15 are not in the Inventory
      // sheet (#89 reads 0) until they reach the pit, so without this note it
      // would tell Matt to buy 15 Helena Titan already owns.
      "&#9989; <strong>Helena Maple &mdash; all 15 already bought.</strong> Bought for WSRCC and not needed after its revision. Staged at Home2Suites until they move to the pit nursery. <strong>Check caliper when they move:</strong> this job specs 2&quot;."
    ],
    // Spanish, one per note above, same order. Shown only while the count
    // matches -- a note added in English alone shows the English set.
    flagsEs: [
      "&#128209; <strong>Estos conteos salen de la propuesta</strong> impresa el 7/7/26, no de un juego de planos. Cita planos del 1.21.25 y la hoja <strong>L503-1</strong>, as&iacute; que s&iacute; existe un juego &mdash; p&iacute;dele a Chris el plano de plantaci&oacute;n y el programa de plantas antes de tomar esto como final.",
      "&#9888;&#65039; <strong>94 &aacute;rboles de 2&quot; de calibre.</strong> Es el l&iacute;mite de tama&ntilde;o del trabajo de compras de 2027, donde Martin es el &uacute;nico proveedor que lo rompe. Pregunta por disponibilidad antes de programar este trabajo, no despu&eacute;s.",
      "&#9989; <strong>Arce 'Helena' &mdash; los 15 ya est&aacute;n comprados.</strong> Se compraron para WSRCC y no se usaron despu&eacute;s de su revisi&oacute;n. Est&aacute;n en Home2Suites hasta que se lleven al vivero del pit. <strong>Revisa el calibre al moverlos:</strong> este trabajo pide 2&quot;."
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

// ---- Moose fence ----------------------------------------------------------
// A job opts in with a `moose` block. Like `boulders`, it is NOT a plant group:
// every loop over `groups` means plants, and a cage in one is wrong.
//
// Corvus "Moose Protection" detail (4/L501 Home2Suites, 4/L5.1 Charter):
// "Four posts required per tree", "7'-0" between poles", 10' green steel
// T-post with spade, 4'-0" welded wire 2"x4" PVC coated, "two (2) metal ties
// per post". Bottom of wire 3'-2" above grade -- post set 2'-10" deep.
var MOOSE_DETAIL = { postsPerTree: 4, sideFt: 7, tiesPerPost: 2 };

// One cage per tree, and the tree count is the job's own tree list -- typed
// once, so a corrected tree count corrects the fence with it. Both jobs that
// carry a fence are all-deciduous; a conifer added to one would need this to
// change, because the detail covers deciduous trees only.
function mooseTrees(job){
  return job.groups.trees.items.reduce(function(n, r){ return n + r[1]; }, 0);
}

// The whole-job material list for `trees` cages.
// Returns {posts, wireFt, ties, stakes}. moose.test.js has the worked numbers.
// Wire is the bare perimeter (4 sides x 7' = 28 LF a cage), the same as
// Jeremi's takeoff: no overlap where the cage closes, no roll waste. Matt,
// 10/3/26 -- if an allowance is wanted, it goes in as its own number.
function mooseMaterials(trees, stakesPerTree){
  var d = MOOSE_DETAIL;
  var posts = trees * d.postsPerTree;
  return {
    posts: posts,
    wireFt: trees * d.postsPerTree * d.sideFt,
    ties: posts * d.tiesPerPost,
    stakes: trees * (stakesPerTree || 0)
  };
}

// The material line both pages print, off mooseMaterials(). Called with one
// tree it is the per-cage line; with the job's trees it is the order.
// `es` writes it in Spanish -- built here, not by the app's word-swap
// translator, because the numbers sit in the middle of every phrase.
function mooseKitText(m, es, lead){
  function n(v){ return v.toLocaleString("en-US"); }
  var parts = es ? [
    n(m.posts) + " postes T (10' verdes, con pala)",
    n(m.wireFt) + " pies lineales de malla (4' de alto, 2\"x4\", PVC)",
    n(m.ties) + " amarres de metal"
  ] : [
    n(m.posts) + " T-posts (10' green, with spade)",
    n(m.wireFt) + " LF wire (4' tall, 2\"x4\" mesh, PVC coated)",
    n(m.ties) + " ties (metal)"
  ];
  if(m.stakes) parts.push(n(m.stakes) + (es ? " estacas de madera (2x2x6')" : " wood stakes (2x2x6')"));
  return (lead ? lead + " " : "") + parts.join(" · ");
}
