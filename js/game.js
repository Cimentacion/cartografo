/* ================= DATOS ================= */
const HOUR_LEN = 54, NIGHT_LEN = HOUR_LEN * 7;      // 23:00 -> 06:00
const BASES = [{ n: 'dürüm', art: 'un', price: 6 }, { n: 'pita', art: 'una', price: 5 }, { n: 'caja', art: 'una', price: 7.5 }];
const MEATS = ['pollo', 'ternera', 'mixto'];
const VEGS = ['lechuga', 'tomate', 'cebolla'];
const SAUCES = ['salsa blanca', 'picante'];
const DRINKS = [{ n: 'cola', art: 'una', price: 1.8 }, { n: 'agua', art: 'un', price: 1.2 }, { n: 'cerveza', art: 'una', price: 2.2 }];
const FRIES_PRICE = 2.5;

const SK = { pale: '#efcdb6', light: '#e3b392', tan: '#c8906a', olive: '#b5825c', brown: '#8d5c3e', dark: '#5e3c29', burn: '#e59a84' };
const LOOK0 = { skin: SK.light, hair: '#2a2018', hs: 'short', top: '#55585e', ts: 'tee', legs: '#2b3040', ls: 'long', h: 1.74, w: 1, beard: 0, gl: 0, age: 0.2, fem: 0, acc: null, ex: null, eye: '#3a2a1a' };
const ORD0 = { b: [5, 3, 2], m: [4, 3, 3], fr: 0.3, dr: 0.45, drk: [5, 3, 2], all: 0.5, hot: 0.4, n2: 0 };

const ARCH = [];
function A(id, name, role, look, o, opt, lines) {
  ARCH.push(Object.assign({ id, name, role, look: Object.assign({}, LOOK0, look), o: Object.assign({}, ORD0, o), pat: 1, tip: 0.1, voice: 1, hrs: [0, 7], sp: null }, opt, lines));
}

A('dave', 'Dave', 'despedida de soltero',
  { skin: SK.burn, hair: '#b98f4a', top: '#b0202a', ts: 'foot', legs: '#d8d0bb', ls: 'short', h: 1.83, w: 1.15, beard: 1, burn: 1 },
  { b: [5, 2, 3], m: [3, 3, 4], fr: 0.5, dr: 0.55, drk: [2, 1, 6], all: 0.7, hot: 0.5 },
  { sp: 'drunk', pat: 1.15, tip: 0.25, voice: 0.8, hrs: [1, 6.6] },
  { g: ['¡Amigo! Amigooo...', 'Oi oi. Buenas noches, jefe.'], pre: ['One... uno... eh,', 'Mate, ponme'], post: ['Por favor. Cheers.', 'Y rápido, que me caigo.'],
    w: ['Mate... ¿falta mucho?', 'Amigo, tengo hambre de verdad.'], ok: ['¡Legend! Eres una leyenda.', 'Cheers, amigo. El mejor kebab de España.'],
    bad: ['Esto está... raro. Pero me lo como.'], x: ['Bah. Me voy a la hamburguesería.'], no: ['No, no, no. Eso no es lo mío, mate.'] });

A('linda', 'Linda', 'despedida de soltera',
  { skin: SK.pale, hair: '#d9b25e', hs: 'long', top: '#d63f8c', ts: 'tee', legs: '#1c1c22', ls: 'short', h: 1.66, w: 0.92, fem: 1, acc: 'tiara', burn: 1 },
  { b: [4, 4, 2], m: [5, 2, 3], fr: 0.5, dr: 0.5, drk: [3, 4, 3], all: 0.5, hot: 0.2 },
  { sp: 'drunk', pat: 1.2, tip: 0.2, voice: 1.45, hrs: [1, 6.6] },
  { g: ['¡Holaaa! ¿Estáis abiertos?', 'Uuuh. Aquí huele a gloria.'], pre: ['Para mí,', 'Ponme'], post: ['¡Que me caso el sábado!', 'Gracias, guapo.'],
    w: ['Cariño, que se me pasa la fiesta.'], ok: ['¡Te quiero! ¡Ven a la boda!', 'Sois los mejores. De verdad.'], x: ['Pues me voy con las chicas.'] });

A('paco', 'Paco', 'taxista de noche',
  { skin: SK.tan, hair: '#4a4a4a', top: '#e8e4d6', ts: 'shirt', legs: '#23262e', h: 1.7, w: 1.12, beard: 3, age: 0.65, bags: 1 },
  { b: [6, 3, 1], m: [2, 6, 2], fr: 0.15, dr: 0.6, drk: [6, 3, 1], all: 0.6, hot: 0.5 },
  { pat: 0.8, tip: 0.05, voice: 0.75 },
  { g: ['Buenas.', 'Noche larga, ¿eh?'], pre: ['Ponme', 'Lo de siempre:'], post: ['Y ligerito, que tengo el taxi en doble fila.', 'Que hoy no para de salir gente.'],
    w: ['Que me multan, chaval.', '¿Lo estás cazando o qué?'], ok: ['Así da gusto. Hasta mañana.'], x: ['Ni kebab ni leches. Me voy.'] });

A('ruben', 'Rubén', 'repartidor',
  { skin: SK.olive, hair: '#1d1a17', top: '#1f8f86', ts: 'jacket', legs: '#1f2126', h: 1.76, acc: 'helmet', ex: 'backpack', beard: 1 },
  { b: [5, 3, 3], m: [4, 3, 3], fr: 0.4, dr: 0.5, drk: [6, 3, 1], all: 0.5, hot: 0.4, n2: 0.6 },
  { sp: 'rider', pat: 0.8, tip: 0, voice: 1.05 },
  { g: ['Pedido de la app.', 'Vengo a recoger.'], pre: ['Me sale:', 'Aquí pone:'], post: ['Que me penalizan si tardo.', 'El 4471, creo.'],
    w: ['Tío, que el cliente me está escribiendo.', 'Me bajan la valoración por tu culpa.'], ok: ['Vale, gracias. Volando.'], x: ['Lo cancelo. Paso.'] });

A('marta', 'Marta', 'enfermera',
  { skin: SK.light, hair: '#5a3620', hs: 'bun', top: '#3f9c94', ts: 'scrub', legs: '#3f9c94', h: 1.65, w: 0.92, fem: 1, bags: 1 },
  { b: [2, 6, 2], m: [7, 2, 1], fr: 0.2, dr: 0.7, drk: [2, 7, 1], all: 0.3, hot: 0.15 },
  { pat: 1.2, tip: 0.15, voice: 1.3 },
  { g: ['Hola... perdona, vengo muerta.', 'Buenas noches. Doce horas de guardia.'], pre: ['Ponme'], post: ['Gracias, de verdad.', 'Me lo como en el coche antes de dormirme.'],
    w: ['No pasa nada, pero me duermo de pie.'], ok: ['Me has salvado la noche.'], x: ['Lo siento, no aguanto más. Me voy a dormir.'] });

A('soler', 'Agente Soler', 'policía local',
  { skin: SK.tan, hair: '#2a2018', top: '#1a2540', ts: 'pol', legs: '#1a2540', h: 1.8, w: 1.1, acc: 'polcap', beard: 1 },
  { b: [6, 2, 2], m: [3, 3, 4], fr: 0.3, dr: 0.8, drk: [7, 3, 0], all: 0.6, hot: 0.3 },
  { sp: 'cop', pat: 0.95, tip: 0.1, voice: 0.85 },
  { g: ['Buenas noches. ¿Todo tranquilo por aquí?'], pre: ['Ponme'], post: ['Para llevar, que estamos de patrulla.', 'Hoy hay mucho raro por la calle.'],
    w: ['Venga, que nos llaman por la emisora.'], ok: ['Gracias. Si ves algo raro, llama.'], x: ['Tengo un aviso. Otro día.'],
    gun: ['Esa recortada tendrá papeles, ¿no? ...Yo no he visto nada.'] });

A('ivan', 'Iván', 'estudiante',
  { skin: SK.pale, hair: '#3b2a1c', top: '#5b6b3a', ts: 'hood', legs: '#30323a', h: 1.78, w: 0.9, gl: 1, bags: 1 },
  { b: [2, 7, 1], m: [6, 3, 1], fr: 0.15, dr: 0.15, drk: [5, 5, 0], all: 0.7, hot: 0.4 },
  { pat: 1.1, tip: 0, voice: 1.15 },
  { g: ['Hola... ¿qué es lo más barato?'], pre: ['Pues...', 'Me llega para'], post: ['A ver si me da con la calderilla.', 'Mañana tengo examen y no he abierto el libro.'],
    w: ['Eh... sin prisa, pero tengo hambre.'], ok: ['Gracias, tío. Me das la vida.'], x: ['Da igual. Ceno pasta otra vez.'] });

A('encarna', 'Doña Encarna', 'no puede dormir',
  { skin: SK.pale, hair: '#c9c6c0', hs: 'bun', top: '#7a4a6a', ts: 'shirt', legs: '#3a3a40', h: 1.52, w: 1.02, fem: 1, age: 1, gl: 1 },
  { b: [3, 6, 1], m: [7, 2, 1], fr: 0.2, dr: 0.2, drk: [2, 8, 0], all: 0.3, hot: 0.05 },
  { pat: 1.9, tip: 0.1, voice: 1.25 },
  { g: ['Buenas noches, hijo. No puedo dormir.', 'Ay, qué tarde abrís, hijo.'], pre: ['Ponme'], post: ['Es para mi nieto, que viene de fiesta.', 'Y no le pongas mucho, que luego repite.'],
    w: ['Tranquilo, hijo. Yo a mi edad no tengo prisa.'], ok: ['Dios te lo pague, hijo.'], x: ['Me voy, hijo, que refresca.'] });

A('kevin', 'Kevin', 'sale de la discoteca',
  { skin: SK.tan, hair: '#17130f', top: '#e9e9e9', ts: 'open', legs: '#1b1b20', h: 1.77, beard: 1 },
  { b: [6, 2, 2], m: [3, 3, 4], fr: 0.4, dr: 0.5, drk: [5, 1, 4], all: 0.8, hot: 0.85 },
  { pat: 0.9, tip: 0.15, voice: 1, hrs: [3, 7] },
  { g: ['¡Eeey, máquina!', '¿Qué pasa, crack?'], pre: ['Ponme'], post: ['Y cárgalo bien, que vengo de reventar la pista.', 'Con mucha salsa, fiera.'],
    w: ['Máquina, que se me baja.', 'Venga, titán, dale.'], ok: ['¡Brutal! Eres un fiera.'], x: ['Me abro, máquina. Muy lento.'] });

A('sergio', 'Sergio', 'portero de discoteca',
  { skin: SK.brown, hair: '#111', hs: 'bald', top: '#141416', ts: 'seg', legs: '#141416', h: 1.96, w: 1.38, beard: 2 },
  { b: [2, 1, 7], m: [2, 5, 3], fr: 0.3, dr: 0.6, drk: [3, 7, 0], all: 0.6, hot: 0.5 },
  { pat: 1, tip: 0.1, voice: 0.6, hrs: [2, 7] },
  { g: ['Buenas.'], pre: ['Dame'], post: ['Bien cargada.', 'Hoy he sacado a seis.'],
    w: ['...', 'Tengo que volver a la puerta.'], ok: ['Correcto.'], x: ['No tengo toda la noche.'] });

A('toni', 'Toñi', 'limpia hoteles de madrugada',
  { skin: SK.light, hair: '#8c2a22', top: '#3d5fa0', ts: 'scrub', legs: '#2b3040', h: 1.6, w: 1.08, fem: 1, age: 0.7 },
  { b: [3, 6, 1], m: [6, 2, 2], fr: 0.2, dr: 0.5, drk: [6, 4, 0], all: 0.5, hot: 0.3 },
  { pat: 1, tip: 0.1, voice: 1.2, hrs: [3.5, 7] },
  { g: ['Buenas, cariño. Entro a las cinco a limpiar el hotel.'], pre: ['Ponme'], post: ['Y un día me dejas la fregona y te limpio esto, que madre mía.', 'Sin prisa, pero ficho en punto.'],
    w: ['Hijo, que ficho en punto.'], ok: ['Gracias, rey.'], x: ['No llego. Mañana será.'] });

A('lucian', 'Lucian', 'camionero',
  { skin: SK.light, hair: '#5b4630', top: '#7a2b2b', ts: 'plaid', legs: '#2c3a55', h: 1.8, w: 1.2, beard: 2, acc: 'cap', age: 0.5 },
  { b: [7, 1, 2], m: [2, 6, 2], fr: 0.45, dr: 0.6, drk: [6, 4, 0], all: 0.7, hot: 0.5 },
  { pat: 1, tip: 0.15, voice: 0.7 },
  { g: ['Salut, jefe. Buenas noches.', 'Vengo de Murcia con el camión.'], pre: ['Pon'], post: ['Grande, que me quedan cuatrocientos kilómetros.', 'Mulțumesc.'],
    w: ['Jefe, el tacógrafo no espera.'], ok: ['Bun. Muy bueno, jefe.'], x: ['Me voy, jefe. El tacógrafo.'] });

A('hans', 'Hans', 'jubilado madrugador',
  { skin: SK.burn, hair: '#e8e6e0', top: '#6f9fc8', ts: 'shirt', legs: '#c9bfa5', ls: 'short', h: 1.79, gl: 1, age: 0.95 },
  { b: [2, 7, 1], m: [6, 3, 1], fr: 0.2, dr: 0.7, drk: [1, 7, 2], all: 0.6, hot: 0.05 },
  { pat: 1.6, tip: 0.2, voice: 0.85, hrs: [5, 7] },
  { g: ['Guten Morgen. Buenos días.', 'Yo camino cada mañana a las cinco.'], pre: ['Por favor,'], post: ['Sin prisa. Estoy jubilado.', 'Danke.'],
    w: ['Tranquilo. Yo miro el mar mientras.'], ok: ['Sehr gut. Muy rico.'], x: ['Sigo mi paseo. Tschüss.'] });

A('montse', 'Montse', 'nunca está contenta',
  { skin: SK.light, hair: '#b0832f', hs: 'long', top: '#b8b0a0', ts: 'jacket', legs: '#3a3440', h: 1.63, fem: 1, age: 0.6, gl: 1 },
  { b: [4, 5, 1], m: [6, 3, 1], fr: 0.2, dr: 0.4, drk: [3, 7, 0], all: 0, hot: 0.1 },
  { sp: 'picky', pat: 0.7, tip: 0, voice: 1.35 },
  { g: ['A ver qué me dais hoy.', 'Esto está más sucio cada día.'], pre: ['Quiero'], post: ['Y SIN cebolla. Que la otra vez repetí toda la noche.', 'Sin cebolla, que te veo venir.'],
    w: ['Es que no tenéis ni idea de atender.', 'Voy a poner una reseña.'], ok: ['Bueno. Se puede comer.'], bad: ['Lo sabía. Lo sabía.'],
    no: ['¿Tú me has escuchado? Eso no es.'], x: ['Una estrella. Y gracias.'] });

A('jony', 'Jony', 'viene con prisa',
  { skin: SK.tan, hair: '#17130f', top: '#101012', ts: 'track', legs: '#101012', h: 1.72, w: 0.95, acc: 'cap', beard: 1 },
  { b: [5, 1, 4], m: [3, 4, 3], fr: 0.6, dr: 0.7, drk: [6, 0, 4], all: 0.7, hot: 0.5 },
  { sp: 'sinpa', pat: 0.9, tip: 0, voice: 1.05 },
  { g: ['Qué pasa, primo.'], pre: ['Ponme'], post: ['Y del bueno, ¿eh?'], w: ['Primo, dale caña.'],
    run: ['¡Apúntamelo, pringao!', '¡Te lo pago mañana, payaso!'], caught: ['¡Vale, vale, vale! ¡Toma, toma! ¡Estás loco!'], x: ['Paso de esperar, primo.'] });

A('atracador', '???', 'no viene a cenar',
  { skin: SK.light, hair: '#111', top: '#16171a', ts: 'hood', legs: '#22242a', h: 1.78, acc: 'hood', ex: 'knife', mask: 1 },
  {}, { sp: 'robber', voice: 0.7 },
  { rob: ['¡La caja! ¡Dame lo de la caja, YA!', '¡Quieto! ¡Todo el dinero, venga!'], robflee: ['¡Eh, eh, tranquilo! ¡Me voy, me voy!'], robwin: ['Así me gusta. Ni una palabra.'] });

A('abel', 'Abel', 'músico callejero',
  { skin: SK.olive, hair: '#3b2a1c', hs: 'long', top: '#6a5a3a', ts: 'shirt', legs: '#3a3026', h: 1.75, w: 0.92, beard: 2, ex: 'guitar' },
  { b: [3, 6, 1], m: [5, 3, 2], fr: 0.2, dr: 0.3, drk: [2, 5, 3], all: 0.7, hot: 0.4 },
  { pat: 1.3, tip: 0.05, voice: 0.95 },
  { g: ['Buenas noches, compañero.'], pre: ['Me pones'], post: ['Te pago en monedas, que es lo que cae en la gorra.'],
    w: ['Sin prisa. La noche es larga.'], ok: ['La próxima canción va por ti.'], x: ['Me vuelvo al paseo.'] });

A('dani', 'Dani', 'camarero, acaba de cerrar',
  { skin: SK.light, hair: '#241a12', top: '#f0efe9', ts: 'shirt', legs: '#17181c', h: 1.76, beard: 1, bags: 1 },
  { b: [5, 3, 2], m: [3, 4, 3], fr: 0.4, dr: 0.7, drk: [3, 2, 5], all: 0.7, hot: 0.5 },
  { pat: 1.4, tip: 0.35, voice: 1 },
  { g: ['Buenas, colega. Acabo de cerrar el bar.'], pre: ['Ponme'], post: ['Yo también curro en hostelería. Ánimo con la noche.'],
    w: ['Tranquilo, sé lo que es estar solo en cocina.'], ok: ['Quédate el cambio. Sé lo que es esto.'], x: ['Otro día, colega. Estoy reventado.'] });

A('manolo', 'Manolo', 'lleva unas cuantas',
  { skin: SK.burn, hair: '#6a6258', top: '#8a8f5a', ts: 'shirt', legs: '#4a4436', h: 1.68, w: 1.2, age: 0.7, beard: 1 },
  { b: [5, 3, 2], m: [3, 3, 4], fr: 0.3, dr: 0.5, drk: [1, 1, 8], all: 0.6, hot: 0.4 },
  { sp: 'drunk', pat: 1.5, tip: 0.1, voice: 0.7 },
  { g: ['¿Tú crees que el kebab da vueltas... o somos nosotros?', 'Shhh. Que no se entere mi mujer.'], pre: ['Yo quiero... yo quería...'], post: ['¿O era una pizza? No. Eso.', 'La vida es un dürüm, chaval.'],
    w: ['Aquí sigo. Como la carne. Dando vueltas.'], ok: ['Eres un filósofo. Como yo.'], x: ['Me voy a ver amanecer.'] });

A('julian', 'Julián', 'duerme en el portal de al lado',
  { skin: SK.tan, hair: '#5a5248', top: '#4a4238', ts: 'jacket', legs: '#33302a', h: 1.7, beard: 2, acc: 'beanie', age: 0.7 },
  {}, { sp: 'beggar', pat: 1.2, tip: 0, voice: 0.8 },
  { g: ['Buenas noches, jefe. No quiero molestar.'], pre: ['Si puede ser, solo'], post: ['No tengo con qué pagarte.'],
    w: ['Si no puede ser, me voy. No pasa nada.'],
    ok: ['Dios te lo pague. Oye: no abras la de atrás sin mirar. He visto algo en el callejón.', 'Gracias, jefe. Y si se va la luz, no te quedes quieto.'],
    x: ['No pasa nada. Buenas noches.'] });

A('aitana', 'Aitana', 'lo está grabando todo',
  { skin: SK.tan, hair: '#1d1612', hs: 'long', top: '#e7d9c8', ts: 'tee', legs: '#5a7bb0', h: 1.67, w: 0.9, fem: 1, ex: 'phone' },
  { b: [4, 3, 3], m: [6, 2, 2], fr: 0.5, dr: 0.6, drk: [5, 5, 0], all: 0.5, hot: 0.3 },
  { sp: 'influencer', pat: 0.9, tip: 0.05, voice: 1.5 },
  { g: ['Holaaa, chicos. Estamos en el kebab más cutre de Benidorm.', '¿Puedo grabar? Estoy grabando.'], pre: ['A ver, quiero'], post: ['Y que quede bonito, que lo subo.'],
    w: ['Se me va el directo, tío.'], ok: ['Chicos, un diez. Etiqueto el sitio.'], bad: ['Chicos... no vengáis. Un dos.'], x: ['Corto el directo. Qué vergüenza.'] });

A('erik', 'Erik', 'turista perdido',
  { skin: SK.burn, hair: '#e2cf8f', top: '#3d7a4a', ts: 'tee', legs: '#b8ae96', ls: 'short', h: 1.88, ex: 'backpack', burn: 1 },
  { b: [4, 4, 2], m: [5, 3, 2], fr: 0.4, dr: 0.7, drk: [3, 5, 2], all: 0.5, hot: 0.1 },
  { pat: 1.3, tip: 0.2, voice: 1.1 },
  { g: ['Perdón. ¿Hotel Poseidón? Estoy perdido.', 'Hello. Mi hotel... no lo encuentro.'], pre: ['También,'], post: ['¿La playa de Poniente es por la izquierda?'],
    w: ['Yo espero. No sé dónde ir igualmente.'], ok: ['Tack. Gracias. Buen kebab.'], x: ['Busco otro sitio. Gracias.'] });

A('ramiro', 'Don Ramiro', 'el de todas las noches',
  { skin: SK.tan, hair: '#8a8a88', top: '#4a3f33', ts: 'jacket', legs: '#3a3a3a', h: 1.69, beard: 3, age: 0.9 },
  { fix: [{ k: 'kb', b: 1, m: 1, v: 4, s: 2 }] },
  { pat: 1.2, tip: 0.2, voice: 0.7, hrs: [3.6, 5.2] },
  { g: ['Las tres y cuarto. Como siempre.', 'Buenas. Lo mío.'], pre: ['Lo de todas las noches:'], post: ['Treinta años viniendo. Treinta.'],
    w: ['El de antes no me hacía esperar.'], ok: ['Así. Como lo hacía el de antes... antes de que dejara de venir.'], x: ['Treinta años. Y hoy me voy sin cenar.'] });

A('vanesa', 'Vanesa', 'crupier del casino',
  { skin: SK.light, hair: '#17130f', hs: 'bun', top: '#f0efe9', ts: 'vestb', legs: '#17181c', h: 1.7, w: 0.93, fem: 1 },
  { b: [3, 5, 2], m: [4, 4, 2], fr: 0.2, dr: 0.6, drk: [4, 5, 1], all: 0.4, hot: 0.3 },
  { pat: 1, tip: 0.2, voice: 1.25, hrs: [3, 7] },
  { g: ['Buenas. Salgo ahora del casino.'], pre: ['Ponme'], post: ['Hoy la banca ha ganado. Como siempre.'],
    w: ['Venga, que llevo ocho horas de pie.'], ok: ['Todo al dürüm. Gracias.'], x: ['No va más. Me retiro.'] });

A('chema', 'Chema', 'recogida de basuras',
  { skin: SK.tan, hair: '#2a2018', top: '#d8d21f', ts: 'vest', legs: '#2f3a2a', h: 1.74, w: 1.1, acc: 'cap', beard: 1 },
  { b: [6, 2, 2], m: [3, 4, 3], fr: 0.4, dr: 0.6, drk: [6, 4, 0], all: 0.7, hot: 0.5 },
  { pat: 0.9, tip: 0.1, voice: 0.9 },
  { g: ['Buenas. Aparco el camión un momento.'], pre: ['Ponme'], post: ['Por cierto: vuestro contenedor de atrás está arañado por dentro.', 'Rapidito, que el compañero espera.'],
    w: ['Que el camión está en marcha.'], ok: ['Gracias, máquina. Mañana os recojo lo primero.'], x: ['Me pita el compañero. Otro día.'] });

A('oscar', 'Óscar', 'técnico de ambulancia',
  { skin: SK.olive, hair: '#2a2018', top: '#e8701a', ts: 'vest', legs: '#1f2a44', h: 1.78, bags: 1 },
  { b: [6, 3, 1], m: [5, 3, 2], fr: 0.2, dr: 0.7, drk: [5, 5, 0], all: 0.5, hot: 0.3 },
  { pat: 0.75, tip: 0.15, voice: 1 },
  { g: ['Buenas. Tengo cinco minutos entre aviso y aviso.'], pre: ['Ponme'], post: ['Y si suena la radio, salgo corriendo.'],
    w: ['Venga, que salta un aviso.'], ok: ['Perfecto. Cuidaos esta noche.'], x: ['Aviso. Me tengo que ir.'] });

A('fermin', 'Fermín', 'pasea al perro a las cuatro',
  { skin: SK.light, hair: '#7a6a58', top: '#5a6a7a', ts: 'hood', legs: '#3a3a3a', h: 1.73, age: 0.6, gl: 1 },
  { b: [4, 5, 1], m: [5, 3, 2], fr: 0.2, dr: 0.3, drk: [3, 6, 1], all: 0.6, hot: 0.2 },
  { pat: 1.2, tip: 0.1, voice: 0.9, hrs: [2.5, 6.5] },
  { g: ['Buenas. El perro se queda fuera. No quiere entrar. Nunca le había pasado.'], pre: ['Ponme'], post: ['Lleva toda la noche ladrándole a vuestra puerta de atrás.'],
    w: ['Venga, que el perro se pone nervioso.'], ok: ['Gracias. Venga, Toby, vámonos de aquí.'], x: ['El perro tira de mí. Me voy.'] });

A('yolanda', 'Yolanda', 'busca a su hijo',
  { skin: SK.light, hair: '#3b2a1c', hs: 'long', top: '#7a2f3a', ts: 'jacket', legs: '#2b3040', h: 1.64, fem: 1, age: 0.5, bags: 1 },
  { b: [3, 6, 1], m: [6, 2, 2], fr: 0.1, dr: 0.4, drk: [3, 7, 0], all: 0.5, hot: 0.2 },
  { pat: 0.9, tip: 0.1, voice: 1.3, hrs: [3, 7] },
  { g: ['¿Has visto a un chaval con la camisa abierta? Es mi hijo.'], pre: ['Ya que estoy, ponme'], post: ['Como lo pille, se le acaba Benidorm.'],
    w: ['Date prisa, que sigo buscándolo.'], ok: ['Gracias. Si lo ves, dile que su madre lo busca.'], x: ['No puedo esperar. Sigo buscando.'] });

