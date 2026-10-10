/* ================= IDIOMAS: español · english · română ================= */
let LANG = 'es';
const LANGS = ['es', 'en', 'ro'];

/* ---------- vocabulario de cocina ---------- */
const LX = {
  es: {
    base: ['dürüm', 'pita', 'caja'], bart: ['un', 'una', 'una'], meat: ['pollo', 'ternera', 'mixto'], veg: ['lechuga', 'tomate', 'cebolla'], sauce: ['salsa blanca', 'picante'], drink: ['cola', 'agua', 'cerveza'],
    vAll: 'con todo', vNone: 'sin verdura', vNo: 'sin {0}', vOnly: 'solo con {0}', sPh: ['sin salsa', 'salsa blanca', 'picante', 'las dos salsas'],
    frPh: 'unas patatas', drPh: ['una cola', 'un agua', 'una cerveza'], and: ' y ', fries: 'patatas', wfries: 'con patatas',
    nm: { gun: 'la escopeta', fr: 'las patatas', dr: ['la cola', 'el agua', 'la cerveza'], vg: ['la lechuga', 'los tomates', 'las cebollas'], kb: ['el dürüm', 'la pita', 'la caja'], none: 'nada' },
    h: { nomeat: 'sin carne', raw: ' (cruda)', closed: 'cerrada', wrapped: 'en aluminio', bad: ' (malas)', uncut: ' sin cortar', gun: 'ESCOPETA' },
    done: ['CRUDA', 'poco hecha', 'DORADA', 'pasada', 'QUEMADA'], fs: ['crudas', 'doradas', 'pasadas', 'quemadas'],
  },
  en: {
    base: ['dürüm', 'pita', 'kebab box'], bart: ['a', 'a', 'a'], meat: ['chicken', 'beef', 'mixed'], veg: ['lettuce', 'tomato', 'onion'], sauce: ['white sauce', 'hot sauce'], drink: ['cola', 'water', 'beer'],
    vAll: 'with everything', vNone: 'no salad', vNo: 'no {0}', vOnly: 'only {0}', sPh: ['no sauce', 'white sauce', 'hot sauce', 'both sauces'],
    frPh: 'some fries', drPh: ['a cola', 'a water', 'a beer'], and: ' and ', fries: 'fries', wfries: 'with fries',
    nm: { gun: 'the shotgun', fr: 'the fries', dr: ['the cola', 'the water', 'the beer'], vg: ['the lettuce', 'the tomatoes', 'the onions'], kb: ['the dürüm', 'the pita', 'the box'], none: 'nothing' },
    h: { nomeat: 'no meat', raw: ' (raw)', closed: 'closed', wrapped: 'wrapped', bad: ' (bad)', uncut: ', uncut', gun: 'SHOTGUN' },
    done: ['RAW', 'underdone', 'GOLDEN', 'overdone', 'BURNT'], fs: ['raw', 'golden', 'overdone', 'burnt'],
  },
  ro: {
    base: ['dürüm', 'pita', 'cutie'], bart: ['un', 'o', 'o'], meat: ['pui', 'vită', 'mixt'], veg: ['salată', 'roșii', 'ceapă'], sauce: ['sos alb', 'sos iute'], drink: ['cola', 'apă', 'bere'],
    vAll: 'cu de toate', vNone: 'fără legume', vNo: 'fără {0}', vOnly: 'doar cu {0}', sPh: ['fără sos', 'sos alb', 'sos iute', 'ambele sosuri'],
    frPh: 'niște cartofi', drPh: ['o cola', 'o apă', 'o bere'], and: ' și ', fries: 'cartofi', wfries: 'cu cartofi',
    nm: { gun: 'pușca', fr: 'cartofii', dr: ['cola', 'apa', 'berea'], vg: ['salata', 'roșiile', 'ceapa'], kb: ['dürümul', 'pita', 'cutia'], none: 'nimic' },
    h: { nomeat: 'fără carne', raw: ' (crudă)', closed: 'închisă', wrapped: 'în folie', bad: ' (proști)', uncut: ' (de tăiat)', gun: 'PUȘCĂ' },
    done: ['CRUDĂ', 'puțin făcută', 'RUMENITĂ', 'trecută', 'ARSĂ'], fs: ['cruzi', 'aurii', 'trecuți', 'arși'],
  },
};

