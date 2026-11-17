/* ================= TEXTOS DE LA COCINA AMPLIADA, EL LIBRO DE MEJORAS, LA TERRAZA Y EL SÚPER ================= */
LX.es.sauce = ['salsa blanca', 'picante', 'alioli', 'barbacoa'];
LX.en.sauce = ['white sauce', 'hot sauce', 'aioli', 'barbecue'];
LX.ro.sauce = ['sos alb', 'sos iute', 'aioli', 'sos barbecue'];
Object.assign(STR.es, {
  u_take_order: 'Tomar nota a {0}', u_tray_empty: 'El barreño de {0} está vacío. Haz salsa en la olla del almacén.', u_spoon: 'Echar {0} con la cuchara',
  u_jc_wrong: 'Esta garrafa es de {0}, no de {1}', u_jc_empty: 'La garrafa está vacía', u_pour_stop: 'Dejar de verter', u_tray_full: 'El barreño de {0} está lleno',
  u_pour_jc: 'Verter la garrafa en el barreño de {0} ({1}%)', u_sb_fill: 'Rellenar el bote con la cuchara', u_tray_lv: 'Barreño de {0} · {1}%', u_tray_low2: ' · queda poca',
  u_sb_full: 'El bote está lleno', u_sb_fill_jc: 'Rellenar el bote con la garrafa', u_sb_gone: 'El bote de {0} lo tiene alguien', u_sb_emptyx: ' (vacío)',
  u_pot_jc: 'Deja la garrafa al lado de la olla primero', u_pot_hands: 'Necesitas las manos libres para remover', u_pot: 'Hacer salsa en la olla',
  u_jc_take: 'Coger la garrafa de {0} ({1}%)', u_jc_bin: 'Tirar la garrafa vacía', u_jc_leave: 'Dejar la garrafa aquí', u_jc_there: 'Garrafa de {0}', u_jc_spot: 'Sitio para la garrafa',
  u_table_free: 'Mesa libre', u_table_eating: '{0} está comiendo', u_table_put: 'Dejar {0} en la mesa',
  u_mk_deco: ' · no está a la venta, amigo', u_mk_poor: ' · no te llega', u_mk_buy: 'Comprar {0} · {1}', u_mk_have: 'tienes {0}',
  sb_empty: 'El bote está vacío. Rellénalo en el barreño o con la garrafa.', jc_ready: 'Garrafa llena: viértela en el barreño del mostrador.', jc_left: 'Tenías las manos ocupadas: la garrafa se queda junto a la olla.',
  bk_h: 'Libro de cuentas', bk_prev: 'Atrás', bk_next: 'Pasar página', bk_buy: 'Comprar', bk_max: 'Ya lo tienes todo', bk_poor: 'No te llega', bk_lv: 'Nivel {0} de {1}', bk_have: 'Caja: {0}', bk_tap: 'Toca la página para comprar',
  bk_end: 'Siguiente noche', bk_sum: 'Resumen de la noche {0}',
  sg_h: 'La olla', sg_for: 'Salsa para el barreño de:', sg_rec: 'Receta: {0}', sg_stir: 'Coge un ingrediente con el dedo y tíralo a la olla. Toca el caldo para remover', sg_mix: 'Mezcla {0}%', sg_full: 'La olla está llena',
  sg_pack: 'Llenar la garrafa', sg_dump: 'Tirar y empezar', sg_out: 'Salir', sg_need: 'Echa al menos 4 cucharadas y remueve bien', sg_none: 'No te queda', sg_splash: '¡Que salpica!', sg_q: 'Calidad {0}',
  sg_weird: 'Lleva cosas que no se dicen', t_buy: 'Comprado: {0}',
});
Object.assign(STR.en, {
  u_take_order: 'Take {0}\'s order', u_tray_empty: 'The {0} tub is empty. Make sauce in the pot in the storeroom.', u_spoon: 'Add {0} with the ladle',
  u_jc_wrong: 'This can is {0}, not {1}', u_jc_empty: 'The can is empty', u_pour_stop: 'Stop pouring', u_tray_full: 'The {0} tub is full',
  u_pour_jc: 'Pour the can into the {0} tub ({1}%)', u_sb_fill: 'Refill the bottle with the ladle', u_tray_lv: '{0} tub · {1}%', u_tray_low2: ' · running low',
  u_sb_full: 'The bottle is full', u_sb_fill_jc: 'Refill the bottle from the can', u_sb_gone: 'Someone has the {0} bottle', u_sb_emptyx: ' (empty)',
  u_pot_jc: 'Put the can down next to the pot first', u_pot_hands: 'You need free hands to stir', u_pot: 'Make sauce in the pot',
  u_jc_take: 'Take the {0} can ({1}%)', u_jc_bin: 'Throw away the empty can', u_jc_leave: 'Leave the can here', u_jc_there: '{0} can', u_jc_spot: 'Spot for the can',
  u_table_free: 'Free table', u_table_eating: '{0} is eating', u_table_put: 'Put {0} on the table',
  u_mk_deco: ' · not for sale, my friend', u_mk_poor: ' · you can\'t afford it', u_mk_buy: 'Buy {0} · {1}', u_mk_have: 'you have {0}',
  sb_empty: 'The bottle is empty. Refill it at the tub or from the can.', jc_ready: 'Can filled: pour it into the tub on the counter.', jc_left: 'Your hands were full: the can stays by the pot.',
  bk_h: 'Ledger', bk_prev: 'Back', bk_next: 'Turn page', bk_buy: 'Buy', bk_max: 'Fully upgraded', bk_poor: 'Not enough cash', bk_lv: 'Level {0} of {1}', bk_have: 'Cash: {0}', bk_tap: 'Tap the page to buy',
  bk_end: 'Next night', bk_sum: 'Night {0} summary',
  sg_h: 'The pot', sg_for: 'Sauce for the tub:', sg_rec: 'Recipe: {0}', sg_stir: 'Grab an ingredient with your finger and throw it in the pot. Touch the broth to stir', sg_mix: 'Mixed {0}%', sg_full: 'The pot is full',
  sg_pack: 'Fill the can', sg_dump: 'Dump and restart', sg_out: 'Leave', sg_need: 'Add at least 4 spoonfuls and stir well', sg_none: 'None left', sg_splash: 'It\'s splashing!', sg_q: 'Quality {0}',
  sg_weird: 'Contains things we don\'t talk about', t_buy: 'Bought: {0}',
});
Object.assign(STR.ro, {
  u_take_order: 'Ia comanda lui {0}', u_tray_empty: 'Ligheanul de {0} e gol. Fă sos în oala din magazie.', u_spoon: 'Pune {0} cu polonicul',
  u_jc_wrong: 'Canistra asta e de {0}, nu de {1}', u_jc_empty: 'Canistra e goală', u_pour_stop: 'Nu mai turna', u_tray_full: 'Ligheanul de {0} e plin',
  u_pour_jc: 'Toarnă canistra în ligheanul de {0} ({1}%)', u_sb_fill: 'Umple sticla cu polonicul', u_tray_lv: 'Lighean de {0} · {1}%', u_tray_low2: ' · mai e puțin',
  u_sb_full: 'Sticla e plină', u_sb_fill_jc: 'Umple sticla din canistră', u_sb_gone: 'Sticla de {0} o are cineva', u_sb_emptyx: ' (goală)',
  u_pot_jc: 'Lasă întâi canistra lângă oală', u_pot_hands: 'Ai nevoie de mâini libere ca să amesteci', u_pot: 'Fă sos în oală',
  u_jc_take: 'Ia canistra de {0} ({1}%)', u_jc_bin: 'Aruncă canistra goală', u_jc_leave: 'Lasă canistra aici', u_jc_there: 'Canistră de {0}', u_jc_spot: 'Loc pentru canistră',
  u_table_free: 'Masă liberă', u_table_eating: '{0} mănâncă', u_table_put: 'Pune {0} pe masă',
  u_mk_deco: ' · nu e de vânzare, prietene', u_mk_poor: ' · nu-ți ajung banii', u_mk_buy: 'Cumpără {0} · {1}', u_mk_have: 'ai {0}',
  sb_empty: 'Sticla e goală. Umple-o din lighean sau din canistră.', jc_ready: 'Canistra e plină: toarn-o în ligheanul de pe tejghea.', jc_left: 'Aveai mâinile ocupate: canistra rămâne lângă oală.',
  bk_h: 'Registrul', bk_prev: 'Înapoi', bk_next: 'Întoarce pagina', bk_buy: 'Cumpără', bk_max: 'Ai tot', bk_poor: 'Nu-ți ajung banii', bk_lv: 'Nivelul {0} din {1}', bk_have: 'Casa: {0}', bk_tap: 'Atinge pagina ca să cumperi',
  bk_end: 'Noaptea următoare', bk_sum: 'Rezumatul nopții {0}',
  sg_h: 'Oala', sg_for: 'Sos pentru ligheanul de:', sg_rec: 'Rețeta: {0}', sg_stir: 'Ia un ingredient cu degetul și aruncă-l în oală. Atinge zeama ca să amesteci', sg_mix: 'Amestecat {0}%', sg_full: 'Oala e plină',
  sg_pack: 'Umple canistra', sg_dump: 'Aruncă și ia-o de la capăt', sg_out: 'Ieși', sg_need: 'Pune cel puțin 4 linguri și amestecă bine', sg_none: 'Nu mai ai', sg_splash: 'Stropește!', sg_q: 'Calitate {0}',
  sg_weird: 'Are lucruri despre care nu se vorbește', t_buy: 'Cumpărat: {0}',
});
// mejoras del libro
const UPGX = {
  es: { sp: ['Otro asador', 'Un tercer y un cuarto asador en la plancha de atrás. Pollo y ternera, más carne a la vez.'], big: ['Rollos más grandes', 'El proveedor trae rollos más gordos: más carne en cada asador y en los rollos nuevos.'], sa: ['Otro barreño de salsa', 'Un barreño más en el mostrador: primero alioli (con ajo del súper) y luego barbacoa. Los clientes empezarán a pedirlas.'], tb: ['Mesa de Cruzcampo', 'Mesa de aluminio y dos sillas de plástico en la terraza. Se sientan, pides nota, les dejas la comida en la mesa y pagan al terminar.'], po: ['Pósters para el local', 'Fotos enmarcadas para las paredes: La Meca, el sello halal, mujeres con burka y un kebab que no se parece al tuyo. Cada compra cuelga uno.'], tips: ['Notas del cocinero anterior', 'La salsa blanca se remueve hasta que no se vean grumos. No cuentes a nadie lo que lleva. Los grupos piden mucho: ten carne cortada. Si la familia pide pollo, que sea pollo. Los de la mesa no se levantan: ve tú. Y no mires por la mirilla después de las tres.'] },
  en: { sp: ['Another spit', 'A third and a fourth spit on the back counter. Chicken and beef, more meat at once.'], big: ['Bigger rolls', 'The supplier brings fatter rolls: more meat on every spit and on new cones.'], sa: ['Another sauce tub', 'One more tub on the counter: first aioli (with garlic from the shop), then barbecue. Customers will start asking for them.'], tb: ['Cruzcampo table', 'An aluminium table and two plastic chairs on the terrace. They sit, you take the order, leave the food on the table and they pay when done.'], po: ['Posters for the shop', 'Framed pictures for the walls: Mecca, the halal seal, women in burqas and a kebab that looks nothing like yours. Each purchase hangs one.'], tips: ['Notes from the last cook', 'Stir the white sauce until there are no lumps. Never tell anyone what goes in it. Groups order a lot: keep meat carved. If the family wants chicken, give them chicken. Table customers don\'t get up: you go to them. And don\'t look through the peephole after three.'] },
  ro: { sp: ['Încă un rotisor', 'Al treilea și al patrulea rotisor pe blatul din spate. Pui și vită, mai multă carne deodată.'], big: ['Ruloane mai mari', 'Furnizorul aduce ruloane mai groase: mai multă carne pe fiecare rotisor.'], sa: ['Încă un lighean de sos', 'Încă un lighean pe tejghea: întâi aioli (cu usturoi de la magazin), apoi barbecue. Clienții vor începe să le ceară.'], tb: ['Masă Cruzcampo', 'Masă de aluminiu și două scaune de plastic pe terasă. Se așază, iei comanda, lași mâncarea pe masă și plătesc la sfârșit.'], po: ['Postere pentru local', 'Poze înrămate pentru pereți: Mecca, sigiliul halal, femei cu burka și un kebab care nu seamănă cu al tău. Fiecare cumpărătură agață unul.'], tips: ['Notițele bucătarului de dinainte', 'Sosul alb se amestecă până nu mai are cocoloașe. Nu spune nimănui ce are. Grupurile comandă mult: ține carne tăiată. Dacă familia vrea pui, dă-le pui. Cei de la masă nu se ridică: du-te tu. Și nu te uita pe vizor după ora trei.'] },
};
// ingredientes de la olla
const INGX = {
  es: { may: 'Mayonesa', yog: 'Yogur', tom: 'Tomate frito', ajo: 'Ajo', gui: 'Guindilla', bbq: 'Salsa barbacoa', com: 'Comino', per: 'Perejil', lim: 'Limón', azu: 'Azúcar', sng: 'Sangre humana', ori: 'Orina', fhm: 'Fluido de hombre', ace: 'Aceite de la freidora', fre: 'Agua de fregar', col: 'Colillas' },
  en: { may: 'Mayo', yog: 'Yoghurt', tom: 'Tomato sauce', ajo: 'Garlic', gui: 'Chilli', bbq: 'BBQ sauce', com: 'Cumin', per: 'Parsley', lim: 'Lemon', azu: 'Sugar', sng: 'Human blood', ori: 'Urine', fhm: 'Man fluid', ace: 'Fryer oil', fre: 'Mop water', col: 'Cigarette butts' },
  ro: { may: 'Maioneză', yog: 'Iaurt', tom: 'Sos de roșii', ajo: 'Usturoi', gui: 'Ardei iute', bbq: 'Sos barbecue', com: 'Chimion', per: 'Pătrunjel', lim: 'Lămâie', azu: 'Zahăr', sng: 'Sânge de om', ori: 'Urină', fhm: 'Fluid de bărbat', ace: 'Ulei de la friteuză', fre: 'Apă de mop', col: 'Mucuri de țigară' },
};
// el súper
const MKX = {
  es: { name: 'Super Cheap Market', cashier: 'Imran', ing: { ajo: 'Bolsa de ajos', gui: 'Guindillas', bbq: 'Bote de barbacoa' }, deco: ['Arroz basmati 5 kg', 'Especias variadas', 'Cargador de móvil', 'Mechero con luces'],
    say: ['Muy buen precio, amigo.', 'Precio especial para ti, ¿eh?', 'Esto en el Mercadona más caro, te lo juro.', 'Gracias, hermano. Vuelve.', '¿Bolsa? Bolsa diez céntimos.', 'Cerramos a las seis. Bueno, no cerramos nunca.'],
    poor: ['Sin dinero no hay nada, amigo.'] },
  en: { name: 'Super Cheap Market', cashier: 'Imran', ing: { ajo: 'Bag of garlic', gui: 'Chillies', bbq: 'Jar of BBQ sauce' }, deco: ['Basmati rice 5 kg', 'Assorted spices', 'Phone charger', 'Light-up lighter'],
    say: ['Very good price, my friend.', 'Special price for you, eh?', 'Much more expensive at Mercadona, I swear.', 'Thank you, brother. Come back.', 'Bag? Bag is ten cents.', 'We close at six. Well, we never close.'],
    poor: ['No money, no nothing, friend.'] },
  ro: { name: 'Super Cheap Market', cashier: 'Imran', ing: { ajo: 'Pungă de usturoi', gui: 'Ardei iuți', bbq: 'Borcan de barbecue' }, deco: ['Orez basmati 5 kg', 'Condimente', 'Încărcător de telefon', 'Brichetă cu lumini'],
    say: ['Preț foarte bun, prietene.', 'Preț special pentru tine, da?', 'La Mercadona e mult mai scump, jur.', 'Mulțumesc, frate. Mai vino.', 'Pungă? Pungă zece cenți.', 'Închidem la șase. Mă rog, nu închidem niciodată.'],
    poor: ['Fără bani nu e nimic, prietene.'] },
};
// frases de los clientes: llamar en la mesa y reacciones a las salsas raras
Object.assign(FUNX.es, {
  tb: ['¡Perdone! ¿Nos atiende?', '¡Jefe! ¡Que estamos aquí fuera!', 'Oiga, ¿aquí se pide en la mesa o qué?', '¡Hola! ¿Hay alguien?', 'Llevo un rato sentado, ¿eh?'],
  ql: ['¿Qué lleva esta salsa? Está brutal.', 'Esta salsa tiene algo... adictivo. Toma, propina.', 'Madre mía, ¿la receta es secreta? Me lo apunto.', 'Nunca había probado una salsa así. Otra vez vengo.'],
  qd: ['¡Puaj! ¿Qué le habéis echado a esto?', 'Esto sabe a cosa que no se come.', 'Creo que voy a vomitar. No, ya está. No.', 'Me voy a quejar a Sanidad, que lo sepas.'],
  q1: ['Sabe a hierro, como a moneda chupada.', 'La salsa está... ¿caliente por dentro? Rara.'], q2: ['Tiene un toque... ¿salado? ¿amargo? No sé.', 'Huele un poco a bar de madrugada, ¿no?'],
  q4: ['¿Por qué está tan espesa la salsa blanca?', 'Esta salsa blanca tiene una textura... curiosa.'], q8: ['Esto sabe a freidora, literalmente.', 'Muy aceitosa la salsa, ¿no?'],
  q16: ['Sabe a lejía un poquito, ¿eh?', 'Tiene un regusto a suelo recién fregado.'], q32: ['¿Esto es una colilla? ¡Esto es una colilla!', 'Sabe a cenicero de terraza.'],
});
Object.assign(FUNX.en, {
  tb: ['Excuse me! Can we order?', 'Boss! We\'re out here!', 'Hey, do we order at the table or what?', 'Hello? Anyone?', 'I\'ve been sitting here a while, eh?'],
  ql: ['What\'s in this sauce? It\'s amazing.', 'This sauce has something... addictive. Here, a tip.', 'Wow, is the recipe a secret?', 'Never had a sauce like this. I\'ll be back.'],
  qd: ['Ugh! What did you put in this?', 'This tastes like something you don\'t eat.', 'I think I\'m going to throw up. No. Yes. No.', 'I\'m reporting you to Health, you know.'],
  q1: ['Tastes like iron, like a sucked coin.', 'The sauce is... warm inside? Weird.'], q2: ['It has a... salty? bitter? touch.', 'Smells a bit like a bar at 5 am, no?'],
  q4: ['Why is the white sauce so thick?', 'This white sauce has a... curious texture.'], q8: ['This literally tastes like the fryer.', 'Very oily sauce, isn\'t it?'],
  q16: ['Tastes a bit like bleach, eh?', 'Has a mopped-floor aftertaste.'], q32: ['Is this a cigarette butt? This is a cigarette butt!', 'Tastes like a terrace ashtray.'],
});
Object.assign(FUNX.ro, {
  tb: ['Scuzați! Ne serviți?', 'Șefu\'! Suntem aici afară!', 'Se comandă la masă sau cum?', 'Alo? E cineva?', 'Stau de ceva vreme aici, da?'],
  ql: ['Ce are sosul ăsta? E super.', 'Sosul ăsta are ceva... care te prinde. Uite, bacșiș.', 'Doamne, rețeta e secretă?', 'N-am mai mâncat așa sos. Mai vin.'],
  qd: ['Bleah! Ce i-ați pus?', 'Are gust de ceva ce nu se mănâncă.', 'Cred că vomit. Nu. Da. Nu.', 'Vă reclam la Sănătate, să știți.'],
  q1: ['Are gust de fier, ca o monedă supt.', 'Sosul e... cald pe dinăuntru? Ciudat.'], q2: ['Are o notă... sărată? amară?', 'Miroase a bar la cinci dimineața, nu?'],
  q4: ['De ce e sosul alb atât de gros?', 'Sosul ăsta alb are o textură... curioasă.'], q8: ['Are gust de friteuză, la propriu.', 'Foarte uleios sosul, nu?'],
  q16: ['Are un pic gust de clor, da?', 'Are gust de podea abia spălată.'], q32: ['E un muc de țigară? E un muc de țigară!', 'Are gust de scrumieră de terasă.'],
});
/* atajos: puertas en tapias y vallas que solo se abren desde un lado */
Object.assign(STR.es, { u_aj_do: 'Abrir la puerta (atajo)', u_aj_lock: 'Cerrada. Se abre desde el otro lado', u_aj_open: 'Atajo abierto', t_aj: 'Atajo abierto: ya puedes pasar por aquí' });
Object.assign(STR.en, { u_aj_do: 'Open the door (shortcut)', u_aj_lock: 'Locked. It opens from the other side', u_aj_open: 'Shortcut open', t_aj: 'Shortcut open: you can come through here now' });
Object.assign(STR.ro, { u_aj_do: 'Deschide ușa (scurtătură)', u_aj_lock: 'Încuiată. Se deschide din partea cealaltă', u_aj_open: 'Scurtătură deschisă', t_aj: 'Scurtătură deschisă: acum poți trece pe aici' });