const GEN = {
  w: ['¿Falta mucho?', 'Oye, que llevo un rato.'], ok: ['Gracias. Buenas noches.'], bad: ['Esto no está muy allá...', 'Está regular, la verdad.'],
  x: ['Paso. Me voy a otro sitio.'], no: ['Eso no es lo que he pedido.'], raw: ['¡Esto está crudo!', 'Oye, la carne está sin hacer.'],
  burnt: ['Está carbonizado.'], unw: ['¿Y me lo das así, sin envolver?'], flee: ['¡¡Tiros!!', '¡Ay, madre!', '¡Corre!'], dark: ['¿Se ha ido la luz?', 'Eh, que no se ve nada.'],
  nofr: ['¿Y las patatas de la caja?'], hm: ['Hoy sabe distinto. Está buenísimo.', '¿Has cambiado de proveedor? Mejor que nunca.'], gun: ['...'], g: ['Buenas noches.'], pre: ['Ponme'], post: [''],
};
const ANOM = {
  g: ['...', 'Buenas. Noches.'], o: ['Carne. Cruda. Sin pan.', 'Dame la carne. Sin hacer.', 'Tengo hambre. Cruda.'],
  w: ['Hueles a caliente.', 'No me mires los ojos.', 'Llevas mucho rato despierto.', 'El de antes tampoco me sirvió.'], no: ['No. Cruda.'], atk: ['HAMBRE.'],
};
const MSG = {
  karma: 'Julián se va cenado. El barrio se entera. (+reputación)', sinpa: 'Se ha ido sin pagar.', robbed: 'Te han vaciado la caja.',
  robgone: 'El atracador sale corriendo.', deliv: 'Reparto recibido: verdura y cartuchos.', nodeliv: 'El repartidor se ha cansado de llamar.',
  blackout: 'Se ha ido la luz. El cuadro está en el almacén.', power: 'Vuelve la luz.', binfull: 'Verdura cortada y a la cubeta.',
  gone: 'Lo de la puerta deja de arañar.', lost: 'Un cliente se ha ido sin cenar.', ko: 'Te has desmayado. Te despiertas en la cocina.',
  last: 'Son las seis. Persiana abajo cuando salga el último.', killed: 'Eso no era un cliente.', nowit: 'Nadie lo ha visto. Todavía.',
};
const RULES = [
  'Los clientes de verdad parpadean. Si no parpadea y tiene los ojos negros, no es un cliente.',
  'Si pide la carne cruda, no se la des. Escopeta.',
  'Nunca dispares a un cliente de verdad. Nunca.',
  'A un atracador basta con apuntarle. Al que se va sin pagar, también.',
  'Si se va la luz: el cuadro está en el almacén. No te quedes quieto a oscuras.',
  'Puerta de atrás: usa SIEMPRE la mirilla antes de abrir.',
  'A las 3:33 viene alguien. Siempre viene alguien.',
  'Lo que pase cuando no mira nadie, se queda en la cocina. La mesa del almacén sirve para algo más que verdura.',
];

/* ---------- utilidades ---------- */
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
function pickW(w, r) { let s = 0; for (const x of w) s += x; let v = r() * s; for (let i = 0; i < w.length; i++) { v -= w[i]; if (v <= 0) return i; } return w.length - 1; }
function angLerp(a, b, t) { const d = ((b - a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; return a + d * t; }
const r2 = v => Math.round(v * 100) / 100;
function clockStr(t) { const m = Math.floor(Math.min(t, NIGHT_LEN) / HOUR_LEN * 60), tot = 23 * 60 + m; const h = Math.floor(tot / 60) % 24, mm = tot % 60; return (h < 10 ? '0' : '') + h + ':' + (mm < 10 ? '0' : '') + mm; }
const bits = v => (v & 1) + (v >> 1 & 1) + (v >> 2 & 1);

/* ---------- pedidos (deterministas a partir de la semilla) ---------- */
function genOrder(ai, seed) {
  const Ar = ARCH[ai], o = Ar.o, r = mulberry32(seed ^ 0x9e3779b9), items = [];
  if (Ar.sp === 'robber') return items;
  if (Ar.sp === 'beggar') return [{ k: 'dr', t: 1 }];
  if (o.fix) return o.fix.map(x => Object.assign({}, x));
  const nk = r() < o.n2 ? 2 : 1;
  for (let i = 0; i < nk; i++) {
    const b = pickW(o.b, r), m = pickW(o.m, r);
    let v; const rv = r();
    if (rv < o.all) v = 7; else if (rv < o.all + 0.1) v = 0; else { v = 7 & ~(1 << Math.floor(r() * 3)); if (r() < 0.25) v &= ~(1 << Math.floor(r() * 3)); }
    if (Ar.sp === 'picky') { v &= ~4; if (!v) v = 3; }
    const rs = r(); let s = rs < 0.12 ? 0 : rs < 0.6 ? 1 : 3;
    if (r() < o.hot) s |= 2; else s &= ~2;
    items.push({ k: 'kb', b, m, v, s });
  }
  if (r() < o.fr && !items.some(x => x.b === 2)) items.push({ k: 'fr' });
  if (r() < o.dr) items.push({ k: 'dr', t: pickW(o.drk, r) });
  return items;
}
function orderPrice(ord) { let s = 0; for (const it of ord) s += it.k === 'fr' ? FRIES_PRICE : it.k === 'dr' ? DRINKS[it.t].price : BASES[it.b].price; return s; }

/* ================= IDIOMAS: español · english · română ================= */
let LANG = 'es';
const LANGS = ['es', 'en', 'ro'];

/* ---------- vocabulario de cocina ---------- */
const LX = {
  es: {
    base: ['dürüm', 'pita', 'caja'], bart: ['un', 'una', 'una'], meat: ['pollo', 'ternera', 'mixto'], veg: ['lechuga', 'tomate', 'cebolla'], sauce: ['salsa blanca', 'picante'], drink: ['cola', 'agua', 'cerveza'],
    vAll: 'con todo', vNone: 'sin verdura', vNo: 'sin {0}', vOnly: 'solo con {0}', sPh: ['sin salsa', 'salsa blanca', 'picante', 'las dos salsas'],
    frPh: 'unas patatas', drPh: ['una cola', 'un agua', 'una cerveza'], and: ' y ', fries: 'patatas', wfries: 'con patatas',
    nm: { gun: 'la escopeta', fr: 'las patatas', dr: ['la cola', 'el agua', 'la cerveza'], vg: ['la lechuga', 'los tomates', 'las cebollas'], kb: ['el dürüm', 'la pita', 'la caja'], none: 'nada', body: 'el cuerpo', cone: 'la carne' },
    h: { nomeat: 'sin carne', raw: ' (cruda)', closed: 'cerrada', wrapped: 'en aluminio', bad: ' (malas)', uncut: ' sin cortar', gun: 'ESCOPETA', body: 'CUERPO', cone: 'CARNE PARA EL ASADOR' },
    done: ['CRUDA', 'poco hecha', 'DORADA', 'pasada', 'QUEMADA'], fs: ['crudas', 'doradas', 'pasadas', 'quemadas'],
  },
  en: {
    base: ['dürüm', 'pita', 'kebab box'], bart: ['a', 'a', 'a'], meat: ['chicken', 'beef', 'mixed'], veg: ['lettuce', 'tomato', 'onion'], sauce: ['white sauce', 'hot sauce'], drink: ['cola', 'water', 'beer'],
    vAll: 'with everything', vNone: 'no salad', vNo: 'no {0}', vOnly: 'only {0}', sPh: ['no sauce', 'white sauce', 'hot sauce', 'both sauces'],
    frPh: 'some fries', drPh: ['a cola', 'a water', 'a beer'], and: ' and ', fries: 'fries', wfries: 'with fries',
    nm: { gun: 'the shotgun', fr: 'the fries', dr: ['the cola', 'the water', 'the beer'], vg: ['the lettuce', 'the tomatoes', 'the onions'], kb: ['the dürüm', 'the pita', 'the box'], none: 'nothing', body: 'the body', cone: 'the meat' },
    h: { nomeat: 'no meat', raw: ' (raw)', closed: 'closed', wrapped: 'wrapped', bad: ' (bad)', uncut: ', uncut', gun: 'SHOTGUN', body: 'BODY', cone: 'MEAT FOR THE SPIT' },
    done: ['RAW', 'underdone', 'GOLDEN', 'overdone', 'BURNT'], fs: ['raw', 'golden', 'overdone', 'burnt'],
  },
  ro: {
    base: ['dürüm', 'pita', 'cutie'], bart: ['un', 'o', 'o'], meat: ['pui', 'vită', 'mixt'], veg: ['salată', 'roșii', 'ceapă'], sauce: ['sos alb', 'sos iute'], drink: ['cola', 'apă', 'bere'],
    vAll: 'cu de toate', vNone: 'fără legume', vNo: 'fără {0}', vOnly: 'doar cu {0}', sPh: ['fără sos', 'sos alb', 'sos iute', 'ambele sosuri'],
    frPh: 'niște cartofi', drPh: ['o cola', 'o apă', 'o bere'], and: ' și ', fries: 'cartofi', wfries: 'cu cartofi',
    nm: { gun: 'pușca', fr: 'cartofii', dr: ['cola', 'apa', 'berea'], vg: ['salata', 'roșiile', 'ceapa'], kb: ['dürümul', 'pita', 'cutia'], none: 'nimic', body: 'trupul', cone: 'carnea' },
    h: { nomeat: 'fără carne', raw: ' (crudă)', closed: 'închisă', wrapped: 'în folie', bad: ' (proști)', uncut: ' (de tăiat)', gun: 'PUȘCĂ', body: 'TRUP', cone: 'CARNE PENTRU ROTISOR' },
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
    over1_t: 'Había testigos', over1_p: 'Has disparado a un cliente con gente delante. Parpadeaba. La policía llega antes de que se enfríe la plancha, y el Kebab Poniente no vuelve a abrir.',
    over2_t: 'Han visto el cuerpo', over2_p: 'Un cliente entra, ve lo que hay en el suelo y sale gritando. La policía tarda cuatro minutos. El Kebab Poniente no vuelve a abrir.',
    u_drag: 'Arrastrar el cuerpo', u_table_put: 'Subir el cuerpo a la mesa', u_table_cut: 'Despiezar ({0}/8)', u_table_idle: 'Mesa de despiece', u_table_busy: 'La mesa está ocupada', u_cone_mount: 'Montar la carne en el asador de {0}', u_drop_body: 'Soltar el cuerpo',
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
    over1_t: 'There were witnesses', over1_p: 'You shot a customer in front of people. They blinked. The police arrive before the griddle cools, and Kebab Poniente never opens again.',
    over2_t: 'Someone saw the body', over2_p: 'A customer walks in, sees what is on the floor and runs out screaming. The police take four minutes. Kebab Poniente never opens again.',
    u_drag: 'Drag the body', u_table_put: 'Lift the body onto the table', u_table_cut: 'Butcher it ({0}/8)', u_table_idle: 'Butchering table', u_table_busy: 'The table is taken', u_cone_mount: 'Mount the meat on the {0} spit', u_drop_body: 'Drop the body',
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
    over1_t: 'Au fost martori', over1_p: 'Ai împușcat un client de față cu lumea. Clipea. Poliția ajunge înainte să se răcească plita, iar Kebab Poniente nu se mai deschide niciodată.',
    over2_t: 'Cineva a văzut trupul', over2_p: 'Un client intră, vede ce e pe jos și iese țipând. Poliția ajunge în patru minute. Kebab Poniente nu se mai deschide niciodată.',
    u_drag: 'Târăște trupul', u_table_put: 'Urcă trupul pe masă', u_table_cut: 'Tranșează ({0}/8)', u_table_idle: 'Masă de tranșat', u_table_busy: 'Masa e ocupată', u_cone_mount: 'Montează carnea pe rotisorul de {0}', u_drop_body: 'Lasă trupul jos',
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
  en: ["Real customers blink. If it doesn't blink and its eyes are black, it is not a customer.", "If it asks for the meat raw, don't give it. Shotgun.", 'Never shoot a real customer. Never.', 'Aiming is enough for a robber. Same for the one who leaves without paying.', "If the power goes out: the fuse box is in the storeroom. Don't stand still in the dark.", 'Back door: ALWAYS use the peephole before opening.', 'At 3:33 someone comes. Someone always comes.', 'What happens when nobody is watching stays in the kitchen. The table in the storeroom is good for more than vegetables.'],
  ro: ['Clienții adevărați clipesc. Dacă nu clipește și are ochii negri, nu e client.', 'Dacă cere carnea crudă, nu i-o da. Pușca.', 'Nu trage niciodată într-un client adevărat. Niciodată.', 'Pe un hoț e de ajuns să-l ții în cătare. La fel și pe cel care pleacă fără să plătească.', 'Dacă se ia curentul: tabloul e în magazie. Nu sta pe loc pe întuneric.', 'Ușa din spate: uită-te ÎNTOTDEAUNA pe vizor înainte să deschizi.', 'La 3:33 vine cineva. Întotdeauna vine cineva.', 'Ce se întâmplă când nu se uită nimeni rămâne în bucătărie. Masa din magazie e bună și la altceva decât legume.'],
};
const MSGX = {
  es: MSG,
  en: { karma: 'Julián leaves fed. The neighbourhood hears about it. (+reputation)', sinpa: 'He left without paying.', robbed: 'They emptied the till.', robgone: 'The robber runs off.', deliv: 'Delivery received: vegetables and shells.', nodeliv: 'The delivery man got tired of knocking.', blackout: 'The power is out. The fuse box is in the storeroom.', power: 'The lights are back.', binfull: 'Vegetables chopped and in the tub.', gone: 'The thing at the door stops scratching.', lost: 'A customer left without dinner.', ko: 'You passed out. You wake up in the kitchen.', last: "It's six. Shutters down when the last one leaves.", killed: 'That was not a customer.', nowit: 'Nobody saw it. Yet.' },
  ro: { karma: 'Julián pleacă sătul. Află tot cartierul. (+reputație)', sinpa: 'A plecat fără să plătească.', robbed: 'Ți-au golit casa de marcat.', robgone: 'Hoțul o ia la fugă.', deliv: 'Livrare primită: legume și cartușe.', nodeliv: 'Livratorul s-a săturat să bată la ușă.', blackout: 'S-a luat curentul. Tabloul e în magazie.', power: 'A revenit curentul.', binfull: 'Legume tăiate și puse în tavă.', gone: 'Ce era la ușă nu mai zgârie.', lost: 'Un client a plecat nemâncat.', ko: 'Ai leșinat. Te trezești în bucătărie.', last: 'E șase. Tragi oblonul când pleacă ultimul.', killed: 'Ăla nu era client.', nowit: 'Nu a văzut nimeni. Încă.' },
};
const GENX = {
  es: GEN,
  en: { w: ['Is it going to be long?', "Hey, I've been here a while."], ok: ['Thanks. Good night.'], bad: ["This isn't great...", "It's so-so, honestly."], x: ["Forget it. I'm going somewhere else."], no: ["That's not what I ordered."], raw: ['This is raw!', "Hey, the meat's not cooked."], burnt: ["It's charred."], unw: ['And you hand it to me like that, unwrapped?'], flee: ['Gunshots!!', 'Oh my God!', 'Run!'], dark: ['Did the lights go out?', "Hey, I can't see a thing."], nofr: ['Where are the fries in the box?'], hm: ["Tastes different today. It's really good.", 'New supplier? Best one yet.'], gun: ['...'], g: ['Good evening.'], pre: ['Give me'], post: [''] },
  ro: { w: ['Mai durează mult?', 'Auzi, stau de ceva vreme.'], ok: ['Mersi. Noapte bună.'], bad: ['Nu-i cine știe ce...', 'E așa și așa, sincer.'], x: ['Las-o. Mă duc în altă parte.'], no: ['Nu asta am cerut.'], raw: ['E crud!', 'Auzi, carnea nu-i făcută.'], burnt: ['E carbonizat.'], unw: ['Și mi-l dai așa, neîmpachetat?'], flee: ['Împușcături!!', 'Vai de mine!', 'Fugi!'], dark: ['S-a luat curentul?', 'Hei, nu se vede nimic.'], nofr: ['Și cartofii din cutie?'], hm: ['Azi are alt gust. E foarte bun.', 'Ai schimbat furnizorul? Mai bun ca oricând.'], gun: ['...'], g: ['Bună seara.'], pre: ['Dă-mi'], post: [''] },
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
  if (h.k === 'body') return N.body; if (h.k === 'cone') return N.cone;
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
  if (h.k === 'body') return Hh.body; if (h.k === 'cone') return Hh.cone;
  return '';
}
function doneWord(d) { return LX[LANG].done[d < 0.35 ? 0 : d < 0.55 ? 1 : d <= 1.15 ? 2 : d <= 1.4 ? 3 : 4]; }
function pickLang() {
  let l = null; try { l = localStorage.getItem('kp-lang'); } catch (e) { }
  if (LANGS.indexOf(l) < 0) { const n = (navigator.language || 'es').slice(0, 2).toLowerCase(); l = n === 'ro' ? 'ro' : n === 'es' || n === 'ca' || n === 'gl' || n === 'eu' ? 'es' : 'en'; }
  return l;
}

/* ================= AUDIO (todo sintetizado) ================= */
const AU = {
  ctx: null, out: null, nb: null, L: {}, lis: { x: 0, z: 0, yaw: 0 }, beat: 0, kick: 0, danger: 0,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    try {
      const c = this.ctx = new C();
      const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6;
      this.out = c.createGain(); this.out.gain.value = 0.9; this.out.connect(comp); comp.connect(c.destination);
      const n = c.sampleRate * 2, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      this.nb = b;
      // zumbido de fluorescente
      this.L.hum = this.loopOsc('sawtooth', 100, 0.012, 700);
      this.L.hum2 = this.loopOsc('sine', 50, 0.03, 200);
      // crepitar de la carne y freidora
      this.L.siz = this.loopNoise('bandpass', 5200, 0.8, 0);
      this.L.fry = this.loopNoise('bandpass', 2600, 0.6, 0);
      // viento de la calle
      this.L.wind = this.loopNoise('lowpass', 260, 0.4, 0.03);
    } catch (e) { this.ctx = null; }
  },
  loopOsc(type, f, vol, lp) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(), fl = c.createBiquadFilter();
    o.type = type; o.frequency.value = f; fl.type = 'lowpass'; fl.frequency.value = lp; g.gain.value = vol;
    o.connect(fl); fl.connect(g); g.connect(this.out); o.start(); return g;
  },
  loopNoise(ft, f, q, vol) {
    const c = this.ctx, s = c.createBufferSource(), g = c.createGain(), fl = c.createBiquadFilter();
    s.buffer = this.nb; s.loop = true; fl.type = ft; fl.frequency.value = f; fl.Q.value = q; g.gain.value = vol;
    s.connect(fl); fl.connect(g); g.connect(this.out); s.start(); return g;
  },
  pos(x, z) {
    if (x === undefined || x === null) return { v: 1, p: 0 };
    const dx = x - this.lis.x, dz = z - this.lis.z, d = Math.hypot(dx, dz);
    const v = 1 / (1 + (d / 4.5) * (d / 4.5));
    const rx = Math.cos(this.lis.yaw), rz = -Math.sin(this.lis.yaw);
    const p = d < 0.3 ? 0 : clamp((dx * rx + dz * rz) / d, -1, 1) * 0.8;
    return { v, p };
  },
  dst(p) {
    const c = this.ctx; if (!c.createStereoPanner) return this.out;
    const pn = c.createStereoPanner(); pn.pan.value = p; pn.connect(this.out); return pn;
  },
  tone(f, dur, type, vol, when, f2, dest) {
    const c = this.ctx, t = c.currentTime + (when || 0), o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(1, f2), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.out); o.start(t); o.stop(t + dur + 0.05);
  },
  nz(dur, ft, f, q, vol, when, f2, dest) {
    const c = this.ctx, t = c.currentTime + (when || 0), s = c.createBufferSource(), g = c.createGain(), fl = c.createBiquadFilter();
    s.buffer = this.nb; s.loop = true; fl.type = ft; fl.frequency.setValueAtTime(f, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur); fl.Q.value = q;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(dest || this.out); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  },
  play(name, x, z, a) {
    if (!this.ctx) return;
    const P = this.pos(x, z), v = P.v, d = this.dst(P.p);
    switch (name) {
      case 'bell': this.tone(1320, 0.5, 'sine', 0.12 * v, 0, 0, d); this.tone(990, 0.8, 'sine', 0.12 * v, 0.22, 0, d); break;
      case 'blip': this.tone((170 + Math.random() * 90) * (a || 1), 0.07, 'triangle', 0.09 * v, 0, 0, d); break;
      case 'cut': this.nz(0.13, 'bandpass', 3400, 1.2, 0.3 * v, 0, 1500, d); this.nz(0.3, 'highpass', 6000, 0.5, 0.08 * v, 0.03, 0, d); break;
      case 'chop': this.nz(0.05, 'lowpass', 1400, 0.7, 0.35 * v, 0, 0, d); this.tone(150, 0.08, 'sine', 0.25 * v, 0, 70, d); break;
      case 'cash': this.tone(1568, 0.09, 'square', 0.05 * v, 0, 0, d); this.tone(2093, 0.3, 'square', 0.05 * v, 0.08, 0, d); this.nz(0.05, 'highpass', 5000, 0.5, 0.1 * v, 0, 0, d); break;
      case 'shot': this.nz(0.7, 'lowpass', 5000, 0.4, 1.1 * Math.max(v, 0.25), 0, 180, d); this.tone(95, 0.35, 'sine', 0.9 * Math.max(v, 0.25), 0, 30, d); this.nz(1.4, 'bandpass', 700, 0.5, 0.18, 0.12, 250, d); break;
      case 'click': this.nz(0.02, 'highpass', 3000, 0.5, 0.25 * v, 0, 0, d); break;
      case 'reload': this.nz(0.03, 'highpass', 2500, 0.5, 0.3, 0); this.nz(0.12, 'bandpass', 1200, 2, 0.2, 0.25, 500); this.nz(0.03, 'highpass', 2500, 0.5, 0.3, 0.6); this.tone(180, 0.06, 'square', 0.08, 0.95); break;
      case 'knock': for (let i = 0; i < 3; i++) { this.tone(95, 0.12, 'sine', 0.6 * v, i * 0.3, 55, d); this.nz(0.05, 'lowpass', 500, 0.7, 0.4 * v, i * 0.3, 0, d); } break;
      case 'knockf': this.tone(60, 0.5, 'sine', 0.8 * v, 0, 35, d); this.nz(1.1, 'bandpass', 1900, 3, 0.16 * v, 0.5, 900, d); break;
      case 'pwr0': this.tone(220, 0.8, 'sawtooth', 0.15, 0, 25); this.nz(0.1, 'lowpass', 900, 0.7, 0.4, 0); break;
      case 'pwr1': this.nz(0.04, 'highpass', 2000, 0.6, 0.4, 0); this.tone(50, 0.5, 'sawtooth', 0.12, 0.03, 110); break;
      case 'scream': this.tone(420, 1.1, 'sawtooth', 0.22 * Math.max(v, 0.4), 0, 160, d); this.tone(633, 1.0, 'square', 0.1 * Math.max(v, 0.4), 0.02, 210, d); this.nz(1.2, 'bandpass', 1800, 1.5, 0.3 * Math.max(v, 0.4), 0, 600, d); break;
      case 'hurt': this.tone(110, 0.3, 'sawtooth', 0.4, 0, 40); this.nz(0.25, 'lowpass', 800, 0.7, 0.5, 0); break;
      case 'ok': this.tone(660, 0.1, 'triangle', 0.1, 0); this.tone(880, 0.2, 'triangle', 0.1, 0.09); break;
      case 'bad': this.tone(150, 0.25, 'square', 0.07, 0, 110); break;
      case 'step': this.nz(0.06, 'lowpass', 500 + Math.random() * 200, 0.7, 0.07 * v, 0, 0, d); break;
      case 'whisper': this.nz(1.3, 'bandpass', 1200, 4, 0.12 * Math.max(v, 0.3), 0, 2600, d); this.nz(0.9, 'bandpass', 2400, 5, 0.08 * Math.max(v, 0.3), 0.4, 900, d); break;
      case 'flick': for (let i = 0; i < 4; i++) this.tone(100, 0.04, 'sawtooth', 0.08, i * 0.09 + Math.random() * 0.03); break;
      case 'fryin': this.nz(0.9, 'bandpass', 3000, 0.6, 0.35 * v, 0, 0, d); break;
      case 'foil': for (let i = 0; i < 5; i++) this.nz(0.04, 'highpass', 5000, 0.5, 0.14, i * 0.05); break;
      case 'squirt': this.nz(0.2, 'bandpass', 900, 2, 0.2, 0, 400); break;
      case 'pop': this.tone(300, 0.06, 'sine', 0.2, 0, 900); break;
      case 'grab': this.nz(0.05, 'lowpass', 900, 0.7, 0.14, 0); break;
      case 'die': this.tone(140, 0.5, 'sine', 0.5 * v, 0, 40, d); this.nz(0.3, 'lowpass', 400, 0.7, 0.5 * v, 0.1, 0, d); break;
      case 'door': this.nz(0.9, 'bandpass', 500, 6, 0.3 * v, 0, 220, d); break;
    }
  },
  frame(dt, env) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime, set = (g, v) => g.gain.setTargetAtTime(v, t, 0.08);
    set(this.L.hum, env.power ? 0.012 : 0); set(this.L.hum2, env.power ? 0.03 : 0.004);
    set(this.L.siz, 0.05 * env.siz); set(this.L.fry, 0.09 * env.fry); set(this.L.wind, 0.02 + 0.03 * env.out);
    // bombo lejano de alguna discoteca
    this.kick -= dt;
    if (this.kick <= 0) { this.kick += 0.48; this.tone(62, 0.16, 'sine', 0.035 * (env.club || 0), 0, 38); }
    // latido
    this.danger = lerp(this.danger, env.danger, 0.05);
    if (this.danger > 0.05) { this.beat -= dt; if (this.beat <= 0) { this.beat = lerp(1.0, 0.36, this.danger); this.tone(58, 0.14, 'sine', 0.5 * this.danger, 0, 36); this.tone(52, 0.16, 'sine', 0.35 * this.danger, 0.13, 32); } }
  },
};

/* ================= ESCENA (three.js r128) ================= */
const PI = Math.PI;
let renderer, scene, camera, raycaster;
const colliders = [], rayTargets = [], D = {}, TX = {}, LG = {}, M = {};
const IH = 360;
const SLOTS = [[-2.4, 1.85], [-0.8, 1.85], [0.8, 1.85]], QUEUE = [[2.2, 2.9], [1.0, 3.8], [2.6, 4.2]];
const DOOR_IN = [[-2.6, 6.3], [-2.6, 4.4]];
const SEG = 10, BANDS = 6, NCELL = SEG * BANDS, SPY0 = 1.02, BH = 0.13, SPX = [-3.0, -1.8], SPZ = -3.62;
const SV = [0, 1].map(() => ({ lv: new Uint8Array(NCELL).fill(7), dn: new Float32Array(NCELL).fill(0.75), pend: new Float32Array(NCELL), dirty: true, cs: '', ds: '' }));