/* ---------- textos de interfaz ---------- */
const STR = {
  es: {
    sub: 'Turno de noche · Benidorm · de 23:00 a 06:00', start: 'Abrir el local', join: 'Entrar a ayudar', full: 'Pantalla completa',
    job_h: 'El trabajo', ctl_h: 'Controles', loading: 'Cargando el local…', nowebgl: 'Este navegador no puede abrir el juego (hace falta WebGL).',
    solo: 'Partida en solitario.', room_ready: 'Sala lista. Si alguien más abre este enlace con su cuenta, entra en tu misma cocina.',
    room_others: 'Personas con el juego abierto además de ti: {0}. Quien pulse primero abre el local; el resto entra a ayudar.', running: 'Hay un turno en marcha: noche {0}, {1}.',
    night: 'NOCHE {0}', rep: 'Reputación', coop: '{0} en cocina', ko: 'Te has desmayado', tb_use: 'Usar', tb_fire: 'Fuego', tb_rel: 'Recarga', tb_back: 'Salir',
    note_h: 'Turno de noche', note_sign: 'Suerte. Yo no vuelvo.', note_close: 'Dejar la nota', peep_close: 'Apartarse de la mirilla',
    peep1: '«Reparto. Traigo la verdura y los cartuchos de siempre.»', peep2: '«Abre. Soy el del reparto. Abre. Abre.»', peep0: 'El callejón está vacío.',
    end_t: 'Noche {0} terminada', e_sv: 'Clientes servidos', e_ls: 'Clientes perdidos', e_e: 'Caja de esta noche', e_tp: 'Propinas', e_cash: 'Total en la caja', next: 'Siguiente noche',
    over1_t: 'Has disparado a un cliente', over1_p: 'Era una persona. Parpadeaba. La policía llega antes de que se enfríe la plancha, y el Kebab Poniente no vuelve a abrir.',
    over0_t: 'El local cierra', over0_p: 'Demasiada gente se ha ido sin cenar o con el estómago revuelto. Nadie vuelve a un kebab con esta fama.',
    over_s: 'Noches completas: {0} · {1} en la caja', again: 'Volver a la primera noche',
    t_night: 'Noche {0} · 23:00. Abre el Kebab Poniente.', tip: 'Propina +{0}', noammo_r: 'Sin cartuchos en la recámara. Recarga con R.', noammo_t: 'Sin cartuchos en la recámara. Recarga.', noammo0: 'No quedan cartuchos.',
    cut_front: 'Carne delante: {0} · ', cut_empty: 'Aquí ya no queda carne · ', cut_touch: 'arrastra hacia abajo para cortar', cut_pad: 'RT pulsado y baja el stick para cortar · (B) salir', cut_kb: 'mantén clic y baja el ratón para cortar · [E] salir',
    u_foil: 'Papel de aluminio', u_foil_nomeat: 'Ponle carne antes de cerrar', u_closebox: 'Cerrar la caja', u_wrap: 'Envolver',
    u_gun_take: 'Coger la escopeta', u_gun_hang: 'Colgar la escopeta', u_gun_busy: 'Escopeta (manos ocupadas)', u_gun_gone: 'La escopeta no está',
    u_trash: 'Tirar {0}', u_bin: 'Cubo de basura', u_fry_full: 'La bandeja de patatas está llena', u_fry_in: 'Echar patatas a la freidora', u_fry_out: 'Sacar las patatas ({0})',
    u_ft_none: 'No hay patatas hechas', u_ft_take: 'Coger patatas', u_ft_box: 'Añadir patatas a la caja', u_ft_n: 'Patatas hechas: {0}',
    u_chop_put: 'Poner {0} en la tabla', u_chop: 'Cortar {0} ({1}/6)', u_hands: 'Suelta lo que llevas para cortar', u_chop_idle: 'Tabla de cortar (trae verdura del almacén)',
    u_fuse: 'Subir el diferencial', u_fusebox: 'Cuadro eléctrico', u_peep: 'Mirar por la mirilla', u_rules: 'Leer la nota del anterior cocinero', u_bdoor_closed: 'Puerta trasera. Cerrada.', u_bdoor_open: 'Abrir la puerta',
    u_carve: 'Cortar {0}', u_tray_n: 'Carne de {0} cortada · raciones: {1}', u_tray_low: 'Falta carne de {0} cortada', u_tray_full: 'No cabe más carne', u_tray_add: 'Echar {0}', u_raw: ' (está cruda)',
    u_has: 'Ya lleva {0}', u_out: 'No queda {0}. Hay que cortar más.', u_add: 'Añadir {0}', u_pour: 'Echar {0}', u_busy: '{0} (manos ocupadas)',
    u_base0: 'Coger una tortilla de dürüm', u_base1: 'Coger un pan de pita', u_base2: 'Coger una caja', u_pass_put: 'Dejar {0} en el pase', u_take: 'Coger {0}', u_pass_full: 'Pase (ocupado)', u_pass: 'Pase: deja aquí algo para tu compañero',
    u_drink: 'Coger {0}', u_veg: 'Coger {0} para cortar', u_give: 'Dar {0} a {1}', u_wait: '{0} espera su pedido',
    p2p_h: 'Jugar online con un amigo', p2p_create: 'Crear sala', p2p_join: 'Unirse', p2p_code: 'Código', p2p_copy: 'Copiar enlace', p2p_copied: 'Enlace copiado',
    p2p_note: 'Uno crea la sala y le pasa al otro el código de 4 cifras o el enlace. No hacen falta cuentas.', p2p_wait: 'Conectando…',
    p2p_ready: 'Sala {0} abierta. Pásale a tu amigo el código o este enlace:', p2p_joined: 'Dentro de la sala {0}.',
    p2p_fail: 'No se ha podido entrar. Comprueba el código y que quien creó la sala la tenga abierta.', p2p_failhost: 'No se ha podido crear la sala. Prueba otra vez.', p2p_badcode: 'El código son 4 cifras.',
    p2p_lost: 'Se ha perdido la conexión con la sala. Sigues tú solo.', p2p_alone: 'Todavía no ha entrado nadie más. Puedes abrir ya: quien llegue después entra a ayudar.',
    p2p_version: 'Tu amigo tiene otra versión del juego. Abrid los dos el mismo enlace.', room_code: 'Sala {0}',
  },
  en: {
    sub: 'Night shift · Benidorm · 11 pm to 6 am', start: 'Open up', join: 'Join the shift', full: 'Full screen',
    job_h: 'The job', ctl_h: 'Controls', loading: 'Loading the shop…', nowebgl: 'This browser cannot run the game (WebGL is required).',
    solo: 'Playing solo.', room_ready: 'Room ready. Anyone else who opens this link with their account joins your kitchen.',
    room_others: 'Other people with the game open: {0}. Whoever presses first opens the shop; the rest join in.', running: 'A shift is already running: night {0}, {1}.',
    night: 'NIGHT {0}', rep: 'Reputation', coop: '{0} in the kitchen', ko: 'You passed out', tb_use: 'Use', tb_fire: 'Fire', tb_rel: 'Reload', tb_back: 'Exit',
    note_h: 'Night shift', note_sign: "Good luck. I'm not coming back.", note_close: 'Put the note down', peep_close: 'Step away from the peephole',
    peep1: '"Delivery. I\'ve got the usual vegetables and shells."', peep2: '"Open up. I\'m the delivery man. Open. Open."', peep0: 'The alley is empty.',
    end_t: 'Night {0} done', e_sv: 'Customers served', e_ls: 'Customers lost', e_e: "Tonight's takings", e_tp: 'Tips', e_cash: 'Total in the till', next: 'Next night',
    over1_t: 'You shot a customer', over1_p: 'That was a person. They blinked. The police arrive before the griddle cools, and Kebab Poniente never opens again.',
    over0_t: 'The shop closes down', over0_p: 'Too many people left hungry or with a bad stomach. Nobody comes back to a kebab shop with this reputation.',
    over_s: 'Full nights survived: {0} · {1} in the till', again: 'Back to the first night',
    t_night: 'Night {0} · 11 pm. Kebab Poniente is open.', tip: 'Tip +{0}', noammo_r: 'Both barrels empty. Press R to reload.', noammo_t: 'Both barrels empty. Reload.', noammo0: 'No shells left.',
    cut_front: 'Meat in front: {0} · ', cut_empty: 'No meat left here · ', cut_touch: 'drag down to carve', cut_pad: 'hold RT and push the stick down to carve · (B) exit', cut_kb: 'hold click and move the mouse down to carve · [E] exit',
    u_foil: 'Foil', u_foil_nomeat: 'Add meat before closing it', u_closebox: 'Close the box', u_wrap: 'Wrap it',
    u_gun_take: 'Take the shotgun', u_gun_hang: 'Hang the shotgun back', u_gun_busy: 'Shotgun (hands full)', u_gun_gone: 'The shotgun is gone',
    u_trash: 'Throw away {0}', u_bin: 'Bin', u_fry_full: 'The fries tray is full', u_fry_in: 'Drop fries in the fryer', u_fry_out: 'Lift the fries ({0})',
    u_ft_none: 'No fries ready', u_ft_take: 'Take fries', u_ft_box: 'Add fries to the box', u_ft_n: 'Fries ready: {0}',
    u_chop_put: 'Put {0} on the board', u_chop: 'Chop {0} ({1}/6)', u_hands: 'Empty your hands to cut', u_chop_idle: 'Chopping board (bring vegetables from the storeroom)',
    u_fuse: 'Flip the breaker', u_fusebox: 'Fuse box', u_peep: 'Look through the peephole', u_rules: "Read the last cook's note", u_bdoor_closed: 'Back door. Locked.', u_bdoor_open: 'Open the door',
    u_carve: 'Carve the {0}', u_tray_n: 'Carved {0} · portions: {1}', u_tray_low: 'Not enough carved {0}', u_tray_full: 'No room for more meat', u_tray_add: 'Add {0}', u_raw: " (it's raw)",
    u_has: 'Already has {0}', u_out: 'Out of {0}. Chop some more.', u_add: 'Add {0}', u_pour: 'Add {0}', u_busy: '{0} (hands full)',
    u_base0: 'Take a dürüm wrap', u_base1: 'Take a pita bread', u_base2: 'Take a box', u_pass_put: 'Leave {0} on the pass', u_take: 'Take {0}', u_pass_full: 'Pass (taken)', u_pass: 'Pass: leave something here for your partner',
    u_drink: 'Take {0}', u_veg: 'Take {0} to chop', u_give: 'Give {0} to {1}', u_wait: '{0} is waiting for the order',
    p2p_h: 'Play online with a friend', p2p_create: 'Create room', p2p_join: 'Join', p2p_code: 'Code', p2p_copy: 'Copy link', p2p_copied: 'Link copied',
    p2p_note: 'One of you creates the room and gives the other the 4-digit code or the link. No accounts needed.', p2p_wait: 'Connecting…',
    p2p_ready: 'Room {0} is open. Give your friend the code or this link:', p2p_joined: 'You are in room {0}.',
    p2p_fail: "Couldn't get in. Check the code and that whoever created the room still has it open.", p2p_failhost: "Couldn't create the room. Try again.", p2p_badcode: 'The code is 4 digits.',
    p2p_lost: 'Connection to the room was lost. You carry on alone.', p2p_alone: 'Nobody else has joined yet. You can open up now: whoever arrives later joins in.',
    p2p_version: 'Your friend has a different version of the game. Both of you open the same link.', room_code: 'Room {0}',
  },
  ro: {
    sub: 'Tura de noapte · Benidorm · 23:00 – 06:00', start: 'Deschide localul', join: 'Intră să ajuți', full: 'Ecran complet',
    job_h: 'Treaba', ctl_h: 'Comenzi', loading: 'Se încarcă localul…', nowebgl: 'Browserul acesta nu poate porni jocul (e nevoie de WebGL).',
    solo: 'Joci singur.', room_ready: 'Camera e gata. Dacă altcineva deschide linkul cu contul lui, intră în bucătăria ta.',
    room_others: 'Alte persoane cu jocul deschis: {0}. Cine apasă primul deschide localul; ceilalți intră să ajute.', running: 'E o tură în desfășurare: noaptea {0}, {1}.',
    night: 'NOAPTEA {0}', rep: 'Reputație', coop: '{0} în bucătărie', ko: 'Ai leșinat', tb_use: 'Apasă', tb_fire: 'Foc', tb_rel: 'Încarcă', tb_back: 'Ieși',
    note_h: 'Tura de noapte', note_sign: 'Baftă. Eu nu mă mai întorc.', note_close: 'Lasă biletul', peep_close: 'Dă-te de la vizor',
    peep1: '„Livrare. Am adus legumele și cartușele, ca de obicei.”', peep2: '„Deschide. Sunt cel cu livrarea. Deschide. Deschide.”', peep0: 'Aleea e goală.',
    end_t: 'Noaptea {0} s-a terminat', e_sv: 'Clienți serviți', e_ls: 'Clienți pierduți', e_e: 'Încasări în noaptea asta', e_tp: 'Bacșișuri', e_cash: 'Total în casă', next: 'Noaptea următoare',
    over1_t: 'Ai împușcat un client', over1_p: 'Era un om. Clipea. Poliția ajunge înainte să se răcească plita, iar Kebab Poniente nu se mai deschide niciodată.',
    over0_t: 'Localul se închide', over0_p: 'Prea mulți au plecat nemâncați sau cu stomacul întors pe dos. Nimeni nu se mai întoarce la un kebab cu asemenea faimă.',
    over_s: 'Nopți întregi rezistate: {0} · {1} în casă', again: 'Înapoi la prima noapte',
    t_night: 'Noaptea {0} · 23:00. Kebab Poniente se deschide.', tip: 'Bacșiș +{0}', noammo_r: 'Ambele țevi sunt goale. Reîncarcă cu R.', noammo_t: 'Ambele țevi sunt goale. Reîncarcă.', noammo0: 'Nu mai sunt cartușe.',
    cut_front: 'Carnea din față: {0} · ', cut_empty: 'Aici nu mai e carne · ', cut_touch: 'trage în jos ca să tai', cut_pad: 'ține RT apăsat și împinge stickul în jos · (B) ieșire', cut_kb: 'ține clic apăsat și trage mouse-ul în jos · [E] ieșire',
    u_foil: 'Folie de aluminiu', u_foil_nomeat: 'Pune carne înainte să închizi', u_closebox: 'Închide cutia', u_wrap: 'Împachetează',
    u_gun_take: 'Ia pușca', u_gun_hang: 'Pune pușca la loc', u_gun_busy: 'Pușcă (ai mâinile ocupate)', u_gun_gone: 'Pușca nu e aici',
    u_trash: 'Aruncă {0}', u_bin: 'Coș de gunoi', u_fry_full: 'Tava de cartofi e plină', u_fry_in: 'Pune cartofi în friteuză', u_fry_out: 'Scoate cartofii ({0})',
    u_ft_none: 'Nu sunt cartofi gata', u_ft_take: 'Ia cartofi', u_ft_box: 'Pune cartofi în cutie', u_ft_n: 'Cartofi gata: {0}',
    u_chop_put: 'Pune {0} pe tocător', u_chop: 'Taie {0} ({1}/6)', u_hands: 'Eliberează-ți mâinile ca să tai', u_chop_idle: 'Tocător (adu legume din magazie)',
    u_fuse: 'Ridică siguranța', u_fusebox: 'Tablou electric', u_peep: 'Uită-te pe vizor', u_rules: 'Citește biletul fostului bucătar', u_bdoor_closed: 'Ușa din spate. Încuiată.', u_bdoor_open: 'Deschide ușa',
    u_carve: 'Taie carne de {0}', u_tray_n: 'Carne de {0} tăiată · porții: {1}', u_tray_low: 'Nu e destulă carne de {0} tăiată', u_tray_full: 'Nu mai încape carne', u_tray_add: 'Pune carne de {0}', u_raw: ' (e crudă)',
    u_has: 'Are deja {0}', u_out: 'S-a terminat: {0}. Trebuie tăiat.', u_add: 'Adaugă {0}', u_pour: 'Pune {0}', u_busy: '{0} (ai mâinile ocupate)',
    u_base0: 'Ia o lipie de dürüm', u_base1: 'Ia o pita', u_base2: 'Ia o cutie', u_pass_put: 'Lasă {0} pe blat', u_take: 'Ia {0}', u_pass_full: 'Blat (ocupat)', u_pass: 'Blat: lasă aici ceva pentru coleg',
    u_drink: 'Ia {0}', u_veg: 'Ia {0} de tăiat', u_give: '{1}: dă-i {0}', u_wait: '{0} își așteaptă comanda',
    p2p_h: 'Joacă online cu un prieten', p2p_create: 'Creează o cameră', p2p_join: 'Intră', p2p_code: 'Cod', p2p_copy: 'Copiază linkul', p2p_copied: 'Link copiat',
    p2p_note: 'Unul creează camera și îi dă celuilalt codul din 4 cifre sau linkul. Nu e nevoie de conturi.', p2p_wait: 'Se conectează…',
    p2p_ready: 'Camera {0} e deschisă. Dă-i prietenului codul sau linkul acesta:', p2p_joined: 'Ești în camera {0}.',
    p2p_fail: 'Nu s-a putut intra. Verifică codul și dacă cel care a creat camera o mai are deschisă.', p2p_failhost: 'Camera nu s-a putut crea. Mai încearcă o dată.', p2p_badcode: 'Codul are 4 cifre.',
    p2p_lost: 'S-a pierdut legătura cu camera. Continui singur.', p2p_alone: 'Încă n-a intrat nimeni. Poți deschide deja: cine vine mai târziu intră să ajute.',
    p2p_version: 'Prietenul tău are altă versiune a jocului. Deschideți amândoi același link.', room_code: 'Camera {0}',
  },
};
const JOB = {
  es: ['El cliente llega al mostrador y pide. Su comanda aparece a la derecha.', 'Coge el pan o la caja. Corta carne del asador con el cuchillo: solo la dorada.', 'Echa la carne de la bandeja, la verdura y las salsas que ha pedido. Envuelve.', 'Patatas en la freidora, bebidas en la nevera. Entrégalo todo en mano.', 'Hay una nota del cocinero anterior junto a la freidora. Léela.'],
  en: ['The customer walks up to the counter and orders. The ticket shows up on the right.', 'Grab the bread or the box. Carve meat off the spit with the knife: only the golden part.', 'Add the meat from the tray, then the vegetables and sauces they asked for. Wrap it.', 'Fries go in the fryer, drinks are in the fridge. Hand everything over yourself.', "There's a note from the last cook next to the fryer. Read it."],
  ro: ['Clientul vine la tejghea și comandă. Bonul apare în dreapta.', 'Ia lipia, pita sau cutia. Taie carne de pe rotisor cu cuțitul: doar partea rumenită.', 'Pune carnea din tavă, apoi legumele și sosurile cerute. Împachetează.', 'Cartofii se fac în friteuză, băuturile sunt în frigider. Dă-i totul în mână.', 'Lângă friteuză e un bilet de la fostul bucătar. Citește-l.'],
};
const CTL = {
  es: [['WASD + ratón', 'moverse y mirar'], ['E o clic', 'usar, coger, entregar'], ['Clic con escopeta', 'disparar · R recarga'], ['Mando', 'sticks · A usar · RT disparar/cortar · X recarga · B salir'], ['Táctil', 'izquierda mover · derecha mirar · toque para usar']],
  en: [['WASD + mouse', 'move and look'], ['E or click', 'use, pick up, hand over'], ['Click with shotgun', 'fire · R reloads'], ['Gamepad', 'sticks · A use · RT fire/carve · X reload · B exit'], ['Touch', 'left side moves · right side looks · tap to use']],
  ro: [['WASD + mouse', 'mers și privit'], ['E sau clic', 'folosești, iei, predai'], ['Clic cu pușca', 'tragi · R reîncarcă'], ['Controller', 'stickuri · A folosește · RT trage/taie · X reîncarcă · B ieșire'], ['Tactil', 'stânga mers · dreapta privit · atingere ca să folosești']],
};
const RULESX = {
  es: RULES,
  en: ["Real customers blink. If it doesn't blink and its eyes are black, it is not a customer.", "If it asks for the meat raw, don't give it. Shotgun.", 'Never shoot a real customer. Never.', 'Aiming is enough for a robber. Same for the one who leaves without paying.', "If the power goes out: the fuse box is in the storeroom. Don't stand still in the dark.", 'Back door: ALWAYS use the peephole before opening.', 'At 3:33 someone comes. Someone always comes.'],
  ro: ['Clienții adevărați clipesc. Dacă nu clipește și are ochii negri, nu e client.', 'Dacă cere carnea crudă, nu i-o da. Pușca.', 'Nu trage niciodată într-un client adevărat. Niciodată.', 'Pe un hoț e de ajuns să-l ții în cătare. La fel și pe cel care pleacă fără să plătească.', 'Dacă se ia curentul: tabloul e în magazie. Nu sta pe loc pe întuneric.', 'Ușa din spate: uită-te ÎNTOTDEAUNA pe vizor înainte să deschizi.', 'La 3:33 vine cineva. Întotdeauna vine cineva.'],
};
const MSGX = {
  es: MSG,
  en: { karma: 'Julián leaves fed. The neighbourhood hears about it. (+reputation)', sinpa: 'He left without paying.', robbed: 'They emptied the till.', robgone: 'The robber runs off.', deliv: 'Delivery received: vegetables and shells.', nodeliv: 'The delivery man got tired of knocking.', blackout: 'The power is out. The fuse box is in the storeroom.', power: 'The lights are back.', binfull: 'Vegetables chopped and in the tub.', gone: 'The thing at the door stops scratching.', lost: 'A customer left without dinner.', ko: 'You passed out. You wake up in the kitchen.', last: "It's six. Shutters down when the last one leaves.", killed: 'That was not a customer.' },
  ro: { karma: 'Julián pleacă sătul. Află tot cartierul. (+reputație)', sinpa: 'A plecat fără să plătească.', robbed: 'Ți-au golit casa de marcat.', robgone: 'Hoțul o ia la fugă.', deliv: 'Livrare primită: legume și cartușe.', nodeliv: 'Livratorul s-a săturat să bată la ușă.', blackout: 'S-a luat curentul. Tabloul e în magazie.', power: 'A revenit curentul.', binfull: 'Legume tăiate și puse în tavă.', gone: 'Ce era la ușă nu mai zgârie.', lost: 'Un client a plecat nemâncat.', ko: 'Ai leșinat. Te trezești în bucătărie.', last: 'E șase. Tragi oblonul când pleacă ultimul.', killed: 'Ăla nu era client.' },
};
const GENX = {
  es: GEN,
  en: { w: ['Is it going to be long?', "Hey, I've been here a while."], ok: ['Thanks. Good night.'], bad: ["This isn't great...", "It's so-so, honestly."], x: ["Forget it. I'm going somewhere else."], no: ["That's not what I ordered."], raw: ['This is raw!', "Hey, the meat's not cooked."], burnt: ["It's charred."], unw: ['And you hand it to me like that, unwrapped?'], flee: ['Gunshots!!', 'Oh my God!', 'Run!'], dark: ['Did the lights go out?', "Hey, I can't see a thing."], nofr: ['Where are the fries in the box?'], gun: ['...'], g: ['Good evening.'], pre: ['Give me'], post: [''] },
  ro: { w: ['Mai durează mult?', 'Auzi, stau de ceva vreme.'], ok: ['Mersi. Noapte bună.'], bad: ['Nu-i cine știe ce...', 'E așa și așa, sincer.'], x: ['Las-o. Mă duc în altă parte.'], no: ['Nu asta am cerut.'], raw: ['E crud!', 'Auzi, carnea nu-i făcută.'], burnt: ['E carbonizat.'], unw: ['Și mi-l dai așa, neîmpachetat?'], flee: ['Împușcături!!', 'Vai de mine!', 'Fugi!'], dark: ['S-a luat curentul?', 'Hei, nu se vede nimic.'], nofr: ['Și cartofii din cutie?'], gun: ['...'], g: ['Bună seara.'], pre: ['Dă-mi'], post: [''] },
};
const ANOMX = {
  es: ANOM,
  en: { g: ['...', 'Good. Evening.'], o: ['Meat. Raw. No bread.', 'Give me the meat. Uncooked.', "I'm hungry. Raw."], w: ['You smell warm.', "Don't look at my eyes.", "You've been awake a long time.", "The last one didn't serve me either."], no: ['No. Raw.'], atk: ['HUNGRY.'] },
  ro: { g: ['...', 'Bună. Seara.'], o: ['Carne. Crudă. Fără pâine.', 'Dă-mi carnea. Nefăcută.', 'Mi-e foame. Crudă.'], w: ['Miroși a cald.', 'Nu te uita în ochii mei.', 'Ești treaz de mult.', 'Nici cel dinainte nu m-a servit.'], no: ['Nu. Crudă.'], atk: ['FOAME.'] },
};

