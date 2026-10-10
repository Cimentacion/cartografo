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