function loadTextures() {
  return Promise.all(Object.keys(TEXDATA).map(k => new Promise(res => {
    const im = new Image();
    im.onload = () => { const t = new THREE.Texture(im); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true; TX[k] = t; res(); };
    im.onerror = () => { TX[k] = null; res(); };
    im.src = TEXDATA[k];
  })));
}
function ctex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
const _mc = {};
function lam(tex, color, opt) {
  const key = tex + '|' + color + '|' + (opt ? JSON.stringify(opt) : '');
  if (_mc[key]) return _mc[key];
  const m = new THREE.MeshLambertMaterial(Object.assign({ color: color == null ? 0xffffff : color }, opt || {}));
  if (tex && TX[tex]) m.map = TX[tex];
  return _mc[key] = m;
}
function bas(color, opt) { return new THREE.MeshBasicMaterial(Object.assign({ color }, opt || {})); }
function uvBox(g, w, h, d, tile) {
  const uv = g.attributes.uv;
  for (let f = 0; f < 6; f++) { const su = f < 2 ? d : w, sv = (f === 2 || f === 3) ? d : h; for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * su / tile, uv.getY(k) * sv / tile); } }
}
function box(w, h, d, m, x, y, z, o) {
  o = o || {};
  const g = new THREE.BoxGeometry(w, h, d); uvBox(g, w, h, d, o.tile || 1.2);
  const me = new THREE.Mesh(g, m); me.position.set(x, y, z);
  if (o.ry) me.rotation.y = o.ry; if (o.rx) me.rotation.x = o.rx; if (o.rz) me.rotation.z = o.rz;
  (o.parent || scene).add(me);
  if (o.col) colliders.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });
  if (o.occ) rayTargets.push(me);
  return me;
}
function cyl(rt, rb, h, seg, m, x, y, z, o) {
  o = o || {};
  const me = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg, 1, !!o.open), m); me.position.set(x, y, z);
  if (o.rx) me.rotation.x = o.rx; if (o.rz) me.rotation.z = o.rz; if (o.ry) me.rotation.y = o.ry;
  (o.parent || scene).add(me); return me;
}
function plane(w, h, m, x, y, z, rx, ry, tile, occ, parent) {
  const sx = Math.max(1, Math.round(w / 0.55)), sy = Math.max(1, Math.round(h / 0.55));
  const g = new THREE.PlaneGeometry(w, h, sx, sy);
  if (tile) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / tile, uv.getY(i) * h / tile); }
  const me = new THREE.Mesh(g, m); me.position.set(x, y, z); me.rotation.set(rx || 0, ry || 0, 0);
  (parent || scene).add(me); if (occ) rayTargets.push(me); return me;
}
function wseg(axis, fixed, a0, a1, y0, y1, ry, kind) {
  const mid = (a0 + a1) / 2, len = a1 - a0;
  const put = (p0, p1, m, tile) => { if (p1 - p0 < 0.01) return; plane(len, p1 - p0, m, axis === 'x' ? mid : fixed, (p0 + p1) / 2, axis === 'x' ? fixed : mid, 0, ry, tile, true); };
  if (kind === 'shop') { put(y0, Math.min(y1, 1.35), M.tile, 1.0); put(Math.max(y0, 1.35), y1, M.wall, 1.7); }
  else put(y0, y1, M[kind], 1.6);
}
function decal(tex, x, y, z, rx, ry, w, h, op, color) {
  const m = new THREE.MeshLambertMaterial({ map: TX[tex], transparent: true, opacity: op == null ? 0.85 : op, depthWrite: false, color: color == null ? 0xffffff : color, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const me = new THREE.Mesh(new THREE.PlaneGeometry(w, h, 2, 2), m); me.position.set(x, y, z); me.rotation.set(rx || 0, ry || 0, 0); scene.add(me); return me;
}
function hit(key, x, y, z, w, h, d) {
  const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M.inv); me.position.set(x, y, z); me.visible = false; me.userData.key = key; scene.add(me); rayTargets.push(me); return me;
}

/* ---------- carne del asador ---------- */
function spitRad(b, lv) { const R = 0.19 + 0.07 * (b / (BANDS - 1)); return 0.05 + (R - 0.05) * lv / 7; }
const MC = [[[0.95, 0.72, 0.66], [0.88, 0.6, 0.27], [0.6, 0.36, 0.14], [0.12, 0.085, 0.07]], [[0.82, 0.36, 0.36], [0.66, 0.38, 0.2], [0.4, 0.22, 0.12], [0.1, 0.07, 0.06]]];
function meatColor(i, d, o) {
  const P = MC[i]; let a, b, t;
  if (d < 0.55) { a = P[0]; b = P[1]; t = d / 0.55; } else if (d < 1.15) { a = P[1]; b = P[2]; t = (d - 0.55) / 0.6; } else { a = P[2]; b = P[3]; t = clamp((d - 1.15) / 0.35, 0, 1); }
  o[0] = lerp(a[0], b[0], t); o[1] = lerp(a[1], b[1], t); o[2] = lerp(a[2], b[2], t); return o;
}
function meatHex(i, d) { const c = meatColor(i, d, [0, 0, 0]); return new THREE.Color(c[0], c[1], c[2]); }
function buildSpit(i) {
  const x = SPX[i], grp = new THREE.Group(); grp.position.set(x, 0, SPZ); scene.add(grp);
  const nv = (SEG + 1) * (BANDS + 1) + 2, pos = new Float32Array(nv * 3), col = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), idx = [];
  for (let k = 0; k <= BANDS; k++) for (let j = 0; j <= SEG; j++) { const v = k * (SEG + 1) + j; uv[v * 2] = j / SEG * 2; uv[v * 2 + 1] = k / BANDS * 1.5; }
  for (let k = 0; k < BANDS; k++) for (let j = 0; j < SEG; j++) { const a = k * (SEG + 1) + j, b = a + 1, c = a + SEG + 1, d = c + 1; idx.push(a, b, d, a, d, c); }
  const ct = (SEG + 1) * (BANDS + 1), cb = ct + 1;
  for (let j = 0; j < SEG; j++) { idx.push(BANDS * (SEG + 1) + j, BANDS * (SEG + 1) + j + 1, ct); idx.push(j + 1, j, cb); }
  uv[ct * 2] = 0.5; uv[ct * 2 + 1] = 0.5; uv[cb * 2] = 0.5; uv[cb * 2 + 1] = 0.5;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx);
  const mesh = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: TX.meat, vertexColors: true }));
  mesh.frustumCulled = false; grp.add(mesh);
  // hierro, base y bandeja
  cyl(0.012, 0.012, 1.25, 6, M.steelD, x, 1.5, SPZ);
  cyl(0.09, 0.07, 0.03, 8, M.steelD, x, SPY0 + BANDS * BH + 0.03, SPZ);
  box(0.62, 0.04, 0.62, M.steel, x, 0.93, SPZ + 0.02);
  box(0.62, 0.05, 0.02, M.steel, x, 0.965, SPZ + 0.33);
  const pile = new THREE.Mesh(new THREE.SphereGeometry(0.12, 7, 4, 0, PI * 2, 0, PI / 2), new THREE.MeshLambertMaterial({ map: TX.meat, color: 0xa86a30 }));
  pile.position.set(x, 0.95, SPZ + 0.24); pile.scale.set(1.6, 0.01, 0.6); scene.add(pile);
  // resistencia
  const heat = plane(0.62, 0.92, new THREE.MeshBasicMaterial({ map: D.heatTex, color: 0xffffff }), x, 1.44, -3.93, 0, 0);
  box(0.7, 1.0, 0.05, M.steelD, x, 1.44, -3.965);
  D.spit[i] = { grp, mesh, g, pile, heat };
  hit('sp' + i, x, 1.45, SPZ, 0.52, 0.86, 0.4);
  hit('tr' + i, x, 0.99, SPZ + 0.25, 0.6, 0.16, 0.22);
}
const _c3 = [0, 0, 0];
function updateSpitMesh(i) {
  const S = SV[i], sp = D.spit[i], pos = sp.g.attributes.position.array, col = sp.g.attributes.color.array;
  for (let k = 0; k <= BANDS; k++) for (let j = 0; j <= SEG; j++) {
    let r = 0, dd = 0, n = 0;
    for (let kb = k - 1; kb <= k; kb++) { if (kb < 0 || kb >= BANDS) continue; for (let js = j - 1; js <= j; js++) { const c = kb * SEG + ((js + SEG) % SEG); r += spitRad(kb, S.lv[c]); dd += S.dn[c]; n++; } }
    r /= n; dd /= n;
    const v = k * (SEG + 1) + j, a = j * 2 * PI / SEG;
    pos[v * 3] = Math.sin(a) * r; pos[v * 3 + 1] = SPY0 + k * BH; pos[v * 3 + 2] = Math.cos(a) * r;
    meatColor(i, dd, _c3); col[v * 3] = _c3[0]; col[v * 3 + 1] = _c3[1]; col[v * 3 + 2] = _c3[2];
  }
  const ct = (SEG + 1) * (BANDS + 1), cb = ct + 1;
  pos[ct * 3 + 1] = SPY0 + BANDS * BH; pos[cb * 3 + 1] = SPY0;
  meatColor(i, 0.9, _c3); for (const v of [ct, cb]) { col[v * 3] = _c3[0]; col[v * 3 + 1] = _c3[1]; col[v * 3 + 2] = _c3[2]; }
  sp.g.attributes.position.needsUpdate = true; sp.g.attributes.color.needsUpdate = true; sp.g.computeVertexNormals(); S.dirty = false;
}
function frontCells(i, rot, band) {
  const out = []; const st = 2 * PI / SEG;
  for (let j = 0; j < SEG; j++) if (Math.cos((j + 0.5) * st + rot) > 0.75) out.push(band * SEG + j);
  return out;
}

/* ---------- objetos que se llevan en la mano ---------- */
const VEGC = [0x6fae3a, 0xc63a2a, 0xe6d6e8], DRC = [0xb3261e, 0x6fb3e0, 0xd8b23a];
function gunMesh() {
  const g = new THREE.Group(), st = lam(null, 0x2a2c30), wd = lam('wood', 0x8a5a36);
  for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.4, 6), st); b.rotation.x = PI / 2; b.position.set(s * 0.018, 0.02, -0.2); g.add(b); }
  const rc = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.16), st); rc.position.set(0, 0.01, 0.05); g.add(rc);
  const fe = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.04, 0.2), wd); fe.position.set(0, -0.02, -0.14); g.add(fe);
  const sk = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.09, 0.2), wd); sk.position.set(0, -0.045, 0.2); sk.rotation.x = -0.45; g.add(sk);
  return g;
}
function itemMesh(h) {
  const g = new THREE.Group(); if (!h) return g;
  const add = (geo, m, x, y, z) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); g.add(me); return me; };
  if (h.k === 'gun') return gunMesh();
  if (h.k === 'dr') {
    if (h.t === 1) { add(new THREE.CylinderGeometry(0.03, 0.032, 0.17, 7), lam(null, DRC[1], { transparent: true, opacity: 0.75 }), 0, 0.085, 0); add(new THREE.CylinderGeometry(0.014, 0.014, 0.03, 6), lam(null, 0x2a5fb0), 0, 0.185, 0); }
    else { add(new THREE.CylinderGeometry(0.033, 0.033, 0.12, 8), lam(null, DRC[h.t]), 0, 0.06, 0); add(new THREE.CylinderGeometry(0.03, 0.033, 0.008, 8), lam(null, 0xc8ccd0), 0, 0.124, 0); }
    return g;
  }
  if (h.k === 'fr') {
    add(new THREE.CylinderGeometry(0.06, 0.035, 0.11, 6, 1, true), lam(null, 0xd9d2c0, { side: THREE.DoubleSide }), 0, 0.055, 0);
    const c = h.q < 0.4 ? (h.q < 0.2 ? 0x3a2412 : 0xe6dca0) : h.q < 0.8 ? 0xb8862a : 0xe2b83a, fm = lam(null, c);
    for (let i = 0; i < 9; i++) { const f = add(new THREE.BoxGeometry(0.012, 0.09, 0.012), fm, Math.cos(i * 2.4) * 0.03, 0.11, Math.sin(i * 2.4) * 0.03); f.rotation.set(Math.sin(i) * 0.3, 0, Math.cos(i * 1.7) * 0.3); }
    return g;
  }
  if (h.k === 'body') {
    const m = lam('bag', 0x8a8a92), rope = lam(null, 0xa89060);
    add(new THREE.BoxGeometry(0.62, 0.2, 0.26), m, 0, 0.1, 0); add(new THREE.SphereGeometry(0.11, 6, 5), m, -0.37, 0.11, 0);
    for (const x of [-0.2, 0.04, 0.25]) add(new THREE.BoxGeometry(0.02, 0.215, 0.275), rope, x, 0.1, 0);
    return g;
  }
  if (h.k === 'cone') {
    const c = add(new THREE.SphereGeometry(0.11, 7, 5), new THREE.MeshLambertMaterial({ map: TX.meat, color: 0xc85a52 }), 0, 0.1, 0); c.scale.set(1.3, 0.8, 1);
    add(new THREE.CylinderGeometry(0.012, 0.012, 0.32, 5), lam(null, 0x70747a), 0, 0.14, 0);
    return g;
  }
  if (h.k === 'vg') {
    const m = lam(null, VEGC[h.t]);
    if (h.t === 0) add(new THREE.SphereGeometry(0.1, 7, 5), m, 0, 0.09, 0).scale.set(1, 0.85, 1);
    else for (let i = 0; i < 3; i++) add(new THREE.SphereGeometry(0.05, 6, 5), m, Math.cos(i * 2.1) * 0.05, 0.05, Math.sin(i * 2.1) * 0.05);
    return g;
  }
  // kebab
  const bread = lam(null, h.b === 1 ? 0xd9b878 : 0xe9d9a8), foil = lam(null, 0xc9cdd2, { emissive: 0x1a1c1e });
  if (h.w) {
    if (h.b === 0) { const r = add(new THREE.CylinderGeometry(0.042, 0.042, 0.22, 7), foil, 0, 0.045, 0); r.rotation.z = PI / 2; const e = add(new THREE.CylinderGeometry(0.036, 0.036, 0.05, 7), bread, 0.125, 0.045, 0); e.rotation.z = PI / 2; }
    else if (h.b === 1) { const r = add(new THREE.CylinderGeometry(0.105, 0.105, 0.06, 8, 1, false, 0, PI), foil, 0, 0.035, 0); r.rotation.y = PI / 2; }
    else { add(new THREE.BoxGeometry(0.22, 0.07, 0.16), lam('wood', 0xd8b47c), 0, 0.035, 0); add(new THREE.BoxGeometry(0.225, 0.012, 0.165), lam('wood', 0xe2c08a), 0, 0.076, 0); }
    return g;
  }
  let top = 0.012;
  if (h.b === 0) add(new THREE.CylinderGeometry(0.135, 0.135, 0.01, 10), bread, 0, 0.005, 0);
  else if (h.b === 1) { const r = add(new THREE.CylinderGeometry(0.11, 0.11, 0.035, 9, 1, false, 0, PI), bread, 0, 0.018, 0.03); r.rotation.y = PI / 2; top = 0.036; }
  else { const bx = lam('wood', 0xd8b47c); add(new THREE.BoxGeometry(0.22, 0.01, 0.16), bx, 0, 0.005, 0); add(new THREE.BoxGeometry(0.22, 0.06, 0.008), bx, 0, 0.03, -0.08); add(new THREE.BoxGeometry(0.22, 0.06, 0.008), bx, 0, 0.03, 0.08); add(new THREE.BoxGeometry(0.008, 0.06, 0.16), bx, -0.11, 0.03, 0); add(new THREE.BoxGeometry(0.008, 0.06, 0.16), bx, 0.11, 0.03, 0); const lid = add(new THREE.BoxGeometry(0.22, 0.008, 0.16), bx, 0, 0.115, -0.105); lid.rotation.x = -1.2; }
  const rnd = mulberry32(7 + h.m[0] * 3 + h.m[1] * 5 + h.v * 11 + h.s * 17);
  const sx = h.b === 2 ? 0.17 : 0.2, sz = h.b === 2 ? 0.11 : 0.07;
  const put = (m, n, w, hh, d) => { for (let i = 0; i < n; i++) { const p = add(new THREE.BoxGeometry(w, hh, d), m, (rnd() - 0.5) * sx, top + hh / 2 + rnd() * 0.012, (rnd() - 0.5) * sz); p.rotation.y = rnd() * 3; } top += hh * 0.5; };
  for (let t = 0; t < 2; t++) if (h.m[t]) put(new THREE.MeshLambertMaterial({ color: meatHex(t, h.r > 0.4 ? 0.15 : 0.85) }), 5 * h.m[t], 0.035, 0.012, 0.018);
  if (h.f) put(lam(null, 0xe2b83a), 7, 0.045, 0.01, 0.01);
  if (h.v & 1) put(lam(null, VEGC[0]), 6, 0.04, 0.006, 0.014);
  if (h.v & 2) put(lam(null, VEGC[1]), 5, 0.02, 0.012, 0.02);
  if (h.v & 4) put(lam(null, VEGC[2]), 5, 0.03, 0.005, 0.008);
  if (h.s & 1) put(lam(null, 0xf4f1e6), 3, 0.09, 0.004, 0.008);
  if (h.s & 2) put(lam(null, 0xc0281e), 3, 0.09, 0.004, 0.008);
  return g;
}

