// MODO HISTORIA: 6 capítulos con zonas fijas, briefing, mensajes de radio durante la misión y final.
// Personajes: la comisaria Duval (te da las órdenes), Píxel (la hacker del equipo) y El Barón (el malo).
export const CAST = {
  duval: { n: 'COMISARIA DUVAL', c: '#5ad0ff', i: '👮' },
  pixel: { n: 'PÍXEL', c: '#7dff8a', i: '💻' },
  baron: { n: 'EL BARÓN', c: '#ff4a5a', i: '🎩' },
  viuda: { n: 'LA VIUDA', c: '#ff8a3d', i: '🚁' },
};
export const STORY = [
  {
    t: 'LLEGADA A LA RIVIERA', z: ['monaco', 'puerto', 'casino'],
    intro: [['duval', 'Bienvenidos a la Riviera, agentes. Esto era un paraíso hasta que llegó El Barón.'], ['duval', 'Controla el puerto, los casinos y media policía. Hoy empezamos a recuperar la costa.'], ['pixel', 'He pinchado sus radios. Si escucháis mi voz, es que voy un paso por delante de ellos.'], ['baron', '¿Unos polis en un descapotable? Qué adorable. Disfrutad del paseo... es el último.']],
    radio: [[['duval', 'Primera parada: el paseo de Mónaco. Limpiadlo de matones.']], [['pixel', 'El puerto está lleno de contenedores del Barón. Algo grande llega por mar.'], ['duval', 'Cuidado con los camiones: alguno lleva sorpresas.']], [['baron', 'Bienvenidos a mi casino. Aquí la casa siempre gana.'], ['pixel', 'Las cuentas del Barón están en ese casino. ¡Abríos paso!']]],
    outro: [['pixel', '¡Tengo sus cuentas! El dinero sale por la autopista hacia el polígono industrial.'], ['duval', 'Buen trabajo. Seguidle el rastro al dinero.']],
  },
  {
    t: 'LA RUTA DEL CONTRABANDO', z: ['autopista', 'industrial', 'trenes'],
    intro: [['duval', 'El dinero del Barón viaja en camiones por la autopista.'], ['pixel', 'Y de ahí al polígono, donde lo cargan en trenes de mercancías.'], ['baron', 'Mis camiones no paran por nadie. Mucho menos por vosotros.']],
    radio: [[['duval', 'Autopista a la vista. Reventad todo lo que dispare.']], [['pixel', 'El polígono es su almacén. Bidones, grúas... no os quedéis quietos.']], [['pixel', '¡Dos trenes a la vez! Uno por cada vía. ¡Atentos a los dos lados!']]],
    outro: [['duval', 'Le hemos cortado el contrabando. Ahora se esconderá en la ciudad.'], ['baron', 'Habéis tocado mi dinero. Ahora es personal.']],
  },
  {
    t: 'CIUDAD SIN LEY', z: ['detroit', 'semaforos', 'policia'],
    intro: [['duval', 'El Barón ha comprado los barrios del norte. Ni la policía local está de nuestro lado.'], ['pixel', 'En la ciudad policial os multarán si disparáis delante de una patrulla. Son suyos.'], ['duval', 'Así que apuntad bien y elegid el momento.']],
    radio: [[['pixel', 'Este barrio está en ruinas desde que llegó él. Cuidado con los muros.']], [['duval', 'Semáforos, cruces, tráfico... y emboscadas en cada esquina.']], [['baron', 'Mis amigos de uniforme os están esperando. Sonreíd a la cámara.'], ['pixel', 'Que no os pillen disparando con una patrulla delante.']]],
    outro: [['pixel', 'He sacado de la comisaría la ubicación de su refugio: fuera de la ciudad, en el campo.'], ['duval', 'Llenad el depósito. Nos vamos de excursión.']],
  },
  {
    t: 'TIERRA SALVAJE', z: ['lomas', 'bosque', 'llanura'],
    intro: [['baron', '¿Venís a por mí al campo? Aquí las reglas las pongo yo... y mis mascotas.'], ['pixel', 'Ha soltado bestias en el bosque. Y tiene un dirigible armado sobre la llanura.'], ['duval', 'Primero las lomas: sus camiones esperan detrás de cada cambio de rasante.']],
    radio: [[['pixel', 'Disparad a las ruedas de los camiones. Si revienta una, se salen.']], [['duval', 'Algo enorme se mueve entre los árboles...'], ['pixel', '¡Es un oso! Y viene con la manada.']], [['baron', 'Mirad arriba. Mi dirigible os saluda.'], ['duval', 'Derribadlo. Sin él no tiene ojos en el cielo.']]],
    outro: [['pixel', 'El refugio estaba vacío. Se ha ido a su base militar.'], ['baron', 'Mi ejército privado os espera. Traed más balas.']],
  },
  {
    t: 'FRENTE DE GUERRA', z: ['militar', 'trenmil', 'guerra'],
    intro: [['duval', 'Esto ya no es una operación policial. Es una guerra.'], ['pixel', 'Tanques, trenes blindados y campos de minas. Ha montado un ejército.'], ['duval', 'Aguantad. Estamos a un paso de él.']],
    radio: [[['pixel', 'Base militar. Tanques a la vista: el blindaje primero, luego el tanquista.']], [['duval', '¡Tren militar! Primero uno y luego el otro, por el otro lado.']], [['pixel', 'Zona de guerra. Hay minas en la carretera: reventadlas antes de pasar.'], ['baron', '¡Adelante, mis soldados! ¡Que no lleguen a los túneles!']]],
    outro: [['pixel', 'Se escapa por los túneles hacia el barranco. Va en su helicóptero.'], ['duval', 'Última misión, agentes. Terminemos esto.']],
  },
  {
    t: 'EL DESCENSO FINAL', z: ['tuneles', 'bajada', 'curva'],
    intro: [['baron', 'Habéis llegado lejos. Pero esta carretera solo va hacia abajo.'], ['pixel', 'Túneles, una bajada eterna y las curvas del barranco. Allí le espera La Viuda.'], ['viuda', 'Mi helicóptero tiene una gatling y humo de sobra. No veréis ni el final.'], ['duval', 'Por la Riviera. A por ellos.']],
    radio: [[['pixel', 'Leed los paneles del túnel: avisan de lo que viene en cada tramo.']], [['duval', 'Bajada a tope. Motoristas por detrás y lanzacohetes en los lados.'], ['pixel', '¡Los misiles se pueden derribar!']], [['viuda', 'Llegó la hora. Cuando os ciegue el humo, ni sabréis dónde estoy.'], ['baron', '¡Acabad con ellos!']]],
    outro: [['viuda', 'Imposible...'], ['duval', 'El Barón ha caído con su helicóptero. La Riviera vuelve a ser libre.'], ['pixel', 'Y yo me quedo sus cuentas para reconstruir la costa. ¡Gracias, agentes!']],
  },
  // PRUEBA: las dunas y la torre
  {
    t: 'PRUEBA: DUNAS', z: ['dunas'], test: true, zd: 2,
    intro: [['pixel', 'Amanece en las dunas. Al fondo hay una torre enorme que lanza salvas de misiles.'], ['duval', 'Derribad los misiles que caen y llegad a la torre: tirad sus columnas piso a piso.']],
    radio: [[['pixel', 'La tormenta de arena os llevará hasta la torre. ¡Agarraos!']]],
    outro: [['duval', 'La torre ha caído. Buen trabajo, agentes.']],
  },
  // PRUEBA: el Titanic (zona larguísima con el iceberg gigante al final)
  {
    t: 'PRUEBA: TITANIC', z: ['titanic'], test: true, zd: 2,
    intro: [['pixel', 'Noche polar, aurora boreal. Un transatlántico enorme navega directo hacia el iceberg por el que vais.'], ['duval', 'Aguantad el choque, recorred las cubiertas mientras se hunde y salid de ahí como sea.']],
    radio: [[['pixel', '¡Agarraos! ¡Ese barco no va a frenar!']]],
    outro: [['duval', 'Habéis sobrevivido al Titanic. Y al iceberg. Increíble, agentes.']],
  },
  // PRUEBA: el pueblo del Oeste (como si hubierais disparado al cartel de OLD TOWN)
  {
    t: 'PRUEBA: OLD TOWN', z: ['dunas'], test: true, zd: 2, west: true,
    intro: [['pixel', 'Hay un pueblo perdido entre las dunas: OLD TOWN. Dicen que allí vive el pistolero más rápido del Oeste.'], ['duval', 'Revienta las casas, desmonta la mansión pared a pared y, al final, gana el duelo. No dispares antes de tiempo.']],
    radio: [[['pixel', 'Girad a la derecha por las dunas: el pueblo está detrás.']]],
    outro: [['duval', 'Duelo ganado. Ese revólver es tuyo, agente.']],
  },
  // PRUEBA (siempre desbloqueado, no cuenta para el progreso): la ciudad zombi suelta
  {
    t: 'PRUEBA: CIUDAD ZOMBI', z: ['zombi'], test: true, zd: 2,
    intro: [['pixel', 'Algo ha pasado en la ciudad. Los vecinos... ya no son vecinos.'], ['duval', 'Hay un hospital en la avenida principal. Bajad, buscad la llave de la salida y salid por detrás.'], ['pixel', 'Cuidado con los gordos: si llegan al coche, os paran en seco.']],
    radio: [[['pixel', 'El hospital está más adelante. Aguantad las hordas hasta llegar.']]],
    outro: [['duval', 'Habéis salido del hospital con vida. Buen trabajo, agentes.']],
  },
];