/* ---------- los 28 clientes, traducidos ---------- */
const XL = {
  en: {
    dave: { role: 'stag do', g: ['Amigo! Amigooo...', 'Oi oi. Evening, boss.'], pre: ['One... uno... er,', 'Mate, give us'], post: ['Por favor. Cheers.', 'And quick, before I fall over.'], w: ['Mate... is it gonna be long?', "Amigo, I'm proper starving."], ok: ["Legend! You're a legend.", 'Cheers, amigo. Best kebab in Spain.'], bad: ["This is... weird. I'll eat it anyway."], x: ["Bah. I'm off to the burger place."], no: ["No, no, no. That's not mine, mate."] },
    linda: { role: 'hen party', g: ['Hiyaaa! Are you open?', 'Ooh. It smells like heaven in here.'], pre: ['For me,', 'Give me'], post: ["I'm getting married on Saturday!", 'Thanks, handsome.'], w: ["Love, the party's wearing off."], ok: ['I love you! Come to the wedding!', "You're the best. Really."], x: ["I'm going back to the girls, then."] },
    paco: { role: 'night taxi driver', g: ['Evening.', 'Long night, eh?'], pre: ['Give me', 'The usual:'], post: ["And make it quick, the cab's double-parked.", 'People keep pouring out tonight.'], w: ["I'm getting a ticket out there, kid.", 'Are you hunting it first or what?'], ok: ["That's how it's done. See you tomorrow."], x: ["Forget the kebab. I'm off."] },
    ruben: { role: 'delivery rider', g: ['App order.', "I'm here to pick up."], pre: ['It says:', "I've got:"], post: ["They dock me if I'm late.", 'Number 4471, I think.'], w: ['Man, the customer keeps texting me.', "My rating's dropping because of you."], ok: ['Right, thanks. Gotta fly.'], x: ["I'm cancelling it. Forget it."] },
    marta: { role: 'nurse', g: ["Hi... sorry, I'm dead on my feet.", 'Good evening. Twelve-hour shift.'], pre: ['Give me'], post: ['Thank you, really.', "I'll eat it in the car before I pass out."], w: ["It's fine, but I'm falling asleep standing up."], ok: ["You've saved my night."], x: ["Sorry, I can't stay awake. I'm going to bed."] },
    soler: { name: 'Officer Soler', role: 'local police', g: ['Good evening. Everything quiet around here?'], pre: ['Give me'], post: ["To go, we're on patrol.", 'Lots of strange folk out tonight.'], w: ["Come on, they're calling us on the radio."], ok: ['Thanks. If you see anything odd, call.'], x: ["I've got a call. Another day."], gun: ["That sawn-off has papers, right? ...I didn't see a thing."] },
    ivan: { role: 'student', g: ["Hi... what's the cheapest thing?"], pre: ['Well...', 'I can afford'], post: ["Let's see if my change covers it.", "I've got an exam tomorrow and haven't opened the book."], w: ["Er... no rush, but I'm hungry."], ok: ["Thanks, man. You're a lifesaver."], x: ['Never mind. Pasta again tonight.'] },
    encarna: { role: "can't sleep", g: ["Good evening, son. I can't sleep.", "Oh, you're open so late, son."], pre: ['Give me'], post: ["It's for my grandson, he's coming back from a night out.", "And not too much, or it'll repeat on him."], w: ["Take your time, son. At my age I'm in no hurry."], ok: ['God bless you, son.'], x: ["I'm going, son. It's getting chilly."] },
    kevin: { role: 'just out of the club', g: ['Heeey, big man!', "What's up, champ?"], pre: ['Give me'], post: ["And load it up, I've been tearing up the dance floor.", 'Loads of sauce, tiger.'], w: ["Big man, I'm sobering up here.", 'Come on, champ, move it.'], ok: ["Brutal! You're a beast."], x: ["I'm out, big man. Too slow."] },
    sergio: { role: 'club bouncer', g: ['Evening.'], pre: ['Give me'], post: ['Loaded.', 'Threw six out tonight.'], w: ['...', 'I have to get back to the door.'], ok: ['Correct.'], x: ["I don't have all night."] },
    toni: { role: 'cleans hotels before dawn', g: ['Evening, love. I start at five, cleaning the hotel.'], pre: ['Give me'], post: ["One day lend me the mop and I'll clean this place, good grief.", 'No rush, but I clock in on the dot.'], w: ['Son, I clock in on the dot.'], ok: ['Thanks, darling.'], x: ["I won't make it. Tomorrow, then."] },
    lucian: { role: 'lorry driver', g: ['Salut, boss. Good evening.', "I've come up from Murcia with the lorry."], pre: ['Make it'], post: ["A big one, I've got four hundred kilometres to go.", 'Mulțumesc.'], w: ["Boss, the tachograph won't wait."], ok: ['Bun. Very good, boss.'], x: ["I'm off, boss. The tachograph."] },
    hans: { role: 'early-rising pensioner', g: ['Guten Morgen. Good morning.', 'I walk every morning at five.'], pre: ['Please,'], post: ["No rush. I'm retired.", 'Danke.'], w: ["It's fine. I'll watch the sea meanwhile."], ok: ['Sehr gut. Very tasty.'], x: ["I'll carry on with my walk. Tschüss."] },
    montse: { role: 'never happy', g: ["Let's see what you serve me today.", 'This place gets dirtier every day.'], pre: ['I want'], post: ['And NO onion. Last time it repeated on me all night.', 'No onion, I know your sort.'], w: ['You people have no idea how to serve.', "I'm leaving a review."], ok: ["Well. It's edible."], bad: ['I knew it. I knew it.'], no: ["Were you listening? That's not it."], x: ['One star. And thanks.'] },
    jony: { role: 'in a hurry', g: ["What's up, cuz."], pre: ['Give me'], post: ['And the good stuff, eh?'], w: ['Cuz, speed it up.'], run: ['Put it on my tab, loser!', "I'll pay you tomorrow, clown!"], caught: ["OK, OK, OK! Here, take it! You're insane!"], x: ["I'm not waiting, cuz."] },
    atracador: { role: 'not here for dinner', rob: ['The till! Give me the till, NOW!', "Don't move! All the money, come on!"], robflee: ["Hey, hey, easy! I'm going, I'm going!"], robwin: ["That's more like it. Not a word."] },
    abel: { role: 'street musician', g: ['Good evening, friend.'], pre: ['Can I get'], post: ["I'm paying in coins, that's what lands in the hat."], w: ['No rush. The night is long.'], ok: ['The next song is for you.'], x: ["I'm heading back to the promenade."] },
    dani: { role: 'waiter, just closed up', g: ['Evening, mate. Just closed the bar.'], pre: ['Give me'], post: ['I work in hospitality too. Hang in there tonight.'], w: ["Easy, I know what it's like alone in a kitchen."], ok: ['Keep the change. I know what this is like.'], x: ["Another day, mate. I'm wrecked."] },
    manolo: { role: 'has had a few', g: ['Do you think the kebab spins... or do we?', "Shhh. Don't let my wife find out."], pre: ['I want... I wanted...'], post: ['Or was it a pizza? No. That.', 'Life is a dürüm, kid.'], w: ['Still here. Like the meat. Going round and round.'], ok: ["You're a philosopher. Like me."], x: ["I'm off to watch the sunrise."] },
    julian: { role: 'sleeps in the doorway next door', g: ["Good evening, boss. Don't mean to bother."], pre: ['If you can, just'], post: ["I've got nothing to pay you with."], w: ["If you can't, I'll go. It's all right."], ok: ["God bless you. Listen: don't open the back door without looking. I saw something in the alley.", "Thanks, boss. And if the lights go out, don't stand still."], x: ["It's all right. Good night."] },
    aitana: { role: 'filming everything', g: ["Hiii guys. We're at the grimiest kebab shop in Benidorm.", "Can I film? I'm filming."], pre: ['OK so, I want'], post: ["And make it pretty, I'm posting it."], w: ["I'm losing my live stream, dude."], ok: ['Guys, ten out of ten. Tagging the place.'], bad: ["Guys... don't come. Two out of ten."], x: ['Ending the stream. So embarrassing.'] },
    erik: { role: 'lost tourist', g: ['Sorry. Hotel Poseidón? I am lost.', "Hello. My hotel... I can't find it."], pre: ['Also,'], post: ['Is Poniente beach to the left?'], w: ["I wait. I don't know where to go anyway."], ok: ['Tack. Thank you. Good kebab.'], x: ['I look for another place. Thanks.'] },
    ramiro: { role: 'the every-night regular', g: ['Quarter past three. As always.', 'Evening. My usual.'], pre: ['Same as every night:'], post: ['Thirty years coming here. Thirty.'], w: ['The last fellow never kept me waiting.'], ok: ["That's it. Like the last fellow made it... before he stopped coming."], x: ['Thirty years. And tonight I go without dinner.'] },
    vanesa: { role: 'casino croupier', g: ['Evening. Just got out of the casino.'], pre: ['Give me'], post: ['The house won tonight. As always.'], w: ["Come on, I've been on my feet eight hours."], ok: ['All in on the dürüm. Thanks.'], x: ["No more bets. I'm out."] },
    chema: { role: 'bin lorry crew', g: ['Evening. Parking the lorry for a minute.'], pre: ['Give me'], post: ['By the way: your bin out back is scratched from the inside.', "Quick, my mate's waiting."], w: ["The lorry's still running."], ok: ["Thanks, champ. I'll empty yours first tomorrow."], x: ["My mate's honking. Another day."] },
    oscar: { role: 'ambulance technician', g: ["Evening. I've got five minutes between calls."], pre: ['Give me'], post: ["And if the radio goes off, I'm running."], w: ["Come on, a call's about to come in."], ok: ['Perfect. Take care tonight.'], x: ['Call. I have to go.'] },
    fermin: { role: 'walks the dog at four', g: ["Evening. The dog's staying outside. He won't come in. That's never happened before."], pre: ['Give me'], post: ["He's been barking at your back door all night."], w: ["Come on, the dog's getting nervous."], ok: ["Thanks. Come on, Toby, let's get out of here."], x: ["The dog's pulling me away. I'm off."] },
    yolanda: { role: 'looking for her son', g: ["Have you seen a lad with his shirt open? He's my son."], pre: ["While I'm here, give me"], post: ['When I catch him, Benidorm is over for him.'], w: ["Hurry up, I'm still looking for him."], ok: ["Thanks. If you see him, tell him his mother's looking for him."], x: ["I can't wait. I'll keep looking."] },
  },
  ro: {
    dave: { role: 'petrecerea burlacilor', g: ['Amigo! Amigooo...', "Oi oi. Bună seara, șefu'."], pre: ['One... uno... ăă,', 'Mate, dă-mi'], post: ['Por favor. Cheers.', 'Și repede, că pic din picioare.'], w: ['Mate... mai durează mult?', 'Amigo, mor de foame, pe bune.'], ok: ['Legend! Ești o legendă.', 'Cheers, amigo. Cel mai bun kebab din Spania.'], bad: ["E... ciudat. Da' îl mănânc."], x: ['Bah. Mă duc la burgeri.'], no: ['Nu, nu, nu. Ăsta nu-i al meu, mate.'] },
    linda: { role: 'petrecerea burlăcițelor', g: ['Bunăăă! Aveți deschis?', 'Uuu. Miroase a rai aici.'], pre: ['Pentru mine,', 'Dă-mi'], post: ['Sâmbătă mă mărit!', 'Mersi, frumosule.'], w: ['Dragule, îmi trece cheful.'], ok: ['Te iubesc! Vino la nuntă!', 'Sunteți cei mai tari. Pe bune.'], x: ['Atunci mă întorc la fete.'] },
    paco: { role: 'taximetrist de noapte', g: ['Bună seara.', 'Lungă noapte, nu?'], pre: ['Dă-mi', 'Ca de obicei:'], post: ['Și repejor, că am taxiul parcat pe linia a doua.', 'Azi nu se mai termină lumea.'], w: ['Îmi iau amendă, băiete.', 'Îl vânezi sau ce faci?'], ok: ['Așa da. Pe mâine.'], x: ['Nici kebab, nici nimic. Am plecat.'] },
    ruben: { role: 'livrator', g: ['Comandă din aplicație.', 'Am venit să ridic.'], pre: ['Îmi apare:', 'Aici scrie:'], post: ['Că mă penalizează dacă întârzii.', 'Numărul 4471, cred.'], w: ['Frate, îmi scrie clientul întruna.', 'Îmi scade ratingul din cauza ta.'], ok: ['Bine, mersi. Am zburat.'], x: ['O anulez. Las-o baltă.'] },
    marta: { role: 'asistentă medicală', g: ['Bună... scuze, sunt moartă de oboseală.', 'Bună seara. Douăsprezece ore de gardă.'], pre: ['Dă-mi'], post: ['Mulțumesc, pe bune.', 'Îl mănânc în mașină până nu adorm.'], w: ['Nu-i nimic, dar adorm în picioare.'], ok: ['Mi-ai salvat noaptea.'], x: ['Îmi pare rău, nu mai rezist. Mă duc la culcare.'] },
    soler: { name: 'Agentul Soler', role: 'poliția locală', g: ['Bună seara. Totul liniștit pe aici?'], pre: ['Dă-mi'], post: ['La pachet, că suntem în patrulare.', 'Azi sunt mulți ciudați pe stradă.'], w: ['Hai, că ne cheamă prin stație.'], ok: ['Mulțumesc. Dacă vezi ceva ciudat, sună.'], x: ['Am o chemare. Altă dată.'], gun: ['Pușca aia cu țeava tăiată are acte, nu? ...Eu n-am văzut nimic.'] },
    ivan: { role: 'student', g: ['Bună... care-i cel mai ieftin?'], pre: ['Păi...', 'Îmi ajung banii de'], post: ['Să vedem dacă-mi ajunge mărunțișul.', 'Mâine am examen și n-am deschis cartea.'], w: ["Ăă... fără grabă, da' mi-e foame."], ok: ['Mersi, frate. Îmi dai viață.'], x: ['Las-o. Iar mănânc paste.'] },
    encarna: { role: 'nu poate dormi', g: ['Bună seara, maică. Nu pot să dorm.', 'Vai, ce târziu aveți deschis, maică.'], pre: ['Dă-mi'], post: ["E pentru nepotu', că vine de la petrecere.", 'Și nu-i pune mult, că pe urmă i se apleacă.'], w: ['Stai liniștit, maică. La vârsta mea nu mă grăbesc.'], ok: ['Să-ți dea Dumnezeu sănătate, maică.'], x: ['Mă duc, maică, că s-a făcut răcoare.'] },
    kevin: { role: 'iese din club', g: ['Heeei, șefule!', 'Ce faci, campionule?'], pre: ['Dă-mi'], post: ['Și încarcă-l bine, că am rupt ringul.', 'Cu mult sos, tigrule.'], w: ['Șefule, mi se duce cheful.', 'Hai, titane, bagă.'], ok: ['Brutal! Ești o fiară.'], x: ['Am tăiat-o, șefule. Prea încet.'] },
    sergio: { role: 'paznic la club', g: ['Seara.'], pre: ['Dă-mi'], post: ['Bine încărcat.', 'Azi am scos șase afară.'], w: ['...', 'Trebuie să mă întorc la ușă.'], ok: ['Corect.'], x: ['N-am toată noaptea.'] },
    toni: { role: 'face curat prin hoteluri în zori', g: ['Bună, dragule. La cinci intru la curățenie la hotel.'], pre: ['Dă-mi'], post: ['Și într-o zi îmi dai mopul și-ți fac curat aici, că Doamne ferește.', 'Fără grabă, dar pontez la fix.'], w: ['Maică, eu pontez la fix.'], ok: ['Mersi, puiule.'], x: ['Nu mai ajung. Rămâne pe mâine.'] },
    lucian: { role: 'șofer de TIR', g: ["Salut, șefu'. Bună seara.", 'Vin de la Murcia cu camionul.'], pre: ['Pune-mi'], post: ['Mare, că mai am patru sute de kilometri.', 'Mulțumesc.'], w: ["Șefu', tahograful nu așteaptă."], ok: ["Bun. Foarte bun, șefu'."], x: ["Am plecat, șefu'. Tahograful."] },
    hans: { role: 'pensionar matinal', g: ['Guten Morgen. Bună dimineața.', 'Eu merg pe jos în fiecare dimineață la cinci.'], pre: ['Vă rog,'], post: ['Fără grabă. Sunt pensionar.', 'Danke.'], w: ['Liniștit. Eu mă uit la mare între timp.'], ok: ['Sehr gut. Foarte gustos.'], x: ['Îmi continui plimbarea. Tschüss.'] },
    montse: { role: 'niciodată mulțumită', g: ['Ia să vedem ce-mi dați azi.', 'Aici e tot mai murdar pe zi ce trece.'], pre: ['Vreau'], post: ['Și FĂRĂ ceapă. Că data trecută mi s-a aplecat toată noaptea.', 'Fără ceapă, că te știu eu.'], w: ['Habar n-aveți să serviți.', 'O să las o recenzie.'], ok: ['Bine. Se poate mânca.'], bad: ['Știam eu. Știam eu.'], no: ['Tu m-ai ascultat? Nu ăsta.'], x: ['O stea. Și mersi.'] },
    jony: { role: 'vine pe fugă', g: ['Ce faci, vere.'], pre: ['Dă-mi'], post: ['Și din ăla bun, da?'], w: ['Vere, bagă viteză.'], run: ['Trece-l la cont, fraiere!', 'Ți-l plătesc mâine, clovnule!'], caught: ['Bine, bine, bine! Ia, ia! Ești nebun!'], x: ['Nu mai stau, vere.'] },
    atracador: { role: 'n-a venit la cină', rob: ['Casa! Dă-mi ce-i în casă, ACUM!', 'Nu mișca! Toți banii, hai!'], robflee: ['Hei, hei, ușor! Plec, plec!'], robwin: ['Așa-mi place. Niciun cuvânt.'] },
    abel: { role: 'muzicant stradal', g: ['Bună seara, colega.'], pre: ['Îmi pui'], post: ['Îți plătesc în monede, că asta pică în șapcă.'], w: ['Fără grabă. Noaptea e lungă.'], ok: ['Următorul cântec e pentru tine.'], x: ['Mă întorc pe faleză.'] },
    dani: { role: 'chelner, tocmai a închis', g: ['Bună, colega. Tocmai am închis barul.'], pre: ['Dă-mi'], post: ['Și eu lucrez în HoReCa. Baftă la noapte.'], w: ['Liniștit, știu cum e să fii singur în bucătărie.'], ok: ['Păstrează restul. Știu cum e.'], x: ['Altă dată, colega. Sunt rupt.'] },
    manolo: { role: 'a băut câteva', g: ['Tu crezi că kebabul se învârte... sau noi?', 'Șșș. Să nu afle nevastă-mea.'], pre: ['Eu vreau... eu voiam...'], post: ['Sau era o pizza? Nu. Asta.', 'Viața e un dürüm, băiete.'], w: ['Tot aici sunt. Ca și carnea. Mă învârt.'], ok: ['Ești un filozof. Ca mine.'], x: ['Mă duc să văd răsăritul.'] },
    julian: { role: 'doarme în gangul de alături', g: ["Bună seara, șefu'. Nu vreau să deranjez."], pre: ['Dacă se poate, doar'], post: ['N-am cu ce să-ți plătesc.'], w: ['Dacă nu se poate, plec. Nu-i nimic.'], ok: ['Să-ți dea Dumnezeu. Auzi: nu deschide ușa din spate fără să te uiți. Am văzut ceva pe alee.', "Mulțumesc, șefu'. Și dacă se ia curentul, nu sta pe loc."], x: ['Nu-i nimic. Noapte bună.'] },
    aitana: { role: 'filmează tot', g: ['Bunăăă, dragilor. Suntem la cel mai jegos kebab din Benidorm.', 'Pot să filmez? Filmez.'], pre: ['Deci, vreau'], post: ['Și să arate bine, că îl postez.'], w: ['Îmi pică live-ul, frate.'], ok: ['Dragilor, nota zece. Dau tag la local.'], bad: ['Dragilor... nu veniți. Nota doi.'], x: ['Închid live-ul. Ce rușine.'] },
    erik: { role: 'turist rătăcit', g: ['Scuze. Hotel Poseidón? M-am rătăcit.', 'Hello. Hotelul meu... nu-l găsesc.'], pre: ['Și,'], post: ['Plaja Poniente e la stânga?'], w: ['Aștept. Oricum nu știu unde să merg.'], ok: ['Tack. Mulțumesc. Kebab bun.'], x: ['Caut alt loc. Mulțumesc.'] },
    ramiro: { role: 'cel din fiecare noapte', g: ['Trei și un sfert. Ca întotdeauna.', 'Bună seara. Al meu.'], pre: ['Ca în fiecare noapte:'], post: ['De treizeci de ani vin aici. Treizeci.'], w: ['Cel dinainte nu mă lăsa să aștept.'], ok: ['Așa. Cum îl făcea cel dinainte... până n-a mai venit.'], x: ['Treizeci de ani. Și azi plec nemâncat.'] },
    vanesa: { role: 'crupieră la cazinou', g: ['Bună seara. Acum ies de la cazinou.'], pre: ['Dă-mi'], post: ['Azi a câștigat casa. Ca întotdeauna.'], w: ['Hai, că stau de opt ore în picioare.'], ok: ['Totul pe dürüm. Mersi.'], x: ['Nu mai merge nimic. Mă retrag.'] },
    chema: { role: 'de la salubritate', g: ['Bună seara. Las camionul un pic.'], pre: ['Dă-mi'], post: ['Apropo: tomberonul vostru din spate e zgâriat pe dinăuntru.', 'Repejor, că mă așteaptă colegul.'], w: ['Că am camionul pornit.'], ok: ['Mersi, șefule. Mâine vă iau primii.'], x: ['Mă claxonează colegul. Altă dată.'] },
    oscar: { role: 'paramedic pe ambulanță', g: ['Bună seara. Am cinci minute între apeluri.'], pre: ['Dă-mi'], post: ['Și dacă sună stația, am fugit.'], w: ['Hai, că vine un apel.'], ok: ['Perfect. Aveți grijă în noaptea asta.'], x: ['Apel. Trebuie să plec.'] },
    fermin: { role: 'plimbă câinele la patru dimineața', g: ['Bună seara. Câinele rămâne afară. Nu vrea să intre. Nu i s-a mai întâmplat.'], pre: ['Dă-mi'], post: ['Toată noaptea a lătrat la ușa voastră din spate.'], w: ['Hai, că se agită câinele.'], ok: ['Mersi. Hai, Toby, să plecăm de aici.'], x: ['Mă trage câinele. Am plecat.'] },
    yolanda: { role: 'își caută fiul', g: ['Ai văzut un băiat cu cămașa descheiată? E fiu-meu.'], pre: ['Dacă tot sunt aici, dă-mi'], post: ['Când pun mâna pe el, s-a terminat cu Benidormul.'], w: ['Grăbește-te, că încă îl caut.'], ok: ['Mersi. Dacă îl vezi, spune-i că îl caută maică-sa.'], x: ['Nu pot să aștept. Mai caut.'] },
  },
};