/* ---------- construcción del local ---------- */
function buildWorld() {
  scene = new THREE.Scene(); scene.background = new THREE.Color(0x05060a); scene.fog = new THREE.Fog(0x05060a, 4, 25);
  M.inv = new THREE.MeshBasicMaterial({ visible: false });
  M.floor = lam('floor', 0xb9b0a0); M.tile = lam('tileg', 0xc4cbb8); M.wall = lam('wall', 0xcfc7b0); M.ceil = lam('ceil', 0x7d786e);
  M.conc = lam('conc', 0xa9a79f); M.concf = lam('concf', 0x8d8d8d); M.steel = lam('steel', 0xd0d4d8); M.steelD = lam('steel', 0x70747a); M.steel2 = lam('steel2', 0xb0b0a4);
  M.rust = lam('rust'); M.corr = lam('corr'); M.brick = lam('brick', 0x8a8078); M.pave = lam('pave', 0x9a9a9a); M.asph = lam('asphalt', 0x9a9aa4); M.wood = lam('wood'); M.bag = lam('bag', 0x9a9aa0); M.white = lam('white', 0xd8dde0);
  M.dark = lam(null, 0x15161a); M.tgrey = lam('tilegrey', 0xa8a8a0);
  D.spit = []; D.bins = []; D.shelf = []; D.flies = [];

  // --- local principal: x[-4,4] z[-4,5] ---
  plane(8, 9, M.floor, 0, 0, 0.5, -PI / 2, 0, 1.6, true);
  plane(8, 9, M.ceil, 0, 2.9, 0.5, PI / 2, 0, 2.6, true);
  wseg('z', -4, -4, 5, 0, 2.9, PI / 2, 'shop'); wseg('z', 4, -4, 5, 0, 2.9, -PI / 2, 'shop');
  wseg('x', -4, -4, 2.4, 0, 2.9, 0, 'shop'); wseg('x', -4, 3.5, 4, 0, 2.9, 0, 'shop'); wseg('x', -4, 2.4, 3.5, 2.1, 2.9, 0, 'shop');
  wseg('x', 5, -4, -3.2, 0, 2.9, PI, 'shop'); wseg('x', 5, -2.0, -1.2, 0, 2.9, PI, 'shop'); wseg('x', 5, 3.2, 4, 0, 2.9, PI, 'shop');
  wseg('x', 5, -3.2, -2.0, 2.15, 2.9, PI, 'shop'); wseg('x', 5, -1.2, 3.2, 0, 0.9, PI, 'shop'); wseg('x', 5, -1.2, 3.2, 2.3, 2.9, PI, 'shop');
  // marcos, cristal y puerta abierta
  for (const [x, y, w, h] of [[-1.2, 1.6, 0.07, 1.4], [3.2, 1.6, 0.07, 1.4], [1, 0.9, 4.4, 0.07], [1, 2.3, 4.4, 0.07], [1, 1.6, 0.05, 1.4], [-3.2, 1.07, 0.08, 2.15], [-2.0, 1.07, 0.08, 2.15], [-2.6, 2.15, 1.2, 0.08]]) box(w, h, 0.1, M.dark, x, y, 5);
  plane(4.4, 1.4, new THREE.MeshBasicMaterial({ map: TX.grime2, transparent: true, opacity: 0.35, color: 0x8a9aa0, depthWrite: false, side: THREE.DoubleSide }), 1, 1.6, 4.99, 0, PI);
  const dr = box(1.15, 2.1, 0.05, lam(null, 0x30363a, { transparent: true, opacity: 0.55 }), -3.2 + 0.1, 1.05, 4.45, { ry: PI / 2 - 0.25 });
  D.frontDoor = dr;
  // exterior
  plane(44, 3, M.pave, 0, -0.02, 6.5, -PI / 2, 0, 1.5);
  plane(44, 7, M.asph, 0, -0.03, 11.5, -PI / 2, 0, 3);
  plane(44, 9, M.brick, 0, 4.5, 15, 0, PI, 2.2);
  for (let i = 0; i < 7; i++) plane(1.1, 1.4, bas(i === 4 ? 0x3a3214 : 0x07080a), -13 + i * 4.3, 4.4, 14.95, 0, PI);
  D.figWin = plane(0.42, 0.9, bas(0x050505), -13 + 4 * 4.3, 4.2, 14.9, 0, PI);
  cyl(0.06, 0.08, 4.4, 6, M.dark, 1.6, 2.2, 8.4); box(0.9, 0.08, 0.14, M.dark, 1.2, 4.4, 8.4);
  D.lampHead = box(0.4, 0.06, 0.16, bas(0xffb45a), 0.9, 4.35, 8.4);
  box(1.9, 1.25, 4.3, lam(null, 0x16181d), -7.5, 0.7, 10.2); box(1.7, 0.6, 2.3, lam(null, 0x0d0e12), -7.5, 1.55, 10.3);
  // --- almacén: x[0.5,4] z[-7.5,-4.2] ---
  plane(3.5, 3.3, M.concf, 2.25, 0.001, -5.85, -PI / 2, 0, 1.5, true);
  plane(3.5, 3.3, lam('conc', 0x6f6d68), 2.25, 2.6, -5.85, PI / 2, 0, 2, true);
  wseg('z', 0.5, -7.5, -4.2, 0, 2.6, PI / 2, 'conc'); wseg('z', 4, -7.5, -4.2, 0, 2.6, -PI / 2, 'conc'); wseg('x', -7.5, 0.5, 4, 0, 2.6, 0, 'conc');
  wseg('x', -4.2, 0.5, 2.4, 0, 2.6, PI, 'conc'); wseg('x', -4.2, 3.5, 4, 0, 2.6, PI, 'conc'); wseg('x', -4.2, 2.4, 3.5, 2.1, 2.6, PI, 'conc');
  plane(0.2, 2.1, M.conc, 2.4, 1.05, -4.1, 0, PI / 2); plane(0.2, 2.1, M.conc, 3.5, 1.05, -4.1, 0, -PI / 2);
  plane(1.1, 0.2, M.concf, 2.95, 0.001, -4.1, -PI / 2, 0); plane(1.1, 0.2, M.conc, 2.95, 2.1, -4.1, PI / 2, 0);
  // colisiones de muros
  colliders.push({ x0: -5, x1: -4, z0: -5, z1: 6 }, { x0: 4, x1: 5, z0: -8, z1: 6 }, { x0: -5, x1: 5, z0: 5, z1: 5.5 },
    { x0: -5, x1: 2.4, z0: -4.2, z1: -4 }, { x0: 3.5, x1: 5, z0: -4.2, z1: -4 }, { x0: 0.2, x1: 0.5, z0: -7.7, z1: -4.2 }, { x0: 0, x1: 5, z0: -7.9, z1: -7.5 }, { x0: -5, x1: 0.5, z0: -5, z1: -4.2 });

  // --- luces ---
  LG.amb = new THREE.AmbientLight(0x2a2e36, 0.55); scene.add(LG.amb);
  const pl = (c, i, d, x, y, z) => { const l = new THREE.PointLight(c, i, d, 1.6); l.position.set(x, y, z); l.userData.base = i; scene.add(l); return l; };
  LG.k = pl(0xdfeedd, 1.05, 10, -0.6, 2.6, -1.7); LG.c = pl(0xd8ead8, 0.95, 9, 0, 2.6, 3.1);
  LG.heat = pl(0xff6a1e, 0.9, 4.2, -2.4, 1.45, -3.1); LG.fridge = pl(0x9cc8ff, 0.5, 3.4, 3.0, 1.2, -2.1);
  LG.neon = pl(0xff2a22, 0.7, 4.5, 1, 2.0, 4.4); LG.street = pl(0xffa040, 2.1, 10.5, 0.9, 3.6, 8.2);
  LG.store = pl(0xffd9a0, 0.6, 5.5, 2.2, 2.2, -5.9); LG.emer = pl(0xff2015, 0, 4.5, -2.6, 2.4, 4.5);
  LG.flash = new THREE.PointLight(0xfff0c0, 0, 14, 1.5); scene.add(LG.flash);
  LG.torch = new THREE.SpotLight(0xdfe8ff, 0, 11, 0.5, 0.6, 1.3); scene.add(LG.torch); scene.add(LG.torch.target);
  D.tubes = [box(1.3, 0.05, 0.12, bas(0xeaffea), -0.6, 2.86, -1.7), box(1.3, 0.05, 0.12, bas(0xeaffea), 0, 2.86, 3.1)];
  D.bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), bas(0xffe2b0)); D.bulb.position.set(2.2, 2.28, -5.9); scene.add(D.bulb);
  cyl(0.005, 0.005, 0.3, 4, M.dark, 2.2, 2.45, -5.9);

  // --- mostrador ---
  box(6.6, 0.96, 0.7, M.tgrey, -0.7, 0.48, 0.95, { col: true, occ: true, tile: 1.0 });
  box(6.7, 0.05, 0.8, M.steel, -0.7, 0.985, 0.95);
  plane(2.5, 0.4, lam(null, 0x9ab0b8, { transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }), -2.75, 1.22, 1.27, 0.25, 0);
  const cy = 1.01, cz = 0.8;
  for (let i = 0; i < 3; i++) {
    const x = -3.5 + i * 0.45;
    box(0.4, 0.1, 0.3, M.steelD, x, cy + 0.05, cz);
    const fill = box(0.34, 0.1, 0.24, lam(null, VEGC[i]), x, cy + 0.11, cz); D.bins.push(fill);
    hit('bn' + i, x, cy + 0.1, cz, 0.42, 0.24, 0.34);
  }
  for (let i = 0; i < 2; i++) {
    const x = -2.12 + i * 0.26, c = i ? 0xc0281e : 0xf2f0e6;
    cyl(0.045, 0.05, 0.2, 7, lam(null, c), x, cy + 0.1, cz); cyl(0.008, 0.02, 0.06, 5, lam(null, i ? 0x7a1a14 : 0xb8b6a8), x, cy + 0.23, cz);
    hit('sa' + i, x, cy + 0.13, cz, 0.22, 0.32, 0.26);
  }
  cyl(0.145, 0.145, 0.07, 10, lam(null, 0xe9d9a8), -1.45, cy + 0.035, cz); hit('bs0', -1.45, cy + 0.08, cz, 0.4, 0.2, 0.36);
  for (let i = 0; i < 4; i++) cyl(0.11, 0.11, 0.028, 9, lam(null, i % 2 ? 0xd2ae6c : 0xd9b878), -0.95 + (i % 2) * 0.01, cy + 0.014 + i * 0.028, cz); hit('bs1', -0.95, cy + 0.08, cz, 0.36, 0.22, 0.36);
  for (let i = 0; i < 3; i++) box(0.22, 0.05, 0.17, lam('wood', 0xd8b47c), -0.45, cy + 0.025 + i * 0.052, cz, { ry: i * 0.07 }); hit('bs2', -0.45, cy + 0.09, cz, 0.36, 0.24, 0.36);
  box(0.36, 0.05, 0.14, M.dark, 0.05, cy + 0.025, cz); cyl(0.045, 0.045, 0.32, 8, lam(null, 0xd0d4d8, { emissive: 0x202224 }), 0.05, cy + 0.09, cz, { rz: PI / 2 }); hit('foil', 0.05, cy + 0.09, cz, 0.42, 0.22, 0.3);
  for (let i = 0; i < 3; i++) {
    const x = 0.62 + i * 0.44; box(0.38, 0.015, 0.3, M.steelD, x, cy + 0.008, cz);
    const g = new THREE.Group(); g.position.set(x, cy + 0.02, cz); scene.add(g); D.shelf.push({ g, key: '' });
    hit('sh' + i, x, cy + 0.1, cz, 0.42, 0.22, 0.34);
  }
  box(0.42, 0.26, 0.4, M.dark, 2.2, cy + 0.13, 0.95); box(0.3, 0.16, 0.02, bas(0x1f6a3a), 2.2, cy + 0.33, 0.9, { rx: 0.4 }); box(0.36, 0.1, 0.3, lam(null, 0x33363c), 2.2, cy + 0.02, 0.95);

  // --- asadores, freidora, basura ---
  box(3.0, 0.9, 0.7, M.steel2, -2.4, 0.45, -3.65, { col: true, occ: true });
  box(3.04, 0.03, 0.74, M.steel, -2.4, 0.915, -3.65);
  D.heatTex = ctex(32, 48, (g) => { g.fillStyle = '#2a0c04'; g.fillRect(0, 0, 32, 48); for (let y = 2; y < 48; y += 6) { const gr = g.createLinearGradient(0, y, 0, y + 4); gr.addColorStop(0, '#ff5a10'); gr.addColorStop(0.5, '#ffd27a'); gr.addColorStop(1, '#ff4a08'); g.fillStyle = gr; g.fillRect(2, y, 28, 4); } });
  buildSpit(0); buildSpit(1);
  box(1.1, 0.9, 0.7, M.steel, -0.25, 0.45, -3.65, { col: true, occ: true });
  D.oil = box(0.5, 0.02, 0.5, new THREE.MeshLambertMaterial({ map: TX.oil, color: 0xc89a2a, emissive: 0x2a1a04 }), -0.52, 0.895, -3.65);
  for (const [x, z, w, d] of [[-0.52, -3.39, 0.54, 0.03], [-0.52, -3.91, 0.54, 0.03], [-0.79, -3.65, 0.03, 0.54], [-0.25, -3.65, 0.03, 0.54]]) box(w, 0.06, d, M.steelD, x, 0.92, z);
  D.basket = new THREE.Group(); D.basket.position.set(-0.52, 1.15, -3.65); scene.add(D.basket);
  for (const [x, z, w, d] of [[0, 0.17, 0.36, 0.012], [0, -0.17, 0.36, 0.012], [0.17, 0, 0.012, 0.36], [-0.17, 0, 0.012, 0.36]]) box(w, 0.14, d, M.dark, x, 0, z, { parent: D.basket });
  box(0.36, 0.01, 0.36, M.dark, 0, -0.07, 0, { parent: D.basket }); box(0.03, 0.03, 0.3, M.dark, 0, 0.08, 0.3, { parent: D.basket });
  D.basketFries = box(0.3, 0.07, 0.3, new THREE.MeshLambertMaterial({ color: 0xe6dca0 }), 0, -0.03, 0, { parent: D.basket });
  box(0.44, 0.05, 0.5, M.steelD, 0.05, 0.925, -3.65);
  D.friesPile = box(0.36, 0.08, 0.42, new THREE.MeshLambertMaterial({ color: 0xe2b83a }), 0.05, 0.96, -3.65);
  hit('fz', -0.52, 1.03, -3.65, 0.56, 0.42, 0.56); hit('ft', 0.05, 0.99, -3.65, 0.46, 0.22, 0.52);
  cyl(0.26, 0.22, 0.7, 8, M.bag, 0.8, 0.35, -3.62); cyl(0.27, 0.27, 0.03, 8, M.dark, 0.8, 0.71, -3.62, { open: true });
  colliders.push({ x0: 0.55, x1: 1.05, z0: -4, z1: -3.38 }); hit('trash', 0.8, 0.45, -3.62, 0.56, 0.9, 0.56);
  for (let i = 0; i < 4; i++) { const f = box(0.012, 0.012, 0.012, bas(0x050505), 0.8, 1, -3.6); D.flies.push(f); }
  // nota y carta
  D.rulesTex = ctex(128, 180, (g) => { g.fillStyle = '#e8dfc0'; g.fillRect(0, 0, 128, 180); g.fillStyle = '#5a1512'; g.font = 'bold 13px sans-serif'; g.fillText('TURNO DE NOCHE', 8, 20); g.fillStyle = '#2a2622'; for (let i = 0; i < 9; i++) { g.fillRect(8, 34 + i * 15, 60 + (i * 37 % 50), 2); g.fillRect(8, 39 + i * 15, 30 + (i * 53 % 70), 2); } g.fillStyle = 'rgba(90,50,10,.25)'; g.beginPath(); g.arc(90, 150, 26, 0, 7); g.fill(); });
  plane(0.3, 0.42, new THREE.MeshLambertMaterial({ map: D.rulesTex }), 1.75, 1.5, -3.985, 0, 0); hit('rules', 1.75, 1.5, -3.97, 0.36, 0.48, 0.1);
  const menuTex = ctex(320, 96, (g) => {
    g.fillStyle = '#1a1410'; g.fillRect(0, 0, 320, 96); g.fillStyle = '#f2c230'; g.font = 'bold 24px Impact, sans-serif'; g.fillText('KEBAB PONIENTE', 10, 27);
    g.font = 'bold 13px sans-serif'; const it = [['DÜRÜM', '6,00'], ['PITA', '5,00'], ['CAJA+PATATAS', '7,50'], ['PATATAS', '2,50'], ['COLA', '1,80'], ['AGUA', '1,20'], ['CERVEZA', '2,20']];
    it.forEach((r, i) => { const x = 10 + (i > 3 ? 170 : 0), y = 46 + (i % 4) * 14; g.fillStyle = '#efe6c8'; g.fillText(r[0], x, y); g.fillStyle = '#ff5a3a'; g.fillText(r[1] + '€', x + (i > 3 ? 84 : 112), y); });
  });
  plane(2.7, 0.84, new THREE.MeshLambertMaterial({ map: menuTex, emissive: 0x33302a, emissiveMap: menuTex }), -2.4, 2.38, -3.985, 0, 0);
  // --- tabla de cortar ---
  box(0.7, 0.9, 2.2, M.steel2, -3.65, 0.45, -1.6, { col: true, occ: true }); box(0.72, 0.03, 2.24, M.steel, -3.65, 0.915, -1.6);
  box(0.42, 0.03, 0.58, lam('wood', 0xc9a070), -3.62, 0.945, -1.6);
  D.chopVeg = new THREE.Group(); D.chopVeg.position.set(-3.62, 0.96, -1.6); scene.add(D.chopVeg); D.chopKey = '';
  box(0.3, 0.004, 0.035, lam(null, 0xd0d4d8), -3.62, 0.965, -1.2); box(0.11, 0.02, 0.03, M.dark, -3.62, 0.97, -1.0, { ry: 0 });
  hit('chop', -3.62, 1.02, -1.6, 0.5, 0.26, 0.7);
  // --- nevera ---
  box(0.65, 1.95, 1.2, M.white, 3.675, 0.975, -2.1, { col: true, occ: true });
  const frTex = ctex(64, 128, (g) => {
    g.fillStyle = '#0d1418'; g.fillRect(0, 0, 64, 128);
    const rows = [[20, '#b3261e', '#e8e8e8'], [50, '#6fb3e0', '#2a5fb0'], [80, '#d8b23a', '#2a6a3a']];
    for (const [y, c1, c2] of rows) { g.fillStyle = '#9ab0b8'; g.fillRect(2, y + 22, 60, 2); for (let i = 0; i < 8; i++) { g.fillStyle = c1; g.fillRect(4 + i * 7.3, y, 5.4, 22); g.fillStyle = c2; g.fillRect(4 + i * 7.3, y + 7, 5.4, 5); } }
    g.fillStyle = '#16242a'; g.fillRect(0, 108, 64, 20);
  });
  D.fridgeFace = plane(1.1, 1.75, new THREE.MeshBasicMaterial({ map: frTex }), 3.345, 1.0, -2.1, 0, -PI / 2);
  box(0.03, 1.2, 0.04, M.steelD, 3.33, 1.1, -1.56);
  for (let i = 0; i < 3; i++) hit('dr' + i, 3.36, 1.63 - i * 0.41, -2.1, 0.12, 0.4, 1.12);
  // --- escopeta en la pared ---
  box(0.06, 0.04, 0.04, M.wood, 3.96, 1.4, -0.25); box(0.06, 0.04, 0.04, M.wood, 3.96, 1.4, -0.85);
  D.rackGun = gunMesh(); D.rackGun.position.set(3.92, 1.46, -0.6); D.rackGun.rotation.set(0, 0, 0); scene.add(D.rackGun);
  hit('gun', 3.9, 1.45, -0.55, 0.22, 0.34, 1.0);
  cyl(0.17, 0.14, 0.3, 8, lam(null, 0x3a5a7a), 3.55, 0.15, 0.25); cyl(0.012, 0.012, 1.3, 5, M.wood, 3.6, 0.7, 0.25, { rz: 0.18 });
  // --- almacén ---
  for (let i = 0; i < 3; i++) {
    const x = 0.95 + i * 0.56; box(0.5, 0.42, 0.5, M.wood, x, 0.21, -7.15); box(0.44, 0.1, 0.44, lam(null, VEGC[i]), x, 0.43, -7.15);
    hit('vc' + i, x, 0.35, -7.15, 0.54, 0.7, 0.54);
  }
  colliders.push({ x0: 0.5, x1: 2.4, z0: -7.5, z1: -6.88 });
  box(0.42, 1.8, 1.9, M.steel2, 3.76, 0.9, -5.55, { col: true, occ: true });
  for (let i = 0; i < 5; i++) box(0.3, 0.26, 0.34, lam('wood', i % 2 ? 0xb89868 : 0x9a7a50), 3.5, 0.35 + (i % 3) * 0.55, -6.2 + i * 0.36, { ry: i * 0.2 });
  box(0.1, 0.52, 0.4, lam('fuse'), 0.56, 1.5, -5.3); D.fuseLever = box(0.05, 0.14, 0.05, lam(null, 0xb0201a), 0.63, 1.55, -5.3); D.fuseLed = box(0.02, 0.03, 0.03, bas(0x30ff50), 0.615, 1.7, -5.42);
  hit('fuse', 0.6, 1.5, -5.3, 0.22, 0.6, 0.5);
  // mesa de despiece
  box(0.75, 0.82, 0.85, M.steel2, 0.875, 0.41, -6.275, { col: true, occ: true }); box(0.79, 0.04, 0.89, M.steel, 0.875, 0.84, -6.275);
  decal('st1', 0.875, 0.862, -6.275, -PI / 2, 0, 0.7, 0.7, 0.85); box(0.16, 0.012, 0.09, lam(null, 0xd0d4d8), 1.1, 0.87, -5.98); box(0.1, 0.02, 0.03, M.dark, 1.1, 0.875, -5.9);
  D.bt = new THREE.Group(); D.bt.position.set(0.875, 0.865, -6.3); D.bt.rotation.y = PI / 2; scene.add(D.bt); D.btKey = '';
  hit('butcher', 0.875, 1.0, -6.275, 0.8, 0.42, 0.9);
  D.bdoor = box(0.95, 2.08, 0.06, M.rust, 3.05, 1.04, -7.47); box(0.05, 0.05, 0.02, bas(0x020202), 3.05, 1.55, -7.43); box(0.04, 0.12, 0.05, M.steelD, 3.4, 1.0, -7.42);
  box(1.1, 2.2, 0.03, M.dark, 3.05, 1.1, -7.495);
  hit('peep', 3.05, 1.6, -7.44, 0.9, 0.9, 0.12); hit('bdoor', 3.05, 0.7, -7.44, 0.9, 0.9, 0.12);
  // --- neón (se ve del revés desde dentro) ---
  const neon = ctex(256, 64, (g) => { g.clearRect(0, 0, 256, 64); g.translate(256, 0); g.scale(-1, 1); g.font = 'bold 50px Impact, sans-serif'; g.shadowColor = '#ff2a1a'; g.shadowBlur = 10; g.fillStyle = '#ff5a48'; g.fillText('KEBAB', 6, 50); g.shadowColor = '#3aff6a'; g.fillStyle = '#7dffa0'; g.font = 'bold 30px Impact, sans-serif'; g.fillText('24H', 190, 44); });
  D.neon = plane(2.2, 0.55, new THREE.MeshBasicMaterial({ map: neon, transparent: true, depthWrite: false }), 1, 2.02, 4.9, 0, PI);
  // --- mugre ---
  decal('st1', 0.9, 0.012, -3.0, -PI / 2, 0, 1.3, 1.3, 0.8); decal('st4', -1.0, 0.012, 2.9, -PI / 2, 0, 1.8, 1.8, 0.7); decal('st5', 2.6, 0.012, -1.2, -PI / 2, 0, 1.6, 1.6, 0.6);
  decal('st2', 3.0, 0.014, -6.6, -PI / 2, 0, 1.7, 1.7, 0.9); decal('st3', 1.6, 0.014, -5.2, -PI / 2, 0, 1.4, 1.4, 0.7); decal('grime2', -2.2, 0.012, -2.2, -PI / 2, 0, 2.6, 2.6, 0.5);
  decal('drip1', -3.99, 2.2, 2.6, 0, PI / 2, 2.4, 1.4, 0.8); decal('drip2', 3.99, 2.2, 1.5, 0, -PI / 2, 2.4, 1.4, 0.8); decal('drip3', -0.6, 2.2, -3.99, 0, 0, 2.2, 1.4, 0.7);
  decal('grime1', -3.99, 1.3, -1.6, 0, PI / 2, 2.0, 1.6, 0.6); decal('grime1', 0.2, 1.5, -3.99, 0, 0, 1.6, 1.4, 0.7); decal('st1', 3.99, 1.1, 3.4, 0, -PI / 2, 1.2, 1.2, 0.55);
  decal('drip1', 2.2, 1.9, -7.49, 0, 0, 2.6, 1.4, 0.8); decal('st2', 0.51, 1.0, -6.4, 0, PI / 2, 1.3, 1.3, 0.7); decal('drip3', 1.5, 2.0, -4.21, 0, PI, 1.6, 1.2, 0.7);
  decal('st3', 3.05, 1.0, -7.435, 0, 0, 0.9, 0.9, 0.7); decal('grime2', 1, 0.45, 4.99, 0, PI, 3.6, 0.9, 0.5);
}

/* ================= PERSONAJES ================= */
const PLAYER_LOOK = Object.assign({}, LOOK0, { skin: SK.tan, hair: '#1d1a17', top: '#2b2f36', ts: 'apron', legs: '#22252b', h: 1.76, acc: 'cap', beard: 1 });
const SHADOW_LOOK = Object.assign({}, LOOK0, { h: 2.3, w: 0.78, hs: 'bald', top: '#000', legs: '#000', skin: '#000' });
const RIDER_LOOK = Object.assign({}, LOOK0, { skin: SK.olive, hair: '#1d1a17', beard: 1, top: '#3a5a3a', acc: 'cap', bags: 1 });
function shade(hex, f) { const c = new THREE.Color(hex); c.multiplyScalar(f); return '#' + c.getHexString(); }
const _gc = {};
function G(w, h, d) { const k = w.toFixed(3) + '_' + h.toFixed(3) + '_' + d.toFixed(3); return _gc[k] || (_gc[k] = new THREE.BoxGeometry(w, h, d)); }
let _headGeo = null;

function drawFace(g, look, seed, closed, an) {
  const r = mulberry32(seed * 7 + 3), skin = an === 1 ? '#98a39a' : look.skin, hair = look.hair;
  g.fillStyle = skin; g.fillRect(0, 0, 128, 64);
  let gr = g.createLinearGradient(0, 0, 64, 0); gr.addColorStop(0, 'rgba(0,0,0,.3)'); gr.addColorStop(0.3, 'rgba(0,0,0,0)'); gr.addColorStop(0.7, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.3)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  gr = g.createLinearGradient(0, 50, 0, 64); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.45)'); g.fillStyle = gr; g.fillRect(0, 50, 128, 14);
  if (an !== 1) {
    if (look.burn) { g.fillStyle = 'rgba(215,55,40,.3)'; g.fillRect(14, 33, 36, 9); g.fillRect(27, 29, 10, 13); g.fillRect(16, 14, 32, 6); }
    if (look.fem) { g.fillStyle = 'rgba(220,90,90,.22)'; g.fillRect(14, 36, 9, 6); g.fillRect(41, 36, 9, 6); }
  } else { g.strokeStyle = 'rgba(30,45,40,.5)'; g.lineWidth = 1; for (let i = 0; i < 9; i++) { g.beginPath(); const x0 = i % 2 ? 24 : 40, a = r() * 6.3; g.moveTo(x0 + Math.cos(a) * 5, 31 + Math.sin(a) * 4); g.lineTo(x0 + Math.cos(a) * (9 + r() * 6), 31 + Math.sin(a) * (7 + r() * 6)); g.stroke(); } }
  g.fillStyle = shade(skin, 0.8); g.fillRect(3, 30, 5, 10); g.fillRect(56, 30, 5, 10);
  // barba
  if (look.beard === 1) { g.fillStyle = 'rgba(35,28,24,.3)'; g.fillRect(13, 40, 38, 20); }
  if (look.beard === 2) { g.fillStyle = shade(hair, 0.9); g.fillRect(11, 38, 42, 26); g.fillRect(9, 30, 5, 12); g.fillRect(50, 30, 5, 12); g.fillStyle = skin; g.fillRect(26, 44, 12, 5); }
  if (look.beard === 3 || look.beard === 2) { g.fillStyle = shade(hair, 0.8); g.fillRect(23, 42, 18, 3.5); }
  // pelo
  g.fillStyle = hair;
  if (look.hs === 'bald') { g.fillStyle = 'rgba(30,25,20,.22)'; g.fillRect(0, 0, 128, 10); g.fillRect(62, 0, 66, 40); }
  else {
    g.fillRect(0, 0, 128, 13); g.fillRect(7, 13, 5, 7); g.fillRect(52, 13, 5, 7);
    if (look.hs === 'long' || look.hs === 'bun') { g.fillRect(59, 0, 69, 64); g.fillRect(0, 0, 6, 64); g.fillRect(6, 13, 5, look.hs === 'long' ? 51 : 30); g.fillRect(53, 13, 5, look.hs === 'long' ? 51 : 30); }
    else { g.fillRect(61, 0, 67, 46); g.fillRect(0, 0, 3, 46); if (!look.fem) { g.fillRect(8, 13, 3, 18); g.fillRect(53, 13, 3, 18); } }
    g.strokeStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i < 26; i++) { const x = r() * 128, y = r() * 12; g.beginPath(); g.moveTo(x, y); g.lineTo(x + r() * 6 - 3, y + 6 + r() * 8); g.stroke(); }
  }
  if (look.mask) { g.fillStyle = '#0d0d0f'; g.fillRect(0, 0, 128, 64); g.fillStyle = skin; g.fillRect(15, 26, 34, 10); }
  // cejas
  g.fillStyle = shade(hair, 0.55); if (look.hs === 'bald' || hair > '#c') g.fillStyle = shade(skin, 0.45);
  if (!look.mask) { g.fillRect(19, 24, 10, 2); g.fillRect(35, 24, 10, 2); }
  // ojos
  for (const ex of [24, 40]) {
    if (an === 1) { g.fillStyle = '#020202'; g.beginPath(); g.ellipse(ex, 30.5, 5.2, 3.6, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(ex, 31, 7.5, 5.5, 0, 0, 7); g.fill(); }
    else if (closed) { g.fillStyle = shade(skin, 0.62); g.fillRect(ex - 4.5, 30, 9, 1.6); }
    else {
      g.fillStyle = '#e6e0d6'; g.beginPath(); g.ellipse(ex, 30.5, 4.4, 2.5, 0, 0, 7); g.fill();
      g.fillStyle = look.eye; g.beginPath(); g.arc(ex, 30.6, 2.3, 0, 7); g.fill(); g.fillStyle = '#050505'; g.fillRect(ex - 0.8, 29.8, 1.6, 1.6);
      g.fillStyle = shade(skin, 0.5); g.fillRect(ex - 4.6, 27.6, 9.2, 1.1);
    }
    if (look.bags && an !== 1) { g.fillStyle = 'rgba(70,35,70,.3)'; g.beginPath(); g.ellipse(ex, 34.5, 4.6, 1.8, 0, 0, 7); g.fill(); }
  }
  // nariz y boca
  if (!look.mask) {
    g.fillStyle = 'rgba(0,0,0,.16)'; g.fillRect(33, 30, 1.6, 11); g.fillRect(29, 40.5, 7, 1.4);
    if (an === 1) { g.fillStyle = '#050505'; g.fillRect(19, 46.5, 26, 1.6); g.fillRect(17, 45, 3, 1.6); g.fillRect(44, 45, 3, 1.6); }
    else { g.fillStyle = look.fem ? '#a8364a' : shade(skin, 0.55); g.fillRect(26, 46.5, 12, 1.8); g.fillStyle = look.fem ? '#c24a5c' : shade(skin, 0.86); g.fillRect(27, 48.3, 10, 1.4); }
  }
  if (look.age > 0.5 && an !== 1) { g.fillStyle = 'rgba(0,0,0,.17)'; g.fillRect(19, 17, 26, 1); g.fillRect(21, 20, 22, 1); g.fillRect(25, 41, 1, 7); g.fillRect(38, 41, 1, 7); g.fillRect(15, 29, 3, 1); g.fillRect(46, 29, 3, 1); if (look.age > 0.85) { g.fillRect(17, 38, 5, 1); g.fillRect(42, 38, 5, 1); g.fillRect(28, 54, 8, 1); } }
  if (look.gl) { g.strokeStyle = '#141414'; g.lineWidth = 1.4; g.strokeRect(18, 26, 12, 9); g.strokeRect(34, 26, 12, 9); g.beginPath(); g.moveTo(30, 29); g.lineTo(34, 29); g.moveTo(18, 29); g.lineTo(6, 31); g.moveTo(46, 29); g.lineTo(58, 31); g.stroke(); }
  for (let i = 0; i < 260; i++) { g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,.05)' : 'rgba(255,255,255,.04)'; g.fillRect(r() * 128 | 0, r() * 64 | 0, 1, 1); }
}
function drawTorso(g, look, back) {
  const c = look.top; g.fillStyle = c; g.fillRect(0, 0, 64, 64);
  const dk = 'rgba(0,0,0,.35)', wh = 'rgba(255,255,255,.85)';
  switch (look.ts) {
    case 'foot': g.fillStyle = 'rgba(255,255,255,.8)'; for (let x = 6; x < 64; x += 16) g.fillRect(x, 0, 6, 64); if (back) { g.fillStyle = '#fff'; g.font = 'bold 26px Impact,sans-serif'; g.fillText('9', 25, 44); } else { g.fillStyle = '#f2c230'; g.fillRect(42, 14, 7, 8); } break;
    case 'shirt': if (!back) { g.fillStyle = dk; g.fillRect(31, 0, 1.5, 64); for (let y = 12; y < 64; y += 11) g.fillRect(30, y, 3.5, 2.5); g.fillStyle = shade(c, 1.15); g.beginPath(); g.moveTo(22, 0); g.lineTo(32, 10); g.lineTo(42, 0); g.fill(); } break;
    case 'open': if (!back) { g.fillStyle = look.skin; g.beginPath(); g.moveTo(22, 0); g.lineTo(32, 46); g.lineTo(42, 0); g.fill(); g.fillStyle = '#c9a23a'; g.fillRect(28, 12, 8, 1.5); } break;
    case 'hood': if (!back) { g.fillStyle = dk; g.fillRect(16, 40, 32, 1.5); g.fillRect(16, 40, 1.5, 16); g.fillRect(47, 40, 1.5, 16); g.fillStyle = wh; g.fillRect(27, 4, 1.5, 16); g.fillRect(36, 4, 1.5, 16); } break;
    case 'vest': g.fillStyle = '#c9ccd0'; g.fillRect(0, 22, 64, 6); g.fillRect(0, 40, 64, 6); if (!back) { g.fillStyle = dk; g.fillRect(31, 0, 1.5, 64); } break;
    case 'pol': g.fillStyle = '#e8e23a'; if (back) { g.font = 'bold 12px sans-serif'; g.fillText('POLICÍA', 7, 26); g.font = 'bold 9px sans-serif'; g.fillText('LOCAL', 17, 38); } else { g.fillRect(40, 12, 9, 10); g.fillStyle = dk; g.fillRect(31, 0, 1.5, 64); } g.fillStyle = '#d8d21f'; g.fillRect(0, 50, 64, 3); break;
    case 'scrub': if (!back) { g.fillStyle = look.skin; g.beginPath(); g.moveTo(24, 0); g.lineTo(32, 13); g.lineTo(40, 0); g.fill(); g.fillStyle = dk; g.fillRect(38, 28, 14, 1.5); g.fillRect(38, 28, 1.5, 12); } break;
    case 'seg': if (back) { g.fillStyle = '#e8e8e8'; g.font = 'bold 10px sans-serif'; g.fillText('SEGURIDAD', 4, 28); } else { g.fillStyle = '#e8e8e8'; g.fillRect(40, 13, 10, 4); } break;
    case 'jacket': if (!back) { g.fillStyle = dk; g.fillRect(31, 0, 2, 64); g.fillStyle = shade(c, 0.7); g.fillRect(8, 38, 14, 2); g.fillRect(42, 38, 14, 2); } break;
    case 'track': g.fillStyle = wh; g.fillRect(2, 0, 3, 64); g.fillRect(59, 0, 3, 64); if (!back) { g.fillStyle = dk; g.fillRect(31, 0, 2, 64); } break;
    case 'plaid': g.fillStyle = 'rgba(0,0,0,.3)'; for (let i = 0; i < 64; i += 10) { g.fillRect(i, 0, 4, 64); g.fillRect(0, i, 64, 4); } break;
    case 'vestb': g.fillStyle = '#141416'; if (back) g.fillRect(0, 0, 64, 64); else { g.fillRect(0, 0, 22, 64); g.fillRect(42, 0, 22, 64); g.fillRect(30, 4, 4, 5); } break;
    case 'apron': if (!back) { g.fillStyle = '#d8d4c4'; g.fillRect(12, 10, 40, 54); g.fillRect(22, 0, 3, 12); g.fillRect(39, 0, 3, 12); g.fillStyle = 'rgba(120,50,20,.45)'; g.fillRect(20, 30, 9, 6); g.fillRect(34, 44, 12, 5); g.fillStyle = 'rgba(160,30,20,.4)'; g.fillRect(38, 22, 5, 9); } break;
  }
  const r = mulberry32(look.top.length * 31 + look.h * 100 | 0); for (let i = 0; i < 90; i++) { g.fillStyle = 'rgba(0,0,0,.07)'; g.fillRect(r() * 64 | 0, r() * 64 | 0, 2, 2); }
  const gr = g.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.25)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
}

function makeChar(look, seed, an, key) {
  const ch = { ph: Math.random() * 6, bl: 1 + Math.random() * 3, blT: 0, an, mats: [], texs: [], look, seed, tx: 0, tz: 0, ty: 0, spd: 0, sayT: 0, dead: 0 };
  const g = new THREE.Group(), body = new THREE.Group(), s = look.h / 1.74, w = look.w, sh = an === 2, dk = an === 1 ? 0.6 : 1;
  body.scale.set(s, s, s); g.add(body); ch.g = g; ch.body = body; ch.s = s;
  if (!M.shadow) { M.shadow = new THREE.MeshBasicMaterial({ color: 0x010101 }); M.eye = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }); }
  const mk = (hex, f) => { if (sh) return M.shadow; const m = new THREE.MeshLambertMaterial({ color: new THREE.Color(hex).multiplyScalar(f == null ? dk : f) }); ch.mats.push(m); return m; };
  const tx = (wd, hg, fn) => { const t = ctex(wd, hg, fn); ch.texs.push(t); return t; };
  const P = (geo, m, x, y, z, parent) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); (parent || body).add(me); return me; };
  const mSkin = mk(an === 1 ? '#98a39a' : look.skin, 1), mTop = mk(look.top), mLegs = mk(look.legs), mShoe = mk('#17171a'), mHair = mk(look.hair);
  const shortSl = ['tee', 'foot', 'scrub', 'vest', 'open'].indexOf(look.ts) >= 0;
  const leg = sx => { const p = new THREE.Group(); p.position.set(sx * 0.1 * w, 0.84, 0); body.add(p); P(G(0.15 * w, 0.44, 0.17), mLegs, 0, -0.22, 0, p); P(G(0.13 * w, 0.36, 0.15), look.ls === 'short' ? mSkin : mLegs, 0, -0.62, 0, p); P(G(0.14 * w, 0.07, 0.25), mShoe, 0, -0.805, 0.04, p); return p; };
  ch.lL = leg(-1); ch.lR = leg(1);
  let tm = mTop;
  if (!sh) {
    const mf = new THREE.MeshLambertMaterial({ map: tx(64, 64, c => drawTorso(c, look, false)), color: new THREE.Color(dk, dk, dk) }), mb = new THREE.MeshLambertMaterial({ map: tx(64, 64, c => drawTorso(c, look, true)), color: new THREE.Color(dk, dk, dk) });
    ch.mats.push(mf, mb); tm = [mTop, mTop, mTop, mTop, mf, mb];
  }
  ch.torso = P(G(0.42 * w, 0.6, 0.25), tm, 0, 1.13, 0);
  P(G(0.1, 0.09, 0.1), mSkin, 0, 1.455, 0);
  const head = new THREE.Group(); head.position.set(0, 1.6, 0); body.add(head); ch.head = head;
  if (!_headGeo) _headGeo = new THREE.SphereGeometry(0.115, 10, 8);
  if (sh) { const hm = P(_headGeo, M.shadow, 0, 0, 0, head); hm.scale.set(0.95, 1.3, 1); P(G(0.026, 0.012, 0.01), M.eye, -0.04, 0.02, 0.116, head); P(G(0.026, 0.012, 0.01), M.eye, 0.04, 0.02, 0.116, head); }
  else {
    ch.fOpen = tx(128, 64, c => drawFace(c, look, seed, false, an)); ch.fClosed = an === 1 ? ch.fOpen : tx(128, 64, c => drawFace(c, look, seed, true, an));
    ch.headMat = new THREE.MeshLambertMaterial({ map: ch.fOpen }); ch.mats.push(ch.headMat);
    const hm = P(_headGeo, ch.headMat, 0, 0, 0, head); hm.scale.set(1, 1.18, 1.06);
    if (look.hs === 'long') P(G(0.22, 0.3, 0.07), mHair, 0, -0.12, -0.1, head);
    if (look.hs === 'bun') { const b = P(_headGeo, mHair, 0, 0.1, -0.12, head); b.scale.set(0.45, 0.45, 0.45); }
    const acc = look.acc;
    if (acc === 'cap' || acc === 'polcap') { const cm = mk(acc === 'polcap' ? '#141c33' : shade(look.top, 0.7)); const c = new THREE.Mesh(new THREE.CylinderGeometry(0.118, 0.124, 0.07, 8), cm); c.position.set(0, 0.1, 0); head.add(c); P(G(0.17, 0.014, 0.1), cm, 0, 0.075, 0.15, head); if (acc === 'polcap') P(G(0.03, 0.03, 0.01), mk('#e8e23a', 1), 0, 0.1, 0.122, head); }
    if (acc === 'helmet') { const c = new THREE.Mesh(new THREE.SphereGeometry(0.142, 8, 5, 0, PI * 2, 0, PI * 0.56), mk('#dcdcdc')); c.position.set(0, 0.02, 0); c.scale.set(1, 1.15, 1.1); head.add(c); }
    if (acc === 'hood') { const c = new THREE.Mesh(new THREE.SphereGeometry(0.136, 8, 6, PI * 0.92, PI * 1.16), mk(look.top)); c.scale.set(1.05, 1.22, 1.12); c.material.side = THREE.DoubleSide; head.add(c); }
    if (acc === 'beanie') { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.121, 0.1, 8), mk('#3a3a44')); c.position.set(0, 0.1, 0); head.add(c); }
    if (acc === 'tiara') { P(G(0.15, 0.03, 0.02), mk('#f0d24a', 1), 0, 0.13, 0.06, head); P(G(0.03, 0.05, 0.02), mk('#ff6ab0', 1), 0, 0.16, 0.06, head); }
  }
  const arm = sx => { const p = new THREE.Group(); p.position.set(sx * (0.21 * w + 0.062), 1.38, 0); body.add(p); P(G(0.115, 0.3, 0.125), mTop, 0, -0.14, 0, p); P(G(0.095, 0.28, 0.1), shortSl ? mSkin : mTop, 0, -0.43, 0, p); P(G(0.085, 0.09, 0.09), mSkin, 0, -0.61, 0, p); return p; };
  ch.aL = arm(-1); ch.aR = arm(1);
  if (!sh) {
    if (look.ex === 'backpack') P(G(0.38, 0.42, 0.3), mk(look.acc === 'helmet' ? '#19c2b0' : '#a85a2a', 1), 0, 1.16, -0.28);
    if (look.ex === 'guitar') { const gt = P(G(0.24, 0.8, 0.1), mk('#2a1c14'), 0.04, 1.15, -0.19); gt.rotation.z = 0.45; }
    if (look.ex === 'knife') P(G(0.02, 0.2, 0.035), mk('#c8ccd0', 1), 0, -0.74, 0.03, ch.aR);
    if (look.ex === 'phone') { P(G(0.07, 0.13, 0.012), mk('#0c0c0e', 1), 0, -0.7, 0.03, ch.aR); ch.phone = 1; }
    if (look.ts === 'apron') { /* compañero de cocina */ }
    ch.bag = P(G(0.18, 0.2, 0.1), mk('#e8e6dc', 1), 0, -0.78, 0, ch.aL); ch.bag.visible = false;
  }
  const hm = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.85 * s, 0.5), M.inv); hm.position.y = 0.92 * s; hm.visible = false; hm.userData.key = key || null; g.add(hm); ch.hit = hm;
  if (key) rayTargets.push(hm);
  scene.add(g); return ch;
}
function killChar(ch) {
  const i = rayTargets.indexOf(ch.hit); if (i >= 0) rayTargets.splice(i, 1);
  scene.remove(ch.g); for (const m of ch.mats) m.dispose(); for (const t of ch.texs) t.dispose();
}
// mode: 0 normal · 1 ataca · 2 atraca · 3 muerto · 4 se deshace
function animChar(ch, dt, mode, drunk, time) {
  const spd = ch.spd, sw = Math.min(1, spd / 1.3) * 0.7, glide = ch.an === 1 && mode !== 1;
  ch.ph += dt * (2.2 + spd * 4.2);
  const s = Math.sin(ch.ph), legSw = glide ? 0 : sw;
  ch.lL.rotation.x = s * legSw; ch.lR.rotation.x = -s * legSw;
  let aL = -s * sw * 0.6, aR = s * sw * 0.6;
  ch.body.position.y = glide ? 0 : Math.abs(Math.cos(ch.ph)) * 0.03 * sw;
  ch.body.rotation.z = Math.sin(time * 0.9 + ch.seed) * (drunk ? 0.09 : 0.012); ch.body.rotation.x = drunk ? Math.sin(time * 0.6 + ch.seed) * 0.05 : 0;
  ch.head.rotation.set(0, 0, 0);
  if (ch.sayT > 0) { ch.sayT -= dt; ch.head.rotation.x = Math.sin(time * 15) * 0.06; }
  if (ch.an === 1) { ch.head.rotation.z = 0.28; if (mode === 1) { ch.head.rotation.z = Math.sin(time * 31) * 0.3; ch.head.rotation.x = -0.3; } }
  if (ch.an === 2) { aL = aR = 0.05; ch.body.rotation.z = Math.sin(time * 0.7) * 0.03; }
  if (mode === 1) { aL = aR = -1.45 + Math.sin(time * 22) * 0.12; ch.body.rotation.x = 0.28; }
  if (mode === 2) aR = -1.25 + Math.sin(time * 9) * 0.06;
  if (ch.phone) aR = -1.9;
  ch.aL.rotation.x = aL; ch.aR.rotation.x = aR;
  const dead = mode === 3 ? 1 : 0; ch.dead = lerp(ch.dead, dead, Math.min(1, dt * 6));
  ch.g.rotation.x = -ch.dead * PI / 2; ch.g.position.y = ch.dead * 0.14;
  if (mode === 4) { ch.g.scale.y = Math.max(0.02, ch.g.scale.y - dt * 1.6); ch.g.scale.x = ch.g.scale.z = ch.g.scale.x + dt * 0.5; }
  if (ch.headMat && ch.an !== 1) { ch.bl -= dt; if (ch.bl <= 0) { ch.blT = 0.13; ch.bl = 1.6 + Math.random() * 3.6; } if (ch.blT > 0) { ch.blT -= dt; ch.headMat.map = ch.fClosed; } else ch.headMat.map = ch.fOpen; if (mode === 3) ch.headMat.map = ch.fClosed; }
}

/* ================= SIMULACIÓN (la lleva el anfitrión) ================= */
const S_IN = 0, S_QUEUE = 1, S_GREET = 2, S_WAIT = 3, S_OUT = 4, S_FLEE = 5, S_DEAD = 6, S_ROB = 7, S_RUN = 8, S_STALK = 9, S_ATK = 10, S_DIS = 11;
let W = null, SCHED = [], spitWireT = 0;
const PP = {};   // pid -> {x,z,yaw,pitch,aim}

function spitWire() { return { c: '7'.repeat(NCELL), d: 'l'.repeat(NCELL), u: 16, q: 1, r: 0 }; }
function newWorld(n, prev) {
  const keep = prev && n > 1;
  const w = {
    v: NETV, hs: prev ? prev.hs : Date.now(), ph: 'play', why: 0, n, t: 0, cash: keep ? prev.cash : 0, rep: keep ? prev.rep : 60,
    s: { sv: 0, ls: 0, e: 0, tp: 0 }, pw: 1, fk: 0, sx: 0, sd: (Math.random() * 2e9) | 0, bo: 0, fl: 0,
    sp: [spitWire(), spitWire()], bin: [8, 8, 8], chop: { t: -1, n: 0 }, fry: { s: 0, t: 0, u: 0, q: 1 }, sh: [0, 0, 0], gr: 1, am: 2, shl: 6,
    bd: { s: 0, t: 0, o: 0 }, bt: 0, cu: [], pl: {}, ev: prev ? prev.ev : [], es: prev ? prev.es : 0, id: prev ? prev.id : 1, used: [], nx: 4,
  };
  if (prev) for (const k in prev.pl) w.pl[k] = { h: 0, hp: 3, ko: 0 };
  return w;
}
function hostStart(n) {
  W = newWorld(n, W);
  for (const S of SV) { S.lv.fill(7); S.dn.fill(0.75); S.pend.fill(0); S.dirty = true; S.cs = S.ds = ''; }
  SCHED = genSchedule(W.n, W.sd); ensurePlayer(NET.myId);
}
function ensurePlayer(pid) { if (W && !W.pl[pid]) W.pl[pid] = { h: 0, hp: 3, ko: 0 }; }
function genSchedule(n, seed) {
  const r = mulberry32(seed), S = [], H = h => h * HOUR_LEN;
  S.push({ t: H(1.5) + r() * 20, k: 'flick' });
  S.push({ t: H(2.5) + r() * 30, k: 'knockR' });
  S.push({ t: H(3.25) + r() * 20, k: 'black' });
  S.push({ t: H(4.55), k: 'hungry' });                  // 03:33
  S.push({ t: H(5.5) + r() * 25, k: 'knockF' });
  if (r() < 0.6 + 0.1 * n) S.push({ t: H(1 + r() * 4), k: 'rob' });
  for (let i = 1; i < n; i++) { S.push({ t: H(0.8 + r() * 5.4), k: 'hungry' }); if (i % 2 === 0) S.push({ t: H(1 + r() * 5), k: 'black' }); else S.push({ t: H(1 + r() * 5), k: 'knockF' }); }
  S.sort((a, b) => a.t - b.t); return S;
}
function ev(type, x, z, a) { W.ev.push([++W.es, type, r2(x || 0), r2(z || 0), a === undefined ? 0 : a]); if (W.ev.length > 10) W.ev.shift(); }
function say(c, key, idx) { c.l = key + ':' + (idx == null ? (Math.random() * 8 | 0) : idx); c.ln = (c.ln || 0) + 1; }
function lineOf(c) {
  if (!c.l) return '';
  const sp = c.l.split(':'), key = sp[0], idx = +sp[1] || 0;
  if (c.an === 1) { const A2 = ANOMX[LANG], arr = A2[key] || A2.w; return arr[idx % arr.length]; }
  if (!ARCH[c.a]) return '';
  if (key === 'o') { const pre = aLines(c.a, 'pre'), post = aLines(c.a, 'post'); return (pre[idx % pre.length] + ' ' + orderPhrase(genOrder(c.a, c.s)) + '. ' + post[(idx >> 1) % post.length]).trim(); }
  const arr = aLines(c.a, key); return arr[idx % arr.length];
}
function spitRot(i, t) { return t * 0.6 + i * 1.3; }

/* ---------- clientes ---------- */
function assignSpot(c) {
  const used = {}; for (const o of W.cu) if (o !== c && o.sl >= 0) used[o.sl] = 1;
  for (let k = 0; k < 3; k++) if (!used[k]) { c.sl = k; c.qi = -1; return; }
  c.sl = -1; c.qi = W.cu.filter(o => o !== c && o.qi >= 0).length;
}
function spawn(a, an, opt) {
  const sd = Math.random() < 0.5 ? -1 : 1;
  const c = { i: W.id++, a, s: (Math.random() * 1e6) | 0, x: sd * 11, z: 6.4 + Math.random() * 0.5, y: -sd * PI / 2, st: S_IN, p: 1, g: [], l: '', ln: 0, sl: -1, qi: -1, an: an || 0, hp: an === 1 ? 6 : 2, t: 0, wp: 0, sc: 0, f: 0, b: 0, sd };
  W.cu.push(c);
  if (opt) Object.assign(c, opt); else assignSpot(c);
  return c;
}
function pickArch() {
  const hr = W.t / HOUR_LEN, ok = (Ar, i) => Ar.sp !== 'robber' && hr >= Ar.hrs[0] && hr <= Ar.hrs[1];
  let cand = []; ARCH.forEach((Ar, i) => { if (ok(Ar, i) && W.used.indexOf(i) < 0 && !W.cu.some(c => c.a === i)) cand.push(i); });
  if (!cand.length) { W.used.length = 0; ARCH.forEach((Ar, i) => { if (ok(Ar, i) && !W.cu.some(c => c.a === i)) cand.push(i); }); }
  if (!cand.length) return -1;
  const a = cand[Math.random() * cand.length | 0]; W.used.push(a); return a;
}
function moveTo(c, tx, tz, sp, dt) {
  const dx = tx - c.x, dz = tz - c.z, d = Math.hypot(dx, dz);
  if (d < 0.06) return true;
  const s = Math.min(d, sp * dt); c.x += dx / d * s; c.z += dz / d * s; c.y = Math.atan2(dx, dz);
  return d - s < 0.06;
}
function patTotal(c) { const n = genOrder(c.a, c.s).length; return (58 + 20 * Math.max(0, n - 1)) * ARCH[c.a].pat * (W.n === 1 ? 1.15 : Math.max(0.75, 1.05 - 0.05 * W.n)); }
function leave(c, happy) { c.st = S_OUT; c.b = happy ? 1 : 0; c.sl = -1; c.qi = -1; c.wp = 0; c.t = 0; }
function flee(c) { c.st = S_FLEE; c.sl = -1; c.qi = -1; c.wp = c.z > 4.6 ? 2 : 0; c.t = 0; }
function panic() {
  for (const c of W.cu) {
    if (c.an || c.st === S_DEAD || c.st === S_FLEE || c.st === S_ROB) continue;
    if (c.st === S_OUT && c.z > 5) continue;
    if (c.st <= S_WAIT) W.s.ls++;
    say(c, 'flee'); flee(c);
  }
}
function angryLeave(c) {
  const Ar = ARCH[c.a]; say(c, 'x');
  if (Ar.sp !== 'beggar') { W.rep = clamp(W.rep - (Ar.sp === 'influencer' ? 12 : 6), 0, 100); W.s.ls++; ev('bad', c.x, c.z); ev('msg', 0, 0, 'lost'); }
  leave(c, 0);
}
function pay(c, ord, noTip) {
  const Ar = ARCH[c.a], price = orderPrice(ord), avg = ord.length ? c.sc / ord.length : 1;
  const amt = avg < 0.4 ? Math.round(price * 50) / 100 : price;
  let tip = 0; if (!noTip && avg > 0.75 && Ar.tip > 0) tip = Math.round(price * Ar.tip * avg * (0.4 + 0.6 * clamp(c.p, 0, 1)) * 2) / 2;
  if (c.hm && !noTip && avg > 0.6) tip += 1;
  W.cash = r2(W.cash + amt + tip); W.s.e = r2(W.s.e + amt); W.s.tp = r2(W.s.tp + tip); W.s.sv++;
  ev('cash', c.x, c.z, r2(amt)); if (tip > 0) ev('tip', c.x, c.z, tip);
  let dr = avg > 0.85 ? 3 : avg > 0.6 ? 1 : avg > 0.4 ? -2 : -5; if (Ar.sp === 'influencer') dr *= 3;
  W.rep = clamp(W.rep + dr, 0, 100);
  say(c, avg > 0.6 ? (c.hm ? 'hm' : 'ok') : 'bad'); leave(c, avg > 0.6);
}
function finishOrder(c, ord) {
  const Ar = ARCH[c.a];
  if (Ar.sp === 'beggar') { W.rep = clamp(W.rep + 6, 0, 100); say(c, 'ok'); ev('msg', 0, 0, 'karma'); leave(c, 1); return; }
  if (Ar.sp === 'sinpa') { say(c, 'run'); c.st = S_RUN; c.t = 0; c.sl = -1; c.wp = 0; return; }
  pay(c, ord);
}
function deliver(c, pid) {
  const P = W.pl[pid], H = P.h, Ar = ARCH[c.a], ord = genOrder(c.a, c.s);
  let idx = -1, score = 1, line = null;
  if (Ar.sp === 'beggar') idx = 0;
  else if (H.k === 'dr') idx = ord.findIndex((o, i) => !c.g[i] && o.k === 'dr' && o.t === H.t);
  else if (H.k === 'fr') { idx = ord.findIndex((o, i) => !c.g[i] && o.k === 'fr'); score = H.q; if (H.q < 0.4) line = 'bad'; }
  else if (H.k === 'kb') {
    const mt = H.m[0] && H.m[1] ? 2 : H.m[0] ? 0 : H.m[1] ? 1 : -1;
    idx = ord.findIndex((o, i) => !c.g[i] && o.k === 'kb' && o.b === H.b && o.m === mt);
    if (idx >= 0) {
      const o = ord[idx], dv = bits(o.v ^ H.v), ds = bits(o.s ^ H.s);
      if (Ar.sp === 'picky' && (H.v & ~o.v)) idx = -1;
      else {
        score = H.q - dv * 0.2 - ds * 0.2;
        if (H.q < 0.5 || dv + ds >= 2) line = 'bad';
        if (!H.w) { score -= 0.25; line = 'unw'; }
        if (H.b === 2 && !H.f) { score -= 0.3; line = 'nofr'; }
        if (H.r > 0.4) { score -= 0.5; line = 'raw'; W.rep = clamp(W.rep - 3, 0, 100); }
        score = clamp(score, 0, 1);
      }
    }
  }
  if (idx < 0) { say(c, 'no'); ev('bad', c.x, c.z); return; }
  c.g[idx] = 1; c.sc = r2(c.sc + score); if (H.hm) c.hm = 1; P.h = 0; ev('ok', c.x, c.z);
  if (c.g.every(v => v)) finishOrder(c, ord); else if (line) say(c, line);
}
function nearestPlayer(x, z) {
  let best = null, bd = 1e9;
  for (const pid in W.pl) { const p = PP[pid]; if (!p || W.pl[pid].ko > 0) continue; const d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; best = pid; } }
  return best ? { pid: best, d: bd, x: PP[best].x, z: PP[best].z } : null;
}
function gunAimAt(id) { for (const pid in W.pl) { const h = W.pl[pid].h; if (h && h.k === 'gun' && PP[pid] && PP[pid].aim === id) return true; } return false; }
function anyGun() { for (const pid in W.pl) { const h = W.pl[pid].h; if (h && h.k === 'gun') return true; } return false; }
function hurt(pid) {
  const P = W.pl[pid]; if (!P || P.ko > 0) return false;
  P.hp--; ev('hurt', 0, 0, pid);
  if (P.hp <= 0) { P.hp = 0; P.ko = 7; W.cash = Math.max(0, r2(W.cash - 15)); if (P.h && P.h.k === 'gun') W.gr = 1; P.h = 0; return true; }
  return false;
}
function startAtk(c) { c.st = S_ATK; c.t = 0; c.sc = 0.5; c.sl = -1; c.qi = -1; say(c, 'atk'); ev('scream', c.x, c.z); panic(); }
function arrive(c) {
  if (c.sl < 0) { c.st = S_QUEUE; c.t = 0; return; }
  if (!c.an && ARCH[c.a].sp === 'robber') { c.st = S_ROB; c.t = 0; c.sc = 0; say(c, 'rob'); ev('bad', c.x, c.z); panic(); return; }
  c.st = S_GREET; c.t = 0; say(c, 'g');
}
function updShadow(c, dt) {
  if (c.st === S_DIS) { if (c.t > 1) c.rm = 1; return; }
  if (W.pw) { c.st = S_DIS; c.t = 0; ev('scream', c.x, c.z); return; }
  c.sc -= dt; if (c.sc > 0) return;
  const n = nearestPlayer(c.x, c.z); if (!n) return;
  moveTo(c, n.x, n.z, 0.85 + 0.06 * W.n, dt);
  if (n.d < 0.7) { hurt(n.pid); ev('scream', c.x, c.z); c.x = -2.6; c.z = 4.3; c.sc = 5; }
}
function updCustomer(c, dt) {
  c.t += dt;
  if (c.an === 2) return updShadow(c, dt);
  const Ar = ARCH[c.a], OUT = [[-2.6, 4.4], [-2.6, 6.3], [c.sd * 11.5, 6.6]];
  switch (c.st) {
    case S_IN: {
      const tgt = c.sl >= 0 ? SLOTS[c.sl] : QUEUE[clamp(c.qi, 0, 2)], wp = c.wp < 2 ? DOOR_IN[c.wp] : tgt;
      const sp = c.an === 1 ? 1.1 : Ar.sp === 'drunk' ? 1.2 : Ar.sp === 'robber' ? 2.3 : 1.7;
      if (moveTo(c, wp[0], wp[1], sp, dt)) { if (c.wp < 2) { c.wp++; if (c.wp === 2) { ev('bell', -2.6, 4.8); if (c.an === 1) { W.fk = 3.5; ev('flick'); } } } else arrive(c); }
      break;
    }
    case S_QUEUE:
      c.y = angLerp(c.y, PI, Math.min(1, dt * 4));
      if (c.an === 1) { if (c.t > 13) startAtk(c); }
      else { c.p -= dt / patTotal(c) * 0.4; if (c.p <= 0) angryLeave(c); }
      break;
    case S_GREET:
      c.y = angLerp(c.y, PI, Math.min(1, dt * 5));
      if (c.t > 1.9) {
        if (c.an === 1) { say(c, 'o'); c.st = S_STALK; c.t = 0; c.f = 0; ev('whisper', c.x, c.z); }
        else { say(c, 'o'); c.st = S_WAIT; c.t = 0; c.g = genOrder(c.a, c.s).map(() => 0); }
      }
      break;
    case S_WAIT:
      c.y = angLerp(c.y, PI, Math.min(1, dt * 5));
      c.p -= dt / patTotal(c) * (W.pw ? 1 : 1.4);
      if (!W.pw && !(c.f & 8)) { c.f |= 8; say(c, 'dark'); }
      if (c.p < 0.5 && !(c.f & 2)) { c.f |= 2; say(c, 'w'); }
      if (c.p < 0.22 && !(c.f & 4)) { c.f |= 4; say(c, 'w'); }
      if (Ar.sp === 'cop' && !(c.f & 16) && anyGun()) { c.f |= 16; say(c, 'gun'); }
      if (c.p <= 0) angryLeave(c);
      break;
    case S_OUT: case S_FLEE: case S_RUN: {
      const sp = c.st === S_OUT ? 1.7 : c.st === S_RUN ? 3.0 : 4.2, wp = OUT[c.wp];
      if (c.st === S_RUN && c.z < 9 && gunAimAt(c.i)) { say(c, 'caught'); pay(c, genOrder(c.a, c.s), true); break; }
      if (moveTo(c, wp[0], wp[1], sp, dt)) { c.wp++; if (c.wp >= 3) { c.rm = 1; if (c.st === S_RUN) { ev('msg', 0, 0, 'sinpa'); ev('bad', 0, 0); W.s.ls++; } } }
      break;
    }
    case S_DEAD: if (c.t > 30 && !c.cr) c.rm = 1; break;
    case S_ROB: {
      const n = nearestPlayer(c.x, c.z); if (n) c.y = angLerp(c.y, Math.atan2(n.x - c.x, n.z - c.z), Math.min(1, dt * 5));
      if (gunAimAt(c.i)) { c.sc += dt; if (c.sc > 0.8) { say(c, 'robflee'); ev('msg', 0, 0, 'robgone'); flee(c); } }
      else if (c.t > 11) { const amt = Math.min(W.cash, Math.round(15 + W.cash * 0.4)); W.cash = r2(W.cash - amt); ev('msg', 0, 0, 'robbed'); ev('bad', c.x, c.z); say(c, 'robwin'); flee(c); }
      break;
    }
    case S_STALK: {
      const n = nearestPlayer(c.x, c.z); if (n) c.y = angLerp(c.y, Math.atan2(n.x - c.x, n.z - c.z), Math.min(1, dt * 1.5));
      W.fk = Math.max(W.fk, 0.2);
      const k = Math.floor(c.t / 4.5); if (k > c.f) { c.f = k; say(c, 'w'); ev('whisper', c.x, c.z); }
      if (c.t > 16 + (c.s % 5)) startAtk(c);
      break;
    }
    case S_ATK: {
      const n = nearestPlayer(c.x, c.z); W.fk = Math.max(W.fk, 0.3);
      if (!n) { c.st = S_DIS; c.t = 0; break; }
      c.sc -= dt;
      if (c.sc <= 0) moveTo(c, n.x, n.z, 2.45 + 0.1 * W.n, dt); else c.y = Math.atan2(n.x - c.x, n.z - c.z);
      if (n.d < 0.75 && c.sc <= 0) { const ko = hurt(n.pid); c.sc = 1.3; const dx = c.x - n.x, dz = c.z - n.z, d = Math.max(0.1, Math.hypot(dx, dz)); c.x += dx / d * 0.9; c.z += dz / d * 0.9; if (ko) { c.st = S_DIS; c.t = 0; ev('scream', c.x, c.z); } }
      break;
    }
    case S_DIS: if (c.t > 1.2) c.rm = 1; break;
  }
}