/* ---------- funciones ---------- */
function T(key) {
  const s = STR[LANG][key] !== undefined ? STR[LANG][key] : STR.es[key];
  if (s === undefined) return key;
  const a = arguments; return s.replace(/\{(\d)\}/g, (m, i) => a[+i + 1]);
}
function aName(a) { const Ar = ARCH[a], t = XL[LANG] && XL[LANG][Ar.id]; return (t && t.name) || Ar.name; }
function aRole(a) { const Ar = ARCH[a], t = XL[LANG] && XL[LANG][Ar.id]; return (t && t.role) || Ar.role; }
function aLines(a, key) {
  const Ar = ARCH[a];
  if (LANG === 'es') return Ar[key] || GEN[key] || ['...'];
  const t = XL[LANG][Ar.id];
  return (t && t[key]) || GENX[LANG][key] || Ar[key] || GEN[key] || ['...'];
}
function eur(v) { return LANG === 'en' ? '€' + v.toFixed(2) : v.toFixed(2).replace('.', ',') + ' €'; }
function vegPhrase(v) {
  const X = LX[LANG]; if (v === 7) return X.vAll; if (v === 0) return X.vNone;
  const has = [], no = []; for (let i = 0; i < 3; i++) ((v >> i) & 1 ? has : no).push(X.veg[i]);
  return (no.length === 1 ? X.vNo : X.vOnly).replace('{0}', no.length === 1 ? no[0] : has[0]);
}
function saucePhrase(s) { return LX[LANG].sPh[s & 3]; }
function itemPhrase(it) {
  const X = LX[LANG];
  if (it.k === 'fr') return X.frPh;
  if (it.k === 'dr') return X.drPh[it.t];
  let head;
  if (LANG === 'en') head = 'a ' + X.meat[it.m] + ' ' + X.base[it.b];
  else if (LANG === 'ro') head = X.bart[it.b] + ' ' + X.base[it.b] + ' ' + (it.m === 2 ? (it.b === 0 ? 'mixt' : 'mixtă') : 'de ' + X.meat[it.m]);
  else head = X.bart[it.b] + ' ' + X.base[it.b] + ' ' + (it.m === 2 ? (it.b === 0 ? 'mixto' : 'mixta') : 'de ' + X.meat[it.m]);
  return head + ', ' + vegPhrase(it.v) + ', ' + saucePhrase(it.s);
}
function kbShort(it) { const X = LX[LANG]; return LANG === 'en' ? X.meat[it.m] + ' ' + X.base[it.b] : X.base[it.b] + ' ' + X.meat[it.m]; }
function orderPhrase(ord) {
  const p = ord.map(itemPhrase); if (!p.length) return '';
  if (p.length === 1) return p[0];
  return p.slice(0, -1).join('; ') + LX[LANG].and + p[p.length - 1];
}
function itemName(h) {
  const N = LX[LANG].nm; if (!h) return N.none;
  if (h.k === 'gun') return N.gun; if (h.k === 'fr') return N.fr; if (h.k === 'dr') return N.dr[h.t]; if (h.k === 'vg') return N.vg[h.t]; if (h.k === 'kb') return N.kb[h.b];
  return '?';
}
function handDesc(h) {
  if (!h) return ''; const X = LX[LANG], Hh = X.h;
  if (h.k === 'kb') {
    const mt = h.m[0] && h.m[1] ? X.meat[2] : h.m[0] ? X.meat[0] : h.m[1] ? X.meat[1] : Hh.nomeat;
    const vg = []; for (let i = 0; i < 3; i++) if (h.v >> i & 1) vg.push(X.veg[i]);
    const sa = []; for (let i = 0; i < 2; i++) if (h.s >> i & 1) sa.push(X.sauce[i]);
    return X.base[h.b].toUpperCase() + ' · ' + mt + (h.r > 0.4 ? Hh.raw : '') + (vg.length ? ' · ' + vg.join(', ') : '') + (sa.length ? ' · ' + sa.join(', ') : '') + (h.f ? ' · ' + X.fries : '') + (h.w ? ' · ' + (h.b === 2 ? Hh.closed : Hh.wrapped) : '');
  }
  if (h.k === 'fr') return X.fries.toUpperCase() + (h.q < 0.4 ? Hh.bad : '');
  if (h.k === 'dr') return X.drink[h.t].toUpperCase();
  if (h.k === 'vg') return X.veg[h.t].toUpperCase() + Hh.uncut;
  if (h.k === 'gun') return Hh.gun;
  return '';
}
function doneWord(d) { return LX[LANG].done[d < 0.35 ? 0 : d < 0.55 ? 1 : d <= 1.15 ? 2 : d <= 1.4 ? 3 : 4]; }
function pickLang() {
  let l = null; try { l = localStorage.getItem('kp-lang'); } catch (e) { }
  if (LANGS.indexOf(l) < 0) { const n = (navigator.language || 'es').slice(0, 2).toLowerCase(); l = n === 'ro' ? 'ro' : n === 'es' || n === 'ca' || n === 'gl' || n === 'eu' ? 'es' : 'en'; }
  return l;
}