/* ---------- acciones de los jugadores ---------- */
function fryState(t) { const k = t < 9 ? 0 : t < 19 ? 1 : t < 27 ? 2 : 3; return [LX[LANG].fs[k], [0.3, 1, 0.6, 0.15][k]]; }
function useLogic(pid, key, doIt) {
  if (!W) return null;
  const P = W.pl[pid]; if (!P || P.ko > 0) return null;
  const H = P.h, n = +key.slice(2), X = LX[LANG];
  const R = (t, ok, fn, loc) => { if (doIt && ok && fn) fn(); return { t, ok: !!ok, loc: loc || null }; };
  const openKb = H && H.k === 'kb' && !H.w;
  if (key === 'foil') {
    if (!openKb) return R(T('u_foil'), false);
    if (H.m[0] + H.m[1] === 0) return R(T('u_foil_nomeat'), false);
    return R(T(H.b === 2 ? 'u_closebox' : 'u_wrap'), true, () => { H.w = 1; });
  }
  if (key === 'gun') {
    if (!H && W.gr) return R(T('u_gun_take'), true, () => { P.h = { k: 'gun' }; W.gr = 0; });
    if (H && H.k === 'gun') return R(T('u_gun_hang'), true, () => { P.h = 0; W.gr = 1; });
    return R(T(W.gr ? 'u_gun_busy' : 'u_gun_gone'), false);
  }
  if (key === 'butcher') {
    const B = W.bt;
    if (H && H.k === 'body') { if (B) return R(T('u_table_busy'), false); return R(T('u_table_put'), true, () => { W.bt = { a: H.a, s: H.s, n: 0 }; P.h = 0; }); }
    if (!H && B) return R(T('u_table_cut', B.n), true, () => { B.n++; if (B.n >= 8) { W.bt = 0; P.h = { k: 'cone' }; } });
    return R(T(B ? 'u_hands' : 'u_table_idle'), false);
  }
  if (key === 'trash') { if (H && H.k !== 'gun' && H.k !== 'body') return R(T('u_trash', itemName(H)), true, () => { P.h = 0; }); return R(T('u_bin'), false); }
  if (key === 'fz') {
    const F = W.fry;
    if (F.s === 0) { if (F.u >= 4) return R(T('u_fry_full'), false); return R(T('u_fry_in'), true, () => { F.s = 1; F.t = 0; }); }
    const st = fryState(F.t); return R(T('u_fry_out', st[0]), true, () => { F.q = r2((F.q * F.u + st[1] * 3) / (F.u + 3)); F.u = Math.min(4, F.u + 3); F.s = 0; F.t = 0; });
  }
  if (key === 'ft') {
    const F = W.fry;
    if (F.u <= 0) return R(T('u_ft_none'), false);
    if (!H) return R(T('u_ft_take'), true, () => { P.h = { k: 'fr', q: F.q }; F.u--; });
    if (openKb && H.b === 2 && !H.f) return R(T('u_ft_box'), true, () => { H.f = 1; H.q = r2(H.q * (0.5 + 0.5 * F.q)); F.u--; });
    return R(T('u_ft_n', F.u), false);
  }
  if (key === 'chop') {
    const C = W.chop;
    if (H && H.k === 'vg' && C.t < 0) return R(T('u_chop_put', itemName(H)), true, () => { C.t = H.t; C.n = 0; P.h = 0; });
    if (!H && C.t >= 0) return R(T('u_chop', X.veg[C.t], C.n), true, () => { C.n++; if (C.n >= 6) { W.bin[C.t] = Math.min(16, W.bin[C.t] + 8); C.t = -1; C.n = 0; ev('msg', 0, 0, 'binfull'); } });
    return R(T(C.t >= 0 ? 'u_hands' : 'u_chop_idle'), false);
  }
  if (key === 'fuse') { if (!W.pw) return R(T('u_fuse'), true, () => { W.pw = 1; ev('pwr1', 0.6, -5.3); ev('msg', 0, 0, 'power'); }); return R(T('u_fusebox'), false); }
  if (key === 'peep') return R(T('u_peep'), true, null, 'peep');
  if (key === 'rules') return R(T('u_rules'), true, null, 'rules');
  if (key === 'bdoor') {
    const B = W.bd; if (!B.s) return R(T('u_bdoor_closed'), false);
    return R(T('u_bdoor_open'), true, () => {
      ev('door', 3.05, -7.4); B.o = 2.5;
      if (B.s === 1) { for (let i = 0; i < 3; i++) W.bin[i] = Math.min(16, W.bin[i] + 8); W.shl += 4; W.rep = clamp(W.rep + 2, 0, 100); ev('msg', 0, 0, 'deliv'); }
      else { const pool = W.used.filter(a => !ARCH[a].sp); const a = pool.length ? pool[Math.random() * pool.length | 0] : 2; const c = spawn(a, 1, { x: 3.05, z: -7.0, y: 0, st: S_ATK, sc: 0.4 }); say(c, 'atk'); ev('scream', c.x, c.z); }
      B.s = 0; B.t = 0;
    });
  }
  const kind = key.slice(0, 2);
  if (kind === 'sp' && H && H.k === 'cone') return R(T('u_cone_mount', X.meat[n]), true, () => { const S = SV[n]; S.lv.fill(7); S.dn.fill(0.12); S.pend.fill(0); S.dirty = true; W.sp[n].h = 1; encodeSpit(n); P.h = 0; });
  if (kind === 'sp') return H ? R(T('u_hands'), false) : R(T('u_carve', X.meat[n]), true, null, 'cut');
  if (kind === 'tr') {
    const Tr = W.sp[n];
    if (!openKb) return R(T('u_tray_n', X.meat[n], Math.floor(Tr.u / 8)), false);
    if (Tr.u < 8) return R(T('u_tray_low', X.meat[n]), false);
    if (H.m[0] + H.m[1] >= 3) return R(T('u_tray_full'), false);
    return R(T('u_tray_add', X.meat[n]) + (Tr.r > 0.4 ? T('u_raw') : ''), true, () => { const k = H.m[0] + H.m[1]; H.q = r2((H.q * k + Tr.q) / (k + 1)); H.r = r2(Math.max(H.r, Tr.r)); H.m[n]++; if (Tr.h) H.hm = 1; Tr.u -= 8; if (Tr.u <= 0) { Tr.u = 0; Tr.q = 1; Tr.r = 0; Tr.h = 0; } });
  }
  if (kind === 'bn') {
    if (!openKb) return R(X.veg[n] + ': ' + W.bin[n], false);
    if (H.v >> n & 1) return R(T('u_has', X.veg[n]), false);
    if (W.bin[n] <= 0) return R(T('u_out', X.veg[n]), false);
    return R(T('u_add', X.veg[n]), true, () => { H.v |= 1 << n; W.bin[n]--; });
  }
  if (kind === 'sa') {
    if (!openKb) return R(X.sauce[n], false);
    if (H.s >> n & 1) return R(T('u_has', X.sauce[n]), false);
    return R(T('u_pour', X.sauce[n]), true, () => { H.s |= 1 << n; });
  }
  if (kind === 'bs') { if (H) return R(T('u_busy', X.base[n]), false); return R(T('u_base' + n), true, () => { P.h = { k: 'kb', b: n, m: [0, 0], q: 1, r: 0, v: 0, s: 0, f: 0, w: 0 }; }); }
  if (kind === 'sh') {
    const cur = W.sh[n];
    if (H && H.k !== 'gun' && H.k !== 'body' && !cur) return R(T('u_pass_put', itemName(H)), true, () => { W.sh[n] = H; P.h = 0; });
    if (!H && cur) return R(T('u_take', itemName(cur)), true, () => { P.h = cur; W.sh[n] = 0; });
    return R(T(cur ? 'u_pass_full' : 'u_pass'), false);
  }
  if (kind === 'dr') { if (H) return R(T('u_busy', X.drink[n]), false); return R(T('u_drink', X.drPh[n]), true, () => { P.h = { k: 'dr', t: n }; }); }
  if (kind === 'vc') { if (H) return R(T('u_busy', X.veg[n]), false); return R(T('u_veg', X.veg[n]), true, () => { P.h = { k: 'vg', t: n }; }); }
  if (kind === 'cu') {
    const c = W.cu.find(q => q.i === n); if (!c || c.an === 2) return null;
    const nm = aName(c.a);
    if (c.an === 1) { if (H && H.k !== 'gun' && (c.st === S_STALK || c.st === S_GREET)) return R(T('u_give', itemName(H), nm), true, () => { say(c, 'no'); }); return R(nm, false); }
    if (c.st === S_DEAD) return H ? R(T('u_drag'), false) : R(T('u_drag'), true, () => { P.h = { k: 'body', a: c.a, s: c.s, cr: c.cr | 0 }; c.rm = 1; });
    if (c.st !== S_WAIT) return R(nm + ' · ' + aRole(c.a), false);
    if (!H || H.k === 'gun' || H.k === 'vg' || H.k === 'body' || H.k === 'cone') return R(T('u_wait', nm), false);
    return R(T('u_give', itemName(H), nm), true, () => deliver(c, pid));
  }
  return null;
}
function doCut(pid, i, cells) {
  if (i !== 0 && i !== 1 || !Array.isArray(cells)) return;
  const S = SV[i], T = W.sp[i]; let any = false;
  for (const c of cells) {
    if (!(c >= 0 && c < NCELL) || S.lv[c] <= 0) continue;
    const d = S.dn[c]; if (pid !== NET.myId) onSlice(i, c, d);
    S.lv[c]--; S.dn[c] = 0.12 + Math.min(d, 1) * 0.1; any = true;
    const q = d < 0.55 ? (d / 0.55) * 0.5 : d <= 1.15 ? 1 : d <= 1.4 ? 0.6 : 0.2, raw = d < 0.35 ? 1 : 0;
    T.q = (T.q * T.u + q) / (T.u + 1); T.r = (T.r * T.u + raw) / (T.u + 1); T.u = Math.min(64, T.u + 1); if (T.h === undefined) T.h = 0; if (W.sp[i].h) T.h = 1;
  }
  if (any) { S.dirty = true; encodeSpit(i); if (pid !== NET.myId) ev('cut', SPX[i], SPZ, pid); }
}
function doShoot(pid, o, d) {
  const P = W.pl[pid]; if (!P || !P.h || P.h.k !== 'gun' || W.am <= 0 || !o || !d) return;
  W.am--; ev('shot', o[0], o[2], pid);
  const hits = {};
  for (let p = 0; p < 7; p++) {
    let dx = d[0] + (Math.random() - 0.5) * 0.11, dy = d[1] + (Math.random() - 0.5) * 0.11, dz = d[2] + (Math.random() - 0.5) * 0.11;
    const L = Math.hypot(dx, dy, dz) || 1; dx /= L; dy /= L; dz /= L;
    const den = dx * dx + dz * dz; if (den < 1e-6) continue;
    let best = null, bt = 15;
    for (const c of W.cu) {
      if (c.st === S_DEAD || c.st === S_DIS) continue;
      const t = ((c.x - o[0]) * dx + (c.z - o[2]) * dz) / den; if (t < 0.15 || t > bt) continue;
      const px = o[0] + dx * t - c.x, pz = o[2] + dz * t - c.z; if (px * px + pz * pz > 0.115) continue;
      const y = o[1] + dy * t; if (y < 0 || y > (c.an === 2 ? 2.35 : 1.9)) continue;
      best = c; bt = t;
    }
    if (best) hits[best.i] = (hits[best.i] || 0) + 1;
  }
  let human = false;
  for (const id in hits) {
    const c = W.cu.find(q => q.i === +id), n = hits[id]; ev('blood', c.x, c.z);
    if (c.an === 2) { ev('scream', c.x, c.z); c.x = -2.6; c.z = 4.3; c.sc = 7; continue; }
    c.hp -= n;
    if (c.an === 1) { if (c.hp <= 0) { c.st = S_DIS; c.t = 0; c.sl = -1; c.qi = -1; ev('scream', c.x, c.z); ev('msg', 0, 0, 'killed'); } else if (c.st !== S_ATK) startAtk(c); continue; }
    if (ARCH[c.a].sp === 'robber') { if (c.hp <= 0) { c.st = S_DEAD; c.t = 0; c.sl = -1; ev('die', c.x, c.z); } else { say(c, 'robflee'); flee(c); } }
    else { c.st = S_DEAD; c.cr = 1; c.t = 0; c.sl = -1; c.qi = -1; ev('die', c.x, c.z); human = true; }
  }
  panic();
  // Matar a un cliente solo acaba la partida si alguien lo ha visto (dentro del local o en la puerta).
  if (human) { if (W.cu.some(o => !o.an && o.st !== S_DEAD && ARCH[o.a].sp !== 'robber' && o.z < 5.6)) { W.ph = 'over'; W.why = 1; } else ev('msg', 0, 0, 'nowit'); }
}
function applyAction(pid, a) {
  if (!W) return;
  const k = a[1];
  if (k === 'next') { if (W.ph === 'end') hostStart(W.n + 1); return; }
  if (k === 'restart') { if (W.ph === 'over') hostStart(1); return; }
  if (W.ph !== 'play') return;
  if (k === 'use') useLogic(pid, String(a[2]), true);
  else if (k === 'cut') doCut(pid, a[2], a[3]);
  else if (k === 'shoot') doShoot(pid, a[2], a[3]);
  else if (k === 'dropbody') { const P = W.pl[pid], p = PP[pid]; if (P && P.h && P.h.k === 'body' && p) { W.cu.push({ i: W.id++, a: P.h.a, s: P.h.s, x: r2(p.x), z: r2(p.z), y: 0, st: S_DEAD, p: 0, g: [], l: '', ln: 0, sl: -1, qi: -1, an: 0, hp: 0, t: 0, wp: 2, sc: 0, f: 0, b: 0, sd: 1, cr: P.h.cr | 0 }); P.h = 0; } }
  else if (k === 'reload') { const P = W.pl[pid]; if (P && P.h && P.h.k === 'gun' && W.am < 2 && W.shl > 0) { const n = Math.min(2 - W.am, W.shl); W.am += n; W.shl -= n; } }
}

/* ---------- asadores ---------- */
function encodeSpit(i) {
  const S = SV[i]; let c = '', d = '';
  for (let k = 0; k < NCELL; k++) { c += S.lv[k]; d += String.fromCharCode(97 + Math.round(clamp(S.dn[k], 0, 1.6) * 15)); }
  if (c !== W.sp[i].c || d !== W.sp[i].d) { W.sp[i].c = c; W.sp[i].d = d; S.dirty = true; }
}
function decodeSpit(i, time, force) {
  const S = SV[i], w = W.sp[i]; if (!force && S.cs === w.c && S.ds === w.d) return;
  for (let k = 0; k < NCELL; k++) {
    if (!force && S.pend[k] > 0 && time - S.pend[k] < 0.8) continue;
    const lv = w.c.charCodeAt(k) - 48; if (!force && lv < S.lv[k]) onSlice(i, k, S.dn[k]);
    S.lv[k] = lv; S.dn[k] = (w.d.charCodeAt(k) - 97) / 15;
  }
  S.cs = w.c; S.ds = w.d; S.dirty = true;
}
function simSpits(dt) {
  const st = 2 * PI / SEG;
  for (let i = 0; i < 2; i++) {
    const S = SV[i], rot = spitRot(i, W.t);
    for (let j = 0; j < SEG; j++) { const f = -Math.cos((j + 0.5) * st + rot); if (f <= 0) continue; for (let b = 0; b < BANDS; b++) { const c = b * SEG + j, d = S.dn[c]; S.dn[c] = Math.min(1.6, d + (d < 0.8 ? 0.085 : 0.006) * f * dt); } }
  }
  spitWireT -= dt; if (spitWireT <= 0) { spitWireT = 0.25; encodeSpit(0); encodeSpit(1); }
}

/* ---------- bucle del anfitrión ---------- */
function fire(k) {
  if (k === 'flick') { W.fk = 2.2; ev('flick'); ev('whisper', 0, 4); }
  else if (k === 'black') { if (W.pw) { W.pw = 0; W.bo = 0; ev('pwr0'); ev('msg', 0, 0, 'blackout'); } }
  else if (k === 'hungry') { const pool = W.used.filter(a => !ARCH[a].sp && !W.cu.some(c => c.a === a)); const a = pool.length ? pool[Math.random() * pool.length | 0] : 2; spawn(a, 1); }
  else if (k === 'rob') { if (!W.cu.some(c => !c.an && ARCH[c.a].sp === 'cop' && c.st < S_OUT)) spawn(ARCH.findIndex(x => x.sp === 'robber'), 0); }
  else if (k === 'knockR' || k === 'knockF') { if (!W.bd.s) { W.bd.s = k === 'knockR' ? 1 : 2; W.bd.t = 0; W.bd.k = -1; } }
}
function simulate(dt) {
  if (!W || W.ph !== 'play') return;
  W.t += dt; if (W.fk > 0) W.fk = Math.max(0, W.fk - dt);
  const np = Object.keys(W.pl).length;
  for (const pid in W.pl) { const P = W.pl[pid]; if (P.ko > 0) { P.ko -= dt; if (P.ko <= 0) { P.ko = 0; P.hp = 3; } } }
  while (W.sx < SCHED.length && W.t >= SCHED[W.sx].t) { fire(SCHED[W.sx].k); W.sx++; }
  // clientes nuevos
  if (W.t >= W.nx && W.t < NIGHT_LEN - 14) {
    const humans = W.cu.filter(c => !c.an && c.st <= S_WAIT).length;
    if (humans < 5) { const a = pickArch(); if (a >= 0) spawn(a, 0); }
    const hr = W.t / HOUR_LEN, base = Math.max(11, 25 - W.n * 2);
    W.nx = W.t + base * (hr > 2.6 && hr < 5.6 ? 0.8 : 1) * (np > 1 ? 0.68 : 1) * (0.75 + Math.random() * 0.5);
  }
  // apagón
  if (!W.pw) { W.bo += dt; if (W.bo > 6 && !W.cu.some(c => c.an === 2)) { W.cu.push({ i: W.id++, a: -1, s: 1, x: -2.6, z: 4.3, y: PI, st: S_ATK, p: 1, g: [], l: '', ln: 0, sl: -1, qi: -1, an: 2, hp: 99, t: 0, wp: 0, sc: 2, f: 0, b: 0, sd: 1 }); ev('whisper', -2.6, 4.3); } }
  // puerta trasera
  const B = W.bd;
  if (B.s) { B.t += dt; const k = Math.floor(B.t / 3.4); if (k !== B.k) { B.k = k; ev(B.s === 1 ? 'knock' : 'knockf', 3.05, -7.4); } if (B.t > 25) { ev('msg', 0, 0, B.s === 1 ? 'nodeliv' : 'gone'); B.s = 0; } }
  if (B.o > 0) B.o = Math.max(0, B.o - dt);
  simSpits(dt);
  if (W.fry.s === 1) W.fry.t += dt;
  for (const c of W.cu) updCustomer(c, dt);
  if (W.cu.some(c => c.rm)) W.cu = W.cu.filter(c => !c.rm);
  // la cola avanza
  const used = {}; for (const c of W.cu) if (c.sl >= 0) used[c.sl] = 1;
  for (let k = 0; k < 3; k++) {
    if (used[k]) continue;
    let first = null; for (const c of W.cu) if (c.qi >= 0 && (c.st === S_IN || c.st === S_QUEUE) && (!first || c.qi < first.qi)) first = c;
    if (!first) break;
    first.sl = k; first.qi = -1; if (first.st === S_QUEUE) { first.st = S_IN; first.wp = 2; first.t = 0; }
    for (const c of W.cu) if (c.qi > 0) c.qi--;
  }
  // fin de la noche
  if (W.t >= NIGHT_LEN) {
    if (!W.fl) { W.fl = 1; ev('msg', 0, 0, 'last'); }
    const left = W.cu.some(c => !c.an && c.st <= S_WAIT);
    if (!left || W.t > NIGHT_LEN + 40) { W.cu = []; W.pw = 1; W.bd.s = 0; W.ph = 'end'; }
  }
  // Un cuerpo a la vista en la zona de clientes (en el suelo o a cuestas) y alguien que entra: se acabó.
  if (W.ph === 'play') {
    let body = W.cu.some(c => c.st === S_DEAD && c.cr && c.z > 1.3);
    if (!body) for (const pid in W.pl) { const h = W.pl[pid].h; if (h && h.k === 'body' && h.cr && PP[pid] && PP[pid].z > 1.3) body = true; }
    if (body && W.cu.some(o => !o.an && o.st <= S_WAIT && o.wp >= 2 && o.z < 4.7 && ARCH[o.a].sp !== 'robber')) { W.ph = 'over'; W.why = 2; }
  }
  if (W.rep <= 0 && W.ph === 'play') { W.ph = 'over'; W.why = 0; }
}

/* ================= RED: cooperativo por presencia ================= */
const NETV = 4;   // versión del protocolo: todos tienen que jugar con la misma
const NET = { room: null, myId: 'solo', isHost: true, joined: false, acts: [], seq: 0, lastSeq: {}, lastHost: null, hostGone: 0, sendT: 0, others: [], remote: null, count: 1, evInit: false, code: '', badVer: false, lostSaid: false };

/* Fuera de Claude (GitHub) la sala va por PeerJS, de navegador a navegador y sin cuentas.
   Quien crea la sala hace de centro: recibe la presencia de cada uno y la reparte al resto. */
function p2pAvailable() { return !(window.claude && window.claude.use) && typeof window.Peer === 'function' && !!window.RTCPeerConnection; }
function p2pOpen(code, asHub) {
  return new Promise((res, rej) => {
    const hubId = 'kebab-poniente-cimentacion-' + code, opts = window.KP_PEER_OPTS || undefined; let done = false;
    const peer = asHub ? new Peer(hubId, opts) : new Peer(opts);
    const me = { peer: '', isMe: true, sameTab: true, kind: 'viewer', presence: {} };
    const others = new Map(), conns = new Map(); let snap = [];
    const upd = () => { snap = me.peer ? [me].concat(Array.from(others.values())) : []; };
    const prune = () => { const now = Date.now(); let ch = false; for (const [id, o] of others) if (now - o.t > 5000) { others.delete(id); ch = true; if (asHub) sendAll({ t: 'x', id }); else if (id === hubId) { R.lost = true; others.clear(); break; } } if (ch) upd(); };
    const sendAll = (msg, except) => { for (const [id, c] of conns) if (id !== except && c.open) { try { c.send(msg); } catch (e) { } } };
    const R = {
      code, hub: asHub, lost: false, peers: () => { prune(); return snap; },
      presence: async patch => { const p = Object.assign({}, me.presence); for (const k in patch) { if (patch[k] === null) delete p[k]; else p[k] = patch[k]; } me.presence = p; sendAll({ t: 'p', id: me.peer, p }); },
      leave: () => { try { peer.destroy(); } catch (e) { } },
    };
    const wire = c => {
      c.on('open', () => {
        conns.set(c.peer, c);
        try { c.send({ t: 'p', id: me.peer, p: me.presence }); } catch (e) { }
        if (asHub) for (const [id, o] of others) if (id !== c.peer) { try { c.send({ t: 'p', id, p: o.presence }); } catch (e) { } }
        if (!asHub && !done) { done = true; res(R); }
      });
      c.on('data', d => {
        if (!d || typeof d !== 'object') return;
        if (d.t === 'p' && d.p && typeof d.p === 'object') {
          const id = asHub ? c.peer : String(d.id || c.peer); if (id === me.peer) return;
          others.set(id, { peer: id, isMe: false, sameTab: false, kind: 'viewer', presence: d.p, t: Date.now() }); upd();
          if (asHub) sendAll({ t: 'p', id, p: d.p }, c.peer);
        } else if (d.t === 'x' && !asHub) { others.delete(String(d.id)); upd(); }
      });
      const bye = () => { if (!conns.has(c.peer)) return; conns.delete(c.peer); if (asHub) { others.delete(c.peer); sendAll({ t: 'x', id: c.peer }); } else { others.clear(); R.lost = true; } upd(); };
      c.on('close', bye); c.on('error', bye);
    };
    peer.on('open', id => { me.peer = id; upd(); if (asHub) { peer.on('connection', wire); done = true; res(R); } else wire(peer.connect(hubId, { reliable: true })); });
    peer.on('disconnected', () => { try { if (!peer.destroyed) peer.reconnect(); } catch (e) { } });
    peer.on('error', e => { if (!done) { done = true; try { peer.destroy(); } catch (x) { } rej(e); } });
    setTimeout(() => { if (!done) { done = true; try { peer.destroy(); } catch (x) { } rej(new Error('timeout')); } }, 14000);
  });
}
async function netInit() {
  try { if (!window.claude || !window.claude.use) return; const room = await window.claude.use('room'); if (room) NET.room = room; } catch (e) { /* sin sala: partida en solitario */ }
}
function act() {
  const a = Array.prototype.slice.call(arguments);
  if (NET.isHost) { try { applyAction(NET.myId, [0].concat(a)); } catch (e) { console.error(e); } }
  else { NET.acts.push([++NET.seq].concat(a)); if (NET.acts.length > 8) NET.acts.shift(); NET.sendT = 0; }
}
function wireW() {
  let s = JSON.stringify(W, (k, v) => typeof v === 'number' && !Number.isInteger(v) ? Math.round(v * 100) / 100 : v);
  const o = JSON.parse(s); o.hb = NET.hb = (NET.hb | 0) + 1;   // latido: la presencia del anfitrión siempre cambia
  if (s.length > 3500) { o.ev = o.ev.slice(-3); o.used = []; }
  return o;
}
function adoptWorld() {
  NET.isHost = true; NET.lastHost = null;
  decodeSpit(0, 0, true); decodeSpit(1, 0, true);
  SCHED = genSchedule(W.n, W.sd);
  for (const p of NET.others) { const a = p.presence.a; let mx = 0; if (Array.isArray(a)) for (const x of a) mx = Math.max(mx, x[0] | 0); NET.lastSeq[p.peer] = mx; }
  ensurePlayer(NET.myId);
}
function netUpdate(dt, me) {
  PP[NET.myId] = { x: me.x, z: me.z, yaw: me.yaw, pitch: me.pitch, aim: me.aim };
  const room = NET.room; if (!room) return;
  let peers; try { peers = room.peers(); } catch (e) { return; }
  const mine = peers.find(p => p.isMe && p.sameTab);
  if (mine && mine.peer !== NET.myId) {
    const old = NET.myId; NET.myId = mine.peer;
    if (W && NET.isHost && W.pl[old]) { W.pl[NET.myId] = W.pl[old]; delete W.pl[old]; }
    PP[NET.myId] = PP[old]; delete PP[old];
  }
  const others = peers.filter(p => !(p.isMe && p.sameTab) && p.kind === 'viewer' && p.presence);
  NET.others = others; NET.count = others.filter(p => p.presence.p).length + 1;
  if (room.lost && !NET.lostSaid) { NET.lostSaid = true; toast(T('p2p_lost'), 'bad'); }
  const hosts = others.filter(p => p.presence.w && p.presence.w.ph && (p.presence.w.v === NETV || !(NET.badVer = true))).sort((a, b) => (a.presence.w.hs - b.presence.w.hs) || (a.peer < b.peer ? -1 : 1));
  let hp = hosts[0] || null, stale = null;
  if (hp && !NET.isHost) { if (hp.presence !== NET.lastHost) NET.hostT = 0; else { NET.hostT = (NET.hostT || 0) + dt; if (NET.hostT > 4) { stale = hp.peer; hp = null; } } }
  NET.remote = hp;
  if (NET.isHost && hp && (!W || !NET.joined || hp.presence.w.hs < W.hs || (hp.presence.w.hs === W.hs && hp.peer < NET.myId))) { NET.isHost = false; NET.lastHost = null; NET.evInit = false; }
  if (!NET.isHost) {
    if (hp) {
      NET.hostGone = 0;
      if (hp.presence !== NET.lastHost) { NET.lastHost = hp.presence; try { const nw = JSON.parse(JSON.stringify(hp.presence.w)); if (nw && nw.v !== NETV) NET.badVer = true; else if (nw && Array.isArray(nw.cu) && Array.isArray(nw.sp) && nw.pl && nw.fry && nw.bd && Array.isArray(nw.ev)) { nw.cu = nw.cu.filter(c => c && (c.an === 2 || ARCH[c.a])); if (!W || W.hs !== nw.hs) NET.acts = []; W = nw; } } catch (e) { } }
    } else {
      NET.hostGone += dt;
      if (NET.hostGone > 3.5) {
        const ids = others.filter(p => p.presence.p && p.peer !== stale).map(p => p.peer);
        if (!NET.joined || !W) { W = null; NET.isHost = true; }
        else if (ids.every(id => NET.myId < id)) adoptWorld();
        NET.hostGone = 0;
      }
    }
  }
  for (const p of others) { const pr = p.presence.p; if (pr) PP[p.peer] = { x: pr[0], z: pr[1], yaw: pr[2], pitch: pr[3], aim: pr[4] }; else delete PP[p.peer]; }
  if (NET.isHost && W) {
    const live = {}; live[NET.myId] = 1;
    for (const p of others) {
      if (!p.presence.p) continue;
      live[p.peer] = 1; ensurePlayer(p.peer);
      const a = p.presence.a;
      if (NET.lastSeq[p.peer] === undefined) NET.lastSeq[p.peer] = 0;
      if (Array.isArray(a) && p.presence.ah === W.hs) for (const x of a) if (x[0] > NET.lastSeq[p.peer]) { NET.lastSeq[p.peer] = x[0]; try { applyAction(p.peer, JSON.parse(JSON.stringify(x))); } catch (e) { console.error(e); } }
    }
    for (const pid in W.pl) if (!live[pid]) { if (W.pl[pid].h && W.pl[pid].h.k === 'gun') W.gr = 1; delete W.pl[pid]; delete PP[pid]; }
  }
  NET.sendT -= dt;
  if (NET.sendT <= 0) {
    NET.sendT = NET.joined ? 0.1 : 1;
    const pr = { p: NET.joined ? [r2(me.x), r2(me.z), r2(me.yaw), r2(me.pitch), me.aim | 0] : null, a: NET.isHost ? null : NET.acts, ah: W ? W.hs : 0, w: NET.isHost && W && NET.joined ? wireW() : null };
    try { const q = room.presence(pr); if (q && q.catch) q.catch(() => { }); } catch (e) { }
  }
}

/* ================= JUEGO: entrada, cámara, HUD, bucle ================= */
const $ = id => document.getElementById(id);
const me = { x: 1.6, z: -1.6, yaw: PI, pitch: 0, aim: 0, bob: 0, stepT: 0 };
const IN = { f: 0, s: 0, lx: 0, ly: 0, use: false, fire: false, held: false, reload: false, back: false, dev: 'kb', keys: {}, locked: false, noLock: false, drag: null, joy: null, look: null, padPrev: {} };
const cut = { on: false, i: 0, y: 1.9, press: false, last: 7, cam: 0 };
let overlay = 'menu', TIME = 0, Tsm = 0, lastEv = 0, lastT = 0, useCd = 0, reloadT = 0, shotCd = 0, hurtFlash = 0, flashT = 0, prevKo = 0, prevN = 0, prevPh = '', hudT = 0, vmKey = '', vmKick = 0, vmRecoil = 0, target = null, targetKey = null, started = false, toastQ = [];
let vm, vmItem, knife, PR = 0.28, noGL = false;
const chars = new Map(), rchars = new Map(), bubbles = new Map(), slices = [], bloods = [];
const _v = new THREE.Vector3(), _c0 = new THREE.Vector2(0, 0);

/* ---------- arranque ---------- */
async function boot() {
  LANG = pickLang(); document.documentElement.lang = LANG;
  for (const el of document.querySelectorAll('[data-t]')) el.textContent = T(el.dataset.t);
  try {
    await loadTextures();
    renderer = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: false, powerPreference: 'high-performance' });
  } catch (e) { $('menu-msg').textContent = T('nowebgl'); noGL = true; $('btn-start').disabled = true; if (window.__kpSay) window.__kpSay(String(e && e.message || e)); return; }
  renderer.setPixelRatio(1);
  camera = new THREE.PerspectiveCamera(66, 16 / 9, 0.05, 60); camera.rotation.order = 'YXZ';
  buildWorld(); scene.add(camera); raycaster = new THREE.Raycaster();
  vm = new THREE.Group(); camera.add(vm); vmItem = new THREE.Group(); vm.add(vmItem);
  knife = new THREE.Group(); knife.add(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.005), lam(null, 0xe4e8ec, { emissive: 0x3a3d40 }))); const ke = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.008, 0.007), bas(0xffffff)); ke.position.y = -0.03; knife.add(ke); const ka = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.5), lam(null, 0xc8906a)); ka.position.set(0.36, -0.03, 0.27); ka.rotation.x = 0.25; knife.add(ka); const kh = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.034, 0.022), lam(null, 0x15161a)); kh.position.x = 0.275; knife.add(kh); knife.visible = false; scene.add(knife);
  resize(); window.addEventListener('resize', resize);
  bindInput(); netInit(); setOverlay('menu'); setLang(LANG); p2pInit();
  lastT = performance.now(); requestAnimationFrame(frame);
}
function resize() {
  const st = $('stage'), w = st.clientWidth || 640, h = st.clientHeight || 360, ih = Math.min(IH, h), iw = Math.max(160, Math.round(ih * w / h));
  renderer.setSize(iw, ih, false); camera.aspect = w / h; camera.fov = w / h < 1 ? 82 : 66; camera.updateProjectionMatrix();
}

/* ---------- entrada ---------- */
function bindInput() {
  const cv = $('gl'), st = $('stage');
  const KEYS = { KeyW: 1, KeyA: 1, KeyS: 1, KeyD: 1, ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1, Space: 1, KeyE: 1, KeyR: 1, KeyF: 1 };
  window.addEventListener('keydown', e => {
    if (e.target && e.target.tagName === 'INPUT') return;
    if (KEYS[e.code]) e.preventDefault();
    if (e.repeat) return; IN.dev = 'kb'; IN.keys[e.code] = true; AU.init();
    if (e.code === 'KeyE' || e.code === 'Enter') IN.use = true;
    if (e.code === 'KeyR') IN.reload = true;
    if (e.code === 'Escape' || e.code === 'KeyQ') IN.back = true;
    if (e.code === 'Space' || e.code === 'KeyF') { IN.fire = true; IN.held = true; }
  });
  window.addEventListener('keyup', e => { IN.keys[e.code] = false; if (e.code === 'Space' || e.code === 'KeyF') IN.held = false; });
  window.addEventListener('blur', () => { IN.keys = {}; IN.held = false; });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('mousedown', e => {
    if (overlay) return; IN.dev = 'kb'; AU.init();
    if (!IN.locked && !IN.noLock && cv.requestPointerLock) { try { const p = cv.requestPointerLock(); if (p && p.catch) p.catch(() => { IN.noLock = true; }); } catch (err) { IN.noLock = true; } IN.drag = { x: e.clientX, y: e.clientY, moved: 99, b: e.button }; return; }
    if (IN.locked) { if (e.button === 0) { IN.fire = true; IN.held = true; } else if (e.button === 2) IN.back = true; }
    else { IN.drag = { x: e.clientX, y: e.clientY, moved: 0, b: e.button }; if (cut.on && e.button === 0) IN.held = true; }
  });
  window.addEventListener('mouseup', e => {
    IN.held = false;
    if (IN.drag && !IN.locked) { if (IN.drag.moved < 6 && !overlay) { if (IN.drag.b === 0) IN.fire = true; else IN.back = true; } }
    IN.drag = null;
  });
  window.addEventListener('mousemove', e => {
    if (IN.locked) { IN.lx += e.movementX; IN.ly += e.movementY; }
    else if (IN.drag) { const dx = e.clientX - IN.drag.x, dy = e.clientY - IN.drag.y; IN.drag.x = e.clientX; IN.drag.y = e.clientY; IN.drag.moved += Math.abs(dx) + Math.abs(dy); IN.lx += dx * 1.6; IN.ly += dy * 1.6; }
  });
  document.addEventListener('pointerlockchange', () => { IN.locked = document.pointerLockElement === cv; });
  document.addEventListener('pointerlockerror', () => { IN.noLock = true; });
  // táctil
  st.addEventListener('touchstart', e => {
    if (e.target.closest && e.target.closest('button, .ov')) return;
    e.preventDefault(); IN.dev = 'touch'; AU.init();
    for (const t of e.changedTouches) {
      if (!cut.on && t.clientX < st.clientWidth * 0.4 && !IN.joy) IN.joy = { id: t.identifier, x: t.clientX, y: t.clientY };
      else if (!IN.look) { IN.look = { id: t.identifier, x: t.clientX, y: t.clientY, t: performance.now(), moved: 0 }; if (cut.on) IN.held = true; }
    }
  }, { passive: false });
  st.addEventListener('touchmove', e => {
    if (e.target.closest && e.target.closest('.ov')) return;
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (IN.joy && t.identifier === IN.joy.id) { IN.joy.fx = clamp((t.clientX - IN.joy.x) / 46, -1, 1); IN.joy.fy = clamp((t.clientY - IN.joy.y) / 46, -1, 1); const k = $('joy-knob'); k.style.transform = 'translate(' + IN.joy.fx * 30 + 'px,' + IN.joy.fy * 30 + 'px)'; }
      else if (IN.look && t.identifier === IN.look.id) { const dx = t.clientX - IN.look.x, dy = t.clientY - IN.look.y; IN.look.x = t.clientX; IN.look.y = t.clientY; IN.look.moved += Math.abs(dx) + Math.abs(dy); IN.lx += dx * 2.4; IN.ly += dy * 2.4; }
    }
  }, { passive: false });
  const tend = e => {
    for (const t of e.changedTouches) {
      if (IN.joy && t.identifier === IN.joy.id) { IN.joy = null; $('joy-knob').style.transform = ''; }
      else if (IN.look && t.identifier === IN.look.id) { if (IN.look.moved < 10 && performance.now() - IN.look.t < 320 && !overlay && !cut.on) IN.use = true; IN.look = null; IN.held = false; }
    }
  };
  st.addEventListener('touchend', tend); st.addEventListener('touchcancel', tend);
  const tb = (id, fn) => { const b = $(id); const h = e => { e.preventDefault(); e.stopPropagation(); IN.dev = 'touch'; AU.init(); fn(); }; b.addEventListener('touchstart', h, { passive: false }); b.addEventListener('mousedown', h); };
  tb('tb-use', () => { IN.use = true; }); tb('tb-fire', () => { IN.fire = true; }); tb('tb-rel', () => { IN.reload = true; }); tb('tb-back', () => { IN.back = true; });
  // botones de las pantallas
  $('btn-start').addEventListener('click', startGame);
  $('btn-next').addEventListener('click', () => { act('next'); });
  $('btn-again').addEventListener('click', () => { act('restart'); });
  $('btn-full').addEventListener('click', () => { try { const p = $('stage').requestFullscreen(); if (p && p.catch) p.catch(() => { }); } catch (e) { } });
  for (const b of document.querySelectorAll('[data-close]')) b.addEventListener('click', () => setOverlay(null));
  for (const b of document.querySelectorAll('[data-lang]')) b.addEventListener('click', () => setLang(b.dataset.lang));
  // sala online por código (solo fuera de Claude)
  $('p2p-create').addEventListener('click', () => p2pGo(true));
  $('p2p-join').addEventListener('click', () => p2pGo(false));
  $('p2p-code').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); p2pGo(false); } });
  $('p2p-copy').addEventListener('click', () => {
    const inp = $('p2p-link'), done = () => { $('p2p-copy').textContent = T('p2p_copied'); };
    const sel = () => { inp.focus(); inp.select(); };
    try { navigator.clipboard.writeText(inp.value).then(done, sel); } catch (e) { sel(); }
  });
}
function pollPad(dt) {
  const gp = navigator.getGamepads ? navigator.getGamepads() : []; let p = null; for (const g of gp) if (g && g.connected) { p = g; break; }
  IN.pf = 0; IN.ps = 0; if (!p) return;
  const dz = v => Math.abs(v) < 0.18 ? 0 : v, ax = p.axes, b = i => p.buttons[i] && p.buttons[i].pressed, edge = i => { const now = !!b(i), was = IN.padPrev[i]; IN.padPrev[i] = now; return now && !was; };
  const mx = dz(ax[0] || 0), my = dz(ax[1] || 0), rx = dz(ax[2] || 0), ry = dz(ax[3] || 0);
  if (mx || my || rx || ry || p.buttons.some(q => q.pressed)) { IN.dev = 'pad'; AU.init(); }
  IN.ps = mx; IN.pf = -my; IN.lx += rx * dt * 820; IN.ly += ry * dt * (cut.on ? 300 : 560);
  if (edge(0)) IN.use = true; if (edge(2)) IN.reload = true; if (edge(1)) IN.back = true;
  if (edge(7) || edge(5)) IN.fire = true; IN.padHeld = !!(b(7) || b(5));
  if (edge(9) && overlay === 'menu') startGame();
}
function keyHint() { return IN.dev === 'kb' ? '[E] ' : IN.dev === 'pad' ? '(A) ' : ''; }

/* ---------- pantallas ---------- */
function setOverlay(o) {
  overlay = o;
  for (const id of ['menu', 'note', 'peep', 'end', 'over']) $(id).hidden = id !== o;
  if (o && document.exitPointerLock && IN.locked) document.exitPointerLock();
  $('hud').classList.toggle('dim', !!o);
}
function startGame() {
  AU.init();
  if (!renderer) return;
  NET.joined = true; started = true;
  if (!NET.remote || NET.isHost && W) { if (!W || W.ph !== 'play') { NET.isHost = true; hostStart(1); } }
  me.x = 1.6; me.z = -1.6; me.yaw = PI; me.pitch = 0; NET.evInit = false;
  setOverlay(null);
  if (IN.dev === 'kb' && !IN.noLock) { try { const p = $('gl').requestPointerLock(); if (p && p.catch) p.catch(() => { IN.noLock = true; }); } catch (e) { IN.noLock = true; } }
}
let p2pMsg = null, p2pBusy = false;
function p2pSay(key, a) { p2pMsg = key ? [key, a] : null; $('p2p-msg').textContent = key ? T(key, a) : ''; }
async function p2pGo(asHub) {
  if (p2pBusy || NET.room || !p2pAvailable()) return;
  let code = ($('p2p-code').value || '').replace(/\D/g, '').slice(0, 4);
  if (!asHub && code.length !== 4) { p2pSay('p2p_badcode'); return; }
  p2pBusy = true; $('p2p-create').disabled = $('p2p-join').disabled = true; p2pSay('p2p_wait'); AU.init();
  let room = null;
  for (let i = 0; i < (asHub ? 3 : 1) && !room; i++) {
    if (asHub) code = String(Math.floor(1000 + Math.random() * 9000));
    try { room = await p2pOpen(code, asHub); } catch (e) { room = null; }
  }
  p2pBusy = false;
  if (!room) { $('p2p-create').disabled = $('p2p-join').disabled = false; p2pSay(asHub ? 'p2p_failhost' : 'p2p_fail'); return; }
  NET.room = room; NET.code = code; $('p2p-code').value = code; $('p2p-code').readOnly = true;
  if (asHub) { $('p2p-link').value = location.href.split('#')[0] + '#' + code; $('p2p-linkrow').hidden = false; p2pSay('p2p_ready', code); }
  else p2pSay('p2p_joined', code);
  try { history.replaceState(null, '', '#' + code); } catch (e) { }
}
function p2pInit() {
  if (!p2pAvailable()) return;
  $('p2p').hidden = false;
  const m = /^#(\d{4})$/.exec(location.hash || '');
  if (m) { $('p2p-code').value = m[1]; p2pGo(false); }
}
function openRules() { $('note-list').innerHTML = RULESX[LANG].map(r => '<li>' + r + '</li>').join(''); setOverlay('note'); }
function setLang(l) {
  if (LANGS.indexOf(l) < 0) l = 'es';
  LANG = l; try { localStorage.setItem('kp-lang', l); } catch (e) { }
  document.documentElement.lang = l;
  for (const el of document.querySelectorAll('[data-t]')) el.textContent = T(el.dataset.t);
  for (const b of document.querySelectorAll('[data-lang]')) b.setAttribute('aria-pressed', b.dataset.lang === l ? 'true' : 'false');
  $('job-list').innerHTML = JOB[l].map(x => '<li>' + x + '</li>').join('');
  $('ctl-list').innerHTML = CTL[l].map(r => '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>').join('');
  if (overlay === 'note') $('note-list').innerHTML = RULESX[l].map(r => '<li>' + r + '</li>').join('');
  $('p2p-code').placeholder = T('p2p_code'); if (p2pMsg) $('p2p-msg').textContent = T(p2pMsg[0], p2pMsg[1]);
  prevPh = ''; hudT = 0; if (!noGL) updateMenu();
}
function openPeep() {
  const s = W ? W.bd.s : 0, cv = $('peep-cv'), g = cv.getContext('2d');
  g.fillStyle = '#020203'; g.fillRect(0, 0, 200, 200);
  const gr = g.createRadialGradient(140, 40, 5, 140, 40, 150); gr.addColorStop(0, 'rgba(255,170,70,.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 200, 200);
  if (s) {
    const f = document.createElement('canvas'); f.width = 128; f.height = 64; drawFace(f.getContext('2d'), RIDER_LOOK, 77, false, s === 2 ? 1 : 0);
    g.imageSmoothingEnabled = false; g.fillStyle = s === 2 ? '#0c0d0e' : '#2a3a2a'; g.fillRect(30, 150, 140, 60);
    g.drawImage(f, 4, 4, 56, 60, 44, 20, 112, 150);
    if (s === 1) { g.fillStyle = '#3a5a3a'; g.fillRect(40, 14, 120, 30); g.fillStyle = '#b89868'; g.fillRect(120, 150, 70, 50); }
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 0, 200, 200);
  }
  const vg = g.createRadialGradient(100, 100, 40, 100, 100, 100); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,1)'); g.fillStyle = vg; g.fillRect(0, 0, 200, 200);
  $('peep-txt').textContent = T('peep' + s);
  setOverlay('peep');
}
function toast(t, cls) { if (!t) return; const el = document.createElement('div'); el.className = 'toast ' + (cls || ''); el.textContent = t; const box = $('toasts'); box.appendChild(el); while (box.children.length > 4) box.removeChild(box.firstChild); setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 4200); }

/* ---------- jugador ---------- */
function collide(p) {
  for (const c of colliders) {
    const nx = clamp(p.x, c.x0, c.x1), nz = clamp(p.z, c.z0, c.z1), dx = p.x - nx, dz = p.z - nz, d2 = dx * dx + dz * dz;
    if (d2 >= PR * PR) continue;
    if (d2 > 1e-8) { const d = Math.sqrt(d2); p.x = nx + dx / d * PR; p.z = nz + dz / d * PR; }
    else { const l = p.x - c.x0, r = c.x1 - p.x, t = p.z - c.z0, b = c.z1 - p.z, m = Math.min(l, r, t, b); if (m === l) p.x = c.x0 - PR; else if (m === r) p.x = c.x1 + PR; else if (m === t) p.z = c.z0 - PR; else p.z = c.z1 + PR; }
  }
}
function myP() { return W && W.pl[NET.myId] || null; }
function updatePlayer(dt) {
  const P = myP(), ko = P && P.ko > 0;
  const sens = IN.dev === 'touch' ? 0.0026 : 0.0022;
  if (!cut.on && !ko) { me.yaw -= IN.lx * sens; me.pitch = clamp(me.pitch - IN.ly * sens, -1.35, 1.35); }
  if (!cut.on) { IN.lx = 0; IN.ly = 0; }
  const K = IN.keys;
  if (K.ArrowLeft) me.yaw += dt * 2.2; if (K.ArrowRight) me.yaw -= dt * 2.2;
  let f = (K.KeyW || K.ArrowUp ? 1 : 0) - (K.KeyS || K.ArrowDown ? 1 : 0) + (IN.pf || 0), s = (K.KeyD ? 1 : 0) - (K.KeyA ? 1 : 0) + (IN.ps || 0);
  if (IN.joy && IN.joy.fx !== undefined) { f -= IN.joy.fy; s += IN.joy.fx; }
  if (cut.on || ko || overlay) { f = 0; s = 0; }
  const L = Math.hypot(f, s); if (L > 1) { f /= L; s /= L; }
  const sp = P && P.h && P.h.k === 'gun' ? 3.0 : P && P.h && P.h.k === 'body' ? 1.9 : 3.35, sy = Math.sin(me.yaw), cy = Math.cos(me.yaw);
  const vx = (-sy * f + cy * s) * sp, vz = (-cy * f - sy * s) * sp;
  me.x += vx * dt; me.z += vz * dt; collide(me); collide(me);
  const mv = Math.min(1, Math.hypot(f, s));
  me.bob += dt * 9 * mv; me.stepT -= dt * mv; if (mv > 0.3 && me.stepT <= 0) { me.stepT = 0.42; AU.play('step'); }
  if (prevKo > 0 && !ko) { me.x = 1.6; me.z = -1.6; me.yaw = PI; me.pitch = 0; }
  if (!prevKo && ko) { toast(MSGX[LANG].ko, 'bad'); if (cut.on) cut.on = false; }
  prevKo = ko ? 1 : 0;
  // cámara
  if (cut.on) cut.cam = Math.min(1, cut.cam + dt * 5); else cut.cam = Math.max(0, cut.cam - dt * 6);
  const ey = ko ? 0.35 : 1.62 + Math.sin(me.bob) * 0.025 * mv, k = cut.cam * cut.cam * (3 - 2 * cut.cam);
  camera.position.set(lerp(me.x, SPX[cut.i], k), lerp(ey, 1.5, k), lerp(me.z, -2.42, k));
  camera.rotation.y = angLerp(me.yaw, 0, k); camera.rotation.x = lerp(me.pitch, -0.07, k); camera.rotation.z = ko ? 1.2 : 0;
  if (hurtFlash > 0) { camera.rotation.z += Math.sin(TIME * 60) * 0.03 * hurtFlash; }
  AU.lis.x = me.x; AU.lis.z = me.z; AU.lis.yaw = me.yaw;
}

/* ---------- corte de la carne ---------- */
function onSlice(i, cell, d) {
  if (slices.length > 40) return;
  const b = Math.floor(cell / SEG), j = cell % SEG, a = (j + 0.5) * 2 * PI / SEG + spitRot(i, Tsm), r = spitRad(b, SV[i].lv[cell]);
  const m = new THREE.Mesh(G(0.05, 0.1, 0.006), new THREE.MeshLambertMaterial({ color: meatHex(i, d) }));
  m.position.set(SPX[i] + Math.sin(a) * r, SPY0 + (b + 0.5) * BH, SPZ + Math.cos(a) * r + 0.01); m.rotation.y = a;
  scene.add(m); slices.push({ m, vy: -0.2, vz: 0.25 + Math.random() * 0.2, rx: 3 + Math.random() * 5 });
}
function localCut(i, cells) {
  const S = SV[i], valid = cells.filter(c => S.lv[c] > 0); if (!valid.length) return 0;
  for (const c of valid) onSlice(i, c, S.dn[c]);
  if (!NET.isHost) { for (const c of valid) { const d = S.dn[c]; S.lv[c]--; S.dn[c] = 0.12 + Math.min(d, 1) * 0.1; S.pend[c] = TIME; } S.dirty = true; }
  act('cut', i, valid); return valid.length;
}
function enterCut(i) { cut.on = true; cut.i = i; cut.y = 1.88; cut.press = false; cut.last = 7; me.pitch = -0.1; }
function updateCut(dt) {
  knife.visible = cut.on; if (!cut.on) return;
  const P = myP(); if (!W || W.ph !== 'play' || !P || P.h || P.ko > 0 || overlay) { cut.on = false; knife.visible = false; return; }
  if (IN.use || IN.back) { IN.use = IN.back = false; cut.on = false; me.yaw = 0; me.pitch = -0.07; return; }
  cut.y = clamp(cut.y - IN.ly * 0.0032, 0.94, 1.92); IN.lx = 0; IN.ly = 0;
  const band = Math.floor((cut.y - SPY0) / BH), press = IN.held || !!IN.padHeld || (IN.dev === 'kb' && !IN.locked && !!IN.drag);
  const rot = spitRot(cut.i, Tsm), S = SV[cut.i];
  if (press && cut.press && band < cut.last) {
    const cells = []; for (let b = Math.min(cut.last, BANDS - 1); b > band; b--) if (b >= 0) for (const c of frontCells(cut.i, rot, b)) cells.push(c);
    if (cells.length && localCut(cut.i, cells)) { AU.play('cut'); vmKick = 1; }
  }
  cut.last = band; cut.press = press;
  const bb = clamp(band, 0, BANDS - 1), fc = frontCells(cut.i, rot, bb); let r = 0, dn = 0; for (const c of fc) { r += spitRad(bb, S.lv[c]); dn += S.dn[c]; } r = fc.length ? r / fc.length : 0.2; dn = fc.length ? dn / fc.length : 0.75;
  knife.position.set(SPX[cut.i] + 0.02, cut.y, SPZ + r + (press ? 0.004 : 0.07)); knife.rotation.set(press ? 0.5 : 0.15, 0, -0.1 + (press ? Math.sin(TIME * 50) * 0.01 : 0));
  cut.dn = dn; cut.empty = S.lv[fc[0] !== undefined ? fc[0] : 0] <= 0;
}

/* ---------- mano y escopeta ---------- */
function updateViewmodel(dt) {
  const P = myP(), h = P && !cut.on && !(P.ko > 0) ? P.h : 0, key = h ? JSON.stringify(h) : '';
  if (key !== vmKey) {
    vmKey = key; vm.remove(vmItem); vmItem = new THREE.Group(); vm.add(vmItem);
    if (h) {
      const it = itemMesh(h); vmItem.add(it);
      const arm = new THREE.Mesh(G(0.075, 0.075, 0.4), lam(null, 0xc8906a));
      if (h.k === 'gun') { it.scale.setScalar(1.15); vmItem.position.set(0.19, -0.2, -0.36); arm.position.set(0.02, -0.07, 0.3); }
      else if (h.k === 'kb') { it.scale.setScalar(1.25); it.rotation.x = 0.85; it.rotation.y = h.w && h.b === 0 ? 0.5 : 0; vmItem.position.set(0.04, -0.2, -0.44); arm.position.set(0.12, -0.1, 0.22); arm.rotation.y = 0.3; }
      else if (h.k === 'body') { it.scale.setScalar(1.15); it.rotation.y = 0.35; vmItem.position.set(0.06, -0.4, -0.52); arm.position.set(0.22, 0.02, 0.2); }
      else { it.scale.setScalar(1.3); vmItem.position.set(0.2, -0.3, -0.45); arm.position.set(0.02, -0.06, 0.24); }
      vmItem.add(arm); vmKick = 1;
    }
  }
  vmKick = Math.max(0, vmKick - dt * 5); vmRecoil = Math.max(0, vmRecoil - dt * 3.2);
  vm.position.set(0, -vmKick * 0.05 + Math.sin(me.bob) * 0.006 - (reloadT > 0 ? Math.sin(Math.min(1, reloadT / 1.2) * PI) * 0.16 : 0), vmRecoil * 0.12);
  vm.rotation.x = vmRecoil * 0.5 - (reloadT > 0 ? 0.5 * Math.sin(Math.min(1, reloadT / 1.2) * PI) : 0);
  if (reloadT > 0) reloadT -= dt; if (shotCd > 0) shotCd -= dt;
  if (flashT > 0) { flashT -= dt; LG.flash.intensity = 3.2; } else LG.flash.intensity = 0;
}
function tryShoot(P) {
  if (shotCd > 0 || reloadT > 0) return;
  if (W.am <= 0) { AU.play('click'); toast(W.shl > 0 ? T(IN.dev === 'kb' ? 'noammo_r' : 'noammo_t') : T('noammo0'), 'bad'); shotCd = 0.4; return; }
  shotCd = 0.55; vmRecoil = 1; flashT = 0.07; AU.play('shot');
  camera.getWorldDirection(_v); const o = [r2(camera.position.x), r2(camera.position.y), r2(camera.position.z)], d = [r2(_v.x), r2(_v.y), r2(_v.z)];
  LG.flash.position.set(camera.position.x + _v.x * 0.6, camera.position.y + _v.y * 0.6, camera.position.z + _v.z * 0.6);
  me.pitch = clamp(me.pitch + 0.07, -1.35, 1.35); $('flash').classList.remove('on'); void $('flash').offsetWidth; $('flash').classList.add('on');
  if (!NET.isHost) W.am--;
  act('shoot', o, d);
}
function useSound(key) {
  if (key === 'butcher') { AU.play(W && W.bt ? 'chop' : 'grab'); return; }
  if (key === 'chop') { if (W && W.chop.t < 0) AU.play('grab'); return; }
  const k = key.slice(0, 2);
  AU.play(key === 'foil' ? 'foil' : k === 'sa' ? 'squirt' : key === 'chop' ? 'chop' : key === 'fz' ? 'fryin' : k === 'dr' ? 'pop' : key === 'gun' ? 'reload' : key === 'bdoor' ? 'door' : 'grab');
}
function updateInteract(dt) {
  target = null; targetKey = null; me.aim = 0; useCd -= dt;
  const P = myP(); if (!W || W.ph !== 'play' || !P || overlay || cut.on) { IN.use = IN.fire = IN.reload = false; return; }
  if (P.ko > 0) { IN.use = IN.fire = IN.reload = false; return; }
  const gun = P.h && P.h.k === 'gun';
  raycaster.setFromCamera(_c0, camera); raycaster.far = gun ? 18 : 3.1;
  const hits = raycaster.intersectObjects(rayTargets, false);
  if (hits.length) {
    const h0 = hits[0], key = h0.object.userData.key;
    if (key) { const isCu = key.slice(0, 2) === 'cu'; if (isCu && gun) me.aim = +key.slice(2); if (h0.distance < (isCu ? 3.1 : 2.6)) { targetKey = key; target = useLogic(NET.myId, key, false); } }
  }
  if (IN.reload) { IN.reload = false; if (gun && reloadT <= 0 && W.am < 2 && W.shl > 0) { reloadT = 1.2; AU.play('reload'); act('reload'); } }
  let use = IN.use; if (IN.fire) { if (gun) tryShoot(P); else use = true; }
  IN.use = IN.fire = false;
  if (use && !target && useCd <= 0 && P.h && P.h.k === 'body') { act('dropbody'); AU.play('die'); useCd = 0.5; }
  if (use && target && useCd <= 0) {
    if (!target.ok) { AU.play('bad'); useCd = 0.25; }
    else if (target.loc === 'cut') enterCut(+targetKey.slice(2));
    else if (target.loc === 'peep') openPeep();
    else if (target.loc === 'rules') openRules();
    else { act('use', targetKey); useSound(targetKey); vmKick = 1; useCd = NET.isHost ? 0.12 : 0.3; }
  }
}

/* ---------- mundo visible ---------- */
function clearGroup(g) { while (g.children.length) g.remove(g.children[0]); }
function showSay(c, ch) {
  const text = lineOf(c); if (!text) return;
  const nm = c.an === 2 ? '' : aName(c.a), dur = 1.8 + text.length * 0.06;
  let b = bubbles.get(c.i); if (!b) { b = { el: document.createElement('div') }; b.el.className = 'bub'; $('bubs').appendChild(b.el); bubbles.set(c.i, b); }
  b.el.innerHTML = ''; const n = document.createElement('b'); n.textContent = nm; const s = document.createElement('span'); s.textContent = text; b.el.appendChild(n); b.el.appendChild(s);
  b.el.classList.toggle('an', c.an === 1); b.t = dur; ch.sayT = Math.min(dur, 2.5);
  const sb = $('subs'); sb.innerHTML = ''; const n2 = document.createElement('b'); n2.textContent = nm + ': '; sb.appendChild(n2); sb.appendChild(document.createTextNode(text)); sb.classList.toggle('an', c.an === 1); subT = dur + 0.6;
  const v = c.an === 1 ? 0.45 : (ARCH[c.a].voice || 1), nb = Math.min(9, 2 + (text.length / 7 | 0));
  for (let i = 0; i < nb; i++) setTimeout(() => AU.play('blip', c.x, c.z, v), i * 75);
}
function syncChars(dt) {
  const seen = {};
  if (W) for (const c of W.cu) {
    seen[c.i] = 1; let ch = chars.get(c.i);
    if (!ch) { ch = makeChar(c.an === 2 ? SHADOW_LOOK : ARCH[c.a].look, c.s, c.an, 'cu' + c.i); ch.g.position.set(c.x, 0, c.z); ch.g.rotation.y = c.y; ch.ln = 0; chars.set(c.i, ch); }
    const px = ch.g.position.x, pz = ch.g.position.z, far = Math.hypot(c.x - px, c.z - pz) > 3, k = far ? 1 : Math.min(1, dt * 12);
    const nx = lerp(px, c.x, k), nz = lerp(pz, c.z, k);
    ch.spd = far ? 0 : lerp(ch.spd, Math.hypot(nx - px, nz - pz) / Math.max(dt, 0.001), 0.25);
    ch.g.position.x = nx; ch.g.position.z = nz; ch.g.rotation.y = angLerp(ch.g.rotation.y, c.y, Math.min(1, dt * 9));
    const mode = c.st === S_DEAD ? 3 : c.st === S_DIS ? 4 : (c.st === S_ATK && c.an === 1) ? 1 : c.st === S_ROB ? 2 : 0;
    animChar(ch, dt, mode, c.an === 0 && ARCH[c.a].sp === 'drunk', TIME);
    if (ch.bag) ch.bag.visible = (c.st === S_OUT && c.b === 1) || c.st === S_RUN;
    if (c.an === 2) ch.g.visible = !W.pw || c.st === S_DIS;
    if (c.ln !== ch.ln) { ch.ln = c.ln; showSay(c, ch); }
    ch.cx = c;
  }
  for (const [id, ch] of chars) if (!seen[id]) { killChar(ch); chars.delete(id); const b = bubbles.get(id); if (b) { b.el.remove(); bubbles.delete(id); } }
  // burbujas
  const w = $('stage').clientWidth, h = $('stage').clientHeight;
  for (const [id, b] of bubbles) {
    b.t -= dt; const ch = chars.get(id);
    if (b.t <= 0 || !ch) { b.el.remove(); bubbles.delete(id); continue; }
    _v.set(ch.g.position.x, ch.look.h + 0.32, ch.g.position.z).project(camera);
    const vis = _v.z < 1 && Math.abs(_v.x) < 0.98 && Math.abs(_v.y) < 1.2 && !overlay && !cut.on;
    b.el.style.display = vis ? '' : 'none';
    if (vis) { const bw = Math.min(150, w * 0.31) + 8, bx = clamp((_v.x * 0.5 + 0.5) * w, bw, w - bw), bh = b.el.offsetHeight || 60; b.el.style.left = bx + 'px'; b.el.style.top = clamp((-_v.y * 0.5 + 0.5) * h, (bx - bw < 180 ? 150 : 8) + bh, h - 40) + 'px'; }
  }
  // compañeros
  const live = {};
  if (W && started) for (const p of NET.others) {
    const pr = p.presence.p; if (!pr) continue; live[p.peer] = 1;
    let ch = rchars.get(p.peer); if (!ch) { let hsh = 0; for (let i = 0; i < p.peer.length; i++) hsh = hsh * 31 + p.peer.charCodeAt(i) | 0; ch = makeChar(PLAYER_LOOK, Math.abs(hsh), 0, null); ch.g.position.set(pr[0], 0, pr[1]); ch.hk = ''; rchars.set(p.peer, ch); }
    const px = ch.g.position.x, pz = ch.g.position.z, nx = lerp(px, pr[0], Math.min(1, dt * 12)), nz = lerp(pz, pr[1], Math.min(1, dt * 12));
    ch.spd = lerp(ch.spd, Math.hypot(nx - px, nz - pz) / Math.max(dt, 0.001), 0.25); ch.g.position.x = nx; ch.g.position.z = nz;
    ch.g.rotation.y = angLerp(ch.g.rotation.y, pr[2] + PI, Math.min(1, dt * 10));
    const Q = W.pl[p.peer], hk = Q && Q.h ? JSON.stringify(Q.h) : '';
    animChar(ch, dt, Q && Q.ko > 0 ? 3 : 0, false, TIME);
    if (hk !== ch.hk) { ch.hk = hk; if (ch.held) ch.aR.remove(ch.held); ch.held = null; if (hk) { ch.held = itemMesh(Q.h); ch.held.position.set(0, -0.66, 0.12); ch.held.rotation.x = Q.h.k === 'gun' ? PI / 2 : 1.2; ch.aR.add(ch.held); } }
    if (hk) ch.aR.rotation.x = -1.1; ch.head.rotation.x = -pr[3] * 0.6;
  }
  for (const [id, ch] of rchars) if (!live[id]) { killChar(ch); rchars.delete(id); }
}
let tubeFlick = 0, tubeNext = 3, subT = 0, greeted = false;
function syncWorld(dt) {
  const pw = W ? W.pw : 1; let fk = 1;
  if (W && W.fk > 0) fk = (Math.sin(TIME * 47) + Math.sin(TIME * 83.3)) > 0.3 ? 1 : 0.12;
  tubeNext -= dt; if (tubeNext <= 0) { tubeNext = 2 + Math.random() * 9; tubeFlick = 0.12 + Math.random() * 0.25; }
  let t2 = 1; if (tubeFlick > 0) { tubeFlick -= dt; t2 = Math.sin(TIME * 70) > 0 ? 1 : 0.25; }
  LG.k.intensity = 1.05 * pw * fk; LG.c.intensity = 0.95 * pw * fk * t2; LG.fridge.intensity = 0.5 * pw; LG.neon.intensity = pw * (0.62 + Math.sin(TIME * 3) * 0.06) * (fk < 1 ? 0.4 : 1);
  LG.amb.intensity = pw ? 0.55 : 0.16; LG.street.intensity = 2.1;
  LG.store.intensity = pw * (0.55 + (Math.sin(TIME * 13) > 0.92 ? -0.4 : 0)) * fk; LG.emer.intensity = pw ? 0 : 0.55; LG.heat.intensity = 0.85 + Math.sin(TIME * 11) * 0.06;
  D.tubes[0].material.color.setHex(pw && fk > 0.5 ? 0xeaffea : 0x1a1f1a); D.tubes[1].material.color.setHex(pw && fk > 0.5 && t2 > 0.5 ? 0xeaffea : 0x1a1f1a);
  D.neon.visible = !!pw; D.fridgeFace.material.color.setHex(pw ? 0xffffff : 0x1c2226); D.bulb.material.color.setHex(pw ? 0xffe2b0 : 0x1a1612);
  D.fuseLed.material.color.setHex(pw ? 0x30ff50 : 0xff2a1a); D.fuseLever.position.y = pw ? 1.57 : 1.43;
  LG.torch.intensity = pw ? 0 : 1.7; LG.torch.position.copy(camera.position); camera.getWorldDirection(_v); LG.torch.target.position.set(camera.position.x + _v.x * 4, camera.position.y + _v.y * 4, camera.position.z + _v.z * 4);
  D.flies.forEach((f, i) => { const a = TIME * (2.3 + i * 0.7) + i * 2; f.position.set(0.8 + Math.cos(a) * (0.18 + i * 0.05), 0.95 + Math.sin(a * 1.7 + i) * 0.14, -3.6 + Math.sin(a) * 0.2); });
  for (let i = slices.length - 1; i >= 0; i--) { const s = slices[i]; s.vy -= 6 * dt; s.m.position.y += s.vy * dt; s.m.position.z += s.vz * dt; s.m.rotation.x += s.rx * dt; if (s.m.position.y < 0.97) { scene.remove(s.m); s.m.material.dispose(); slices.splice(i, 1); } }
  if (!W) return;
  if (NET.isHost) Tsm = W.t; else { Tsm += dt; if (Math.abs(Tsm - W.t) > 0.5) Tsm = W.t; }
  for (let i = 0; i < 2; i++) {
    if (!NET.isHost) decodeSpit(i, TIME);
    const sp = D.spit[i], T = W.sp[i]; sp.mesh.rotation.y = spitRot(i, Tsm);
    if (SV[i].dirty) updateSpitMesh(i);
    const k = clamp(T.u / 40, 0, 1); sp.pile.visible = T.u >= 1; sp.pile.scale.set(1.2 + k * 0.9, 0.12 + k * 0.9, 0.5 + k * 0.4);
    meatColor(i, T.r > 0.4 ? 0.2 : 0.85, _c3); sp.pile.material.color.setRGB(_c3[0], _c3[1], _c3[2]);
  }
  for (let i = 0; i < 3; i++) { const k = clamp(W.bin[i] / 16, 0, 1) * 1.5; D.bins[i].visible = W.bin[i] > 0; D.bins[i].scale.y = Math.max(0.15, k); D.bins[i].position.y = 1.07 + 0.05 * Math.max(0.15, k); }
  const ck = W.chop.t + ':' + W.chop.n;
  if (ck !== D.chopKey) { if (D.chopKey && W.chop.n > 0 && D.chopKey !== ck) AU.play('chop', -3.6, -1.6); D.chopKey = ck; clearGroup(D.chopVeg); if (W.chop.t >= 0) { const m = itemMesh({ k: 'vg', t: W.chop.t }); m.scale.set(1 + W.chop.n * 0.12, Math.max(0.2, 1 - W.chop.n * 0.14), 1 + W.chop.n * 0.12); D.chopVeg.add(m); } }
  const F = W.fry; D.basket.position.y = lerp(D.basket.position.y, F.s ? 0.99 : 1.17, Math.min(1, dt * 6)); D.basketFries.visible = F.s === 1;
  if (F.s) { const q = F.t; D.basketFries.material.color.setHex(q < 9 ? 0xe6dca0 : q < 19 ? 0xe2b83a : q < 27 ? 0xa8762a : 0x2a1a10); TX.oil && (TX.oil.offset.x = Math.sin(TIME * 9) * 0.02, TX.oil.offset.y = Math.cos(TIME * 7) * 0.02); }
  D.friesPile.visible = F.u > 0; D.friesPile.scale.y = 0.3 + F.u * 0.3; D.friesPile.material.color.setHex(F.q < 0.4 ? 0x5a3a1a : F.q < 0.8 ? 0xb8862a : 0xe2b83a);
  for (let i = 0; i < 3; i++) { const sk = W.sh[i] ? JSON.stringify(W.sh[i]) : ''; if (sk !== D.shelf[i].key) { D.shelf[i].key = sk; clearGroup(D.shelf[i].g); if (sk) D.shelf[i].g.add(itemMesh(W.sh[i])); } }
  D.rackGun.visible = !!W.gr;
  const bk = W.bt ? W.bt.s + ':' + W.bt.n : '';
  if (bk !== D.btKey) { D.btKey = bk; clearGroup(D.bt); if (W.bt) { const m = itemMesh({ k: 'body' }), k = 1 - W.bt.n / 9; m.scale.set(1.5 * k, 1.5 * (0.6 + 0.4 * k), 1.5 * (0.7 + 0.3 * k)); D.bt.add(m); } }
  const B = W.bd; D.bdoor.position.z = -7.47 + (B.s ? Math.max(0, Math.sin(B.t * 1.85 * PI)) * (B.s === 2 ? 0.02 : 0.008) : 0);
  const ok = clamp(B.o / 0.6, 0, 1); D.bdoor.rotation.y = -ok * 1.1; D.bdoor.position.x = 3.05 - ok * 0.2;
  D.figWin.visible = W.t > HOUR_LEN * 4.3 && W.t < HOUR_LEN * 4.9;
}

/* ---------- HUD ---------- */
function ticketHTML(c) {
  const ord = genOrder(c.a, c.s), X = LX[LANG];
  let h = '<div class="tk' + (c.p < 0.25 ? ' hot' : '') + '"><div class="tk-h"><b>' + aName(c.a) + '</b><i>' + aRole(c.a) + '</i></div>';
  ord.forEach((it, i) => {
    let t; if (it.k === 'kb') t = '<u>' + kbShort(it) + '</u><br>' + vegPhrase(it.v) + ' · ' + saucePhrase(it.s) + (it.b === 2 ? ' · ' + X.wfries : ''); else t = '<u>' + (it.k === 'fr' ? X.fries : X.drink[it.t]) + '</u>';
    h += '<div class="tk-i' + (c.g[i] ? ' done' : '') + '">' + t + '</div>';
  });
  return h + '<div class="tk-p"><span style="width:' + Math.round(clamp(c.p, 0, 1) * 100) + '%"></span></div></div>';
}
function updateHUD(dt) {
  // sucesos
  if (W) {
    if (!NET.evInit) { NET.evInit = true; lastEv = NET.isHost ? 0 : W.es; }
    for (const e of W.ev) {
      if (e[0] <= lastEv) continue; lastEv = e[0]; const type = e[1], x = e[2], z = e[3], a = e[4];
      if (type === 'msg') toast(MSGX[LANG][a] || MSG[a], a === 'deliv' || a === 'power' || a === 'karma' || a === 'robgone' || a === 'killed' ? 'good' : 'bad');
      else if (type === 'cash') { toast('+' + eur(a), 'good'); AU.play('cash', x, z); }
      else if (type === 'tip') toast(T('tip', eur(a)), 'good');
      else if (type === 'shot') { if (a !== NET.myId) AU.play('shot', x, z); }
      else if (type === 'cut') { if (a !== NET.myId) AU.play('cut', x, z); }
      else if (type === 'hurt') { if (a === NET.myId) { hurtFlash = 1; AU.play('hurt'); } }
      else if (type === 'blood') { if (bloods.length > 10) { const o = bloods.shift(); scene.remove(o); } const m = decal(['st1', 'st2', 'st3'][e[0] % 3], x, 0.016 + bloods.length * 0.0005, z, -PI / 2, 0, 1.1, 1.1, 0.9); m.rotation.z = e[0] * 1.7; bloods.push(m); }
      else AU.play(type, x, z);
    }
  }
  if (subT > 0) { subT -= dt; if (subT <= 0) $('subs').textContent = ''; }
  hurtFlash = Math.max(0, hurtFlash - dt * 1.4); $('hurt').style.opacity = hurtFlash * 0.8;
  const P = myP();
  $('ko').hidden = !(P && P.ko > 0 && W.ph === 'play');
  // indicación
  const pr = $('prompt');
  if (cut.on) { pr.className = 'ok low'; pr.textContent = (cut.empty ? T('cut_empty') : T('cut_front', doneWord(cut.dn || 0))) + T(IN.dev === 'touch' ? 'cut_touch' : IN.dev === 'pad' ? 'cut_pad' : 'cut_kb'); }
  else if (target) { pr.className = target.ok ? 'ok' : 'no'; pr.textContent = (target.ok ? keyHint() : '') + target.t; }
  else if (P && P.h && P.h.k === 'body' && W.ph === 'play' && !overlay) { pr.className = 'ok'; pr.textContent = keyHint() + T('u_drop_body'); }
  else { pr.className = ''; pr.textContent = ''; }
  $('cross').classList.toggle('on', !!(target && target.ok)); $('cross').classList.toggle('aim', !!me.aim);
  hudT -= dt; if (hudT > 0) return; hudT = 0.12;
  document.body.dataset.dev = IN.dev; $('touch').hidden = IN.dev !== 'touch' || !!overlay;
  // fases
  const ph = W ? W.ph : '';
  if (W && started) {
    if (ph !== prevPh || W.n !== prevN) {
      if (ph === 'end') { $('end-t').textContent = T('end_t', W.n); $('end-s').innerHTML = '<dt>' + T('e_sv') + '</dt><dd>' + W.s.sv + '</dd><dt>' + T('e_ls') + '</dt><dd>' + W.s.ls + '</dd><dt>' + T('e_e') + '</dt><dd>' + eur(W.s.e) + '</dd><dt>' + T('e_tp') + '</dt><dd>' + eur(W.s.tp) + '</dd><dt>' + T('e_cash') + '</dt><dd>' + eur(W.cash) + '</dd><dt>' + T('rep') + '</dt><dd>' + Math.round(W.rep) + ' / 100</dd>'; if (overlay !== 'end') setOverlay('end'); }
      else if (ph === 'over') { $('over-t').textContent = T('over' + (W.why | 0) + '_t'); $('over-p').textContent = T('over' + (W.why | 0) + '_p'); $('over-s').textContent = T('over_s', W.n - 1, eur(W.cash)); if (overlay !== 'over') setOverlay('over'); }
      else if (ph === 'play') { if (overlay === 'end' || overlay === 'over') setOverlay(null); if (W.n !== prevN || (prevPh !== 'play' && prevPh !== '')) { me.x = 1.6; me.z = -1.6; me.yaw = PI; me.pitch = 0; } if (W.n !== prevN || (prevPh !== 'play' && prevPh !== '') || !greeted) { greeted = true; toast(T('t_night', W.n), 'good'); } }
      prevPh = ph; prevN = W.n;
    }
  }
  $('hud').hidden = !(W && started && ph === 'play');
  if (!W) { updateMenu(); return; }
  if (overlay === 'menu') updateMenu();
  $('clock').textContent = clockStr(W.t); $('night').textContent = T('night', W.n); $('cash').textContent = eur(W.cash);
  $('rep-f').style.width = Math.round(W.rep) + '%'; $('rep-f').classList.toggle('low', W.rep < 30);
  $('coop').textContent = (NET.code ? T('room_code', NET.code) + (NET.count > 1 ? ' · ' : '') : '') + (NET.count > 1 ? T('coop', NET.count) : '');
  let th = ''; for (const c of W.cu) if (!c.an && c.st === S_WAIT) th += ticketHTML(c); $('tickets').innerHTML = th;
  const h = P ? P.h : 0; let hd = handDesc(h); if (h && h.k === 'gun') hd += '  ' + '●'.repeat(W.am) + '○'.repeat(2 - W.am) + '  +' + W.shl;
  $('hand').textContent = hd; $('hp').textContent = P ? '♥'.repeat(P.hp) + '♡'.repeat(Math.max(0, 3 - P.hp)) : '';
  $('tb-fire').hidden = !(h && h.k === 'gun'); $('tb-rel').hidden = !(h && h.k === 'gun'); $('tb-back').hidden = !cut.on;
  $('clock').classList.toggle('witch', Math.abs(W.t - HOUR_LEN * 4.55) < 6);
}
function updateMenu() {
  const m = $('menu-msg'), b = $('btn-start');
  if (NET.remote && !NET.isHost && W) { m.textContent = T('running', W.n, clockStr(W.t)); b.textContent = T('join'); }
  else {
    b.textContent = T('start');
    if (NET.badVer) m.textContent = T('p2p_version');
    else if (!NET.room) m.textContent = p2pAvailable() ? '' : T('solo');
    else if (NET.others.length) m.textContent = T('room_others', NET.others.length);
    else m.textContent = T(NET.code ? 'p2p_alone' : 'room_ready');
  }
}

/* ---------- bucle ---------- */
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, Math.max(0.001, (now - lastT) / 1000)); lastT = now; TIME += dt;
  pollPad(dt);
  if (overlay && (IN.use || IN.back)) { if (overlay === 'note' || overlay === 'peep') setOverlay(null); else if (overlay === 'menu' && IN.use) startGame(); else if (overlay === 'end' && IN.use) act('next'); else if (overlay === 'over' && IN.use) act('restart'); IN.use = IN.back = false; }
  if (overlay) { IN.fire = false; IN.reload = false; }
  if (started) {
    updateCut(dt); updatePlayer(dt); updateInteract(dt);
    if (NET.isHost) simulate(dt);
  } else { camera.position.set(Math.sin(TIME * 0.1) * 0.6 - 0.5, 1.5, 3.9); camera.rotation.set(-0.06, 0.18 + Math.sin(TIME * 0.13) * 0.14, 0); IN.lx = IN.ly = 0; }
  IN.back = false;
  netUpdate(dt, me);
  syncWorld(dt); syncChars(dt); updateViewmodel(dt); updateHUD(dt);
  // sonido ambiente
  let danger = 0; if (W) for (const c of W.cu) if (c.an && c.st !== S_DIS) { const d = Math.hypot(c.x - me.x, c.z - me.z); danger = Math.max(danger, clamp(1 - d / 9, 0, 1) * (c.st === S_ATK ? 1 : 0.55)); }
  const ds = Math.hypot(me.x + 2.4, me.z + 3.6), df = Math.hypot(me.x + 0.5, me.z + 3.6), dd = Math.hypot(me.x + 2.6, me.z - 5);
  AU.frame(dt, { power: W ? W.pw : 1, siz: 1 / (1 + ds * ds / 7), fry: W && W.fry.s ? 1 / (1 + df * df / 6) : 0, out: 1 / (1 + dd * dd / 9), club: 0.5 + 0.5 / (1 + dd * dd / 9), danger });
  renderer.render(scene, camera);
}
window.KP = { get W() { return W; }, NET, me, IN, act, SV, cut, setLang, get chars() { return chars; } };
boot();

