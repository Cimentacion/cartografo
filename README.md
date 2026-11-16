# Kebab Poniente

Juego de terror en primera persona con estética PS2: llevas un kebab de madrugada en Benidorm, de 23:00 a 06:00. Cortas la carne del asador, montas los pedidos, atiendes a 28 clientes distintos y decides cuándo descolgar la escopeta.

Disponible en **español, inglés y rumano** (se elige en el menú).

## Jugar

https://raw.githack.com/Cimentacion/cartografo/kebab-poniente/index.html

También vale descargar el repositorio y abrir `index.html` en un navegador: no necesita servidor.

## Jugar online con un amigo

1. Los dos abrís el mismo enlace.
2. Uno pulsa **Crear sala** y le pasa al otro el código de 4 cifras, o el enlace que aparece debajo (lleva el código detrás de `#`).
3. El otro escribe el código y pulsa **Unirse** (con el enlace entra solo).
4. Quien pulse **Abrir el local** empieza el turno; el resto entra a ayudar. Se puede entrar con la partida ya empezada.

La conexión va de navegador a navegador con PeerJS, sin cuentas ni servidor propio. Quien crea la sala hace de centro: si cierra la pestaña, los demás siguen cada uno por su cuenta. En algunas redes muy cerradas (ciertas wifis de empresa o datos móviles) puede no conectar.

Dentro de Claude, publicado como artefacto con la capacidad `room` (`dist/kebab-poniente.artifact.html`), el cooperativo usa la sala del propio artefacto y no hacen falta códigos.

## Controles

| | |
|---|---|
| Vespino | E subir y bajar · W/S gas y freno · A/D girar |
| P o Esc | pausa (en solitario) |
| WASD + ratón | moverse y mirar |
| E o clic | usar, coger, entregar |
| Clic con la escopeta | disparar (R recarga) |
| Mando | sticks, A usar, RT disparar/cortar, X recargar, B salir |
| Táctil | mitad izquierda mover, derecha mirar, toque para usar |

## Cómo va una noche

1. El cliente pide en el mostrador y su comanda aparece a la derecha.
2. Coges pan o caja, cortas carne del asador (solo la dorada: la recién descubierta sale cruda) y la echas de la bandeja.
3. Verdura, salsas, papel de aluminio y a la mano del cliente. Patatas en la freidora, bebidas en la nevera.
4. La verdura se acaba: se trae del almacén y se pica en la tabla.
5. Junto a la freidora hay una nota del cocinero anterior con las reglas del turno de noche. Conviene leerla.
6. **Reparto a domicilio.** Suena el teléfono: descuelga y toma nota (a veces no se oye nada, y ese pedido va a un 13º). Mete el pedido en la bolsa roja junto a la puerta, pon el cartel de CERRADO en el escaparate y ve en la Vespino. Las torres no dan a la calle: cruzas la cancela y la zona común de la comunidad hasta el portal, llamas al portero automático (la del pedido tiene la luz encendida) y te abren. A veces el cliente dice que baja y te espera en el portal; si no, sube en el ascensor o por la escalera hasta su planta y llama a la puerta. La luz de los rellanos y de la escalera es de temporizador. Bajo algunas farolas aparecen sombras, y en el solar hay perros.
7. Si sales y dejas el local vacío con el cartel en ABIERTO, a veces (1 de cada 20) al volver hay espíritus. No atacan: se quedan mirándote y en las paredes van saliendo caras que ya no se borran en toda la partida.
8. El barrio es el de verdad: unos 600 × 500 m de Levante, en Benidorm, alrededor del supermercado Veracruz, sacados de OpenStreetMap. Están en su sitio los 368 edificios con su altura y su nombre (Torre Levante, Edif. Coblanca, Edif. Tanit…), las calles, el Paseo de Levante y la playa, los jardines, piscinas y tapias de las comunidades con sus cancelas, las paradas de bus, los bancos, las papeleras y contenedores, las farolas, las palmeras y unos 115 comercios con su nombre real (bares, súper, masajes, farmacias, tiendas de recuerdos…). El local está en la planta baja del Edif. Carolina.
9. No hay pantallas de carga ni teletransportes: los portales, rellanos, escaleras y el ascensor están dentro de cada torre de reparto, a la altura que toca. Desde la escalera de un 9º ves la calle de verdad por el hueco.
9. Hay ratas y cucarachas por el suelo del local. No hacen nada y no se pueden matar.
10. Si a un pedido a domicilio solo le falta la bebida, puedes llevarte la bolsa y comprarla en una de las máquinas de la calle (luz azul). Se paga de la caja, al mismo precio.
11. La Avenida del Mediterráneo y la de Europa están iluminadas: farolas que funcionan y, en el Mediterráneo, tiendas abiertas. En las demás calles hay locales cerrados, contenedores, basura y algún vagabundo durmiendo con su perro, que te ladra si pasas cerca.
12. Los botes de salsa del mostrador se pueden coger: mantén Fuego para echar un chorro. Mancha el suelo, las paredes (se puede dibujar) y a quien pilles, y los clientes y compañeros lo comentan.
13. Fuera hay una flecha verde arriba que apunta a donde tienes que ir: la cancela del pedido, el portal o, sin pedido, el local.
14. **Salsas de verdad.** Las salsas salen de barreños metálicos del mostrador con una cuchara sopera, y se gastan. En la olla del almacén se hace salsa nueva: eliges para qué barreño, echas cucharadas (mayonesa, yogur, tomate, ajo, guindilla… y cosas que no se dicen: sangre, orina, fluido de hombre, aceite de la freidora, agua de fregar, colillas) y remueves con el dedo dando vueltas dentro de la olla. Si das vueltas muy rápido, salpica. Luego se llena una garrafa de gasolina y se vierte en el barreño, que se va llenando poco a poco. Los botes de apretar se gastan y se rellenan en el barreño o con la garrafa. A los clientes las cosas raras les pueden encantar (propina), escamar o dar asco.
15. **Libro de cuentas.** Al acabar la noche sale un libro en 3D: se pasan las páginas y se toca una para comprar. Hay más asadores, rollos más grandes, barreños de alioli y barbacoa (los clientes empiezan a pedirlas), mesas de Cruzcampo en la terraza y pósters para las paredes (La Meca, el sello halal, mujeres con burka y un kebab de foto).
16. **Terraza.** En las mesas los clientes se sientan, te llaman, les tomas nota y les dejas la comida en la mesa. Comen y pagan al terminar.
17. **Super Cheap Market.** El súper paquistaní del mapa se puede visitar: góndolas llenas, neveras y la caja con Imran. Venden bebidas, ajos, guindillas y barbacoa, todo carísimo.
18. **Grupos.** Llegan grupos que piden por todos: amigos que quieren halal (kufiya, gorro kufi, turbante), una familia con hiyab y una familia gitana que pide mucho pollo. Los acompañantes van detrás y se sientan en la otra silla.
19. Los pedidos de la derecha se pliegan deslizando hacia la derecha o tocando el nombre (tecla T en el ordenador); se quedan en un iconito con el número de pedidos.
8. Disparar a un cliente delante de testigos acaba la partida. Si no lo ha visto nadie, el cuerpo se puede arrastrar a la mesa del almacén, despiezarlo y montar la carne en un asador, antes de que entre el siguiente cliente y lo vea.

## Estructura

```
index.html                  página del juego, generada
js/                         código y texturas en archivos pequeños, generados
lib/                        three.js r128 y PeerJS 1.5.4
dist/                       versión para publicar como artefacto de Claude, generada
src/page.html               HTML y CSS
src/02_data.js              clientes, pedidos y textos en español
src/02b_i18n.js             inglés y rumano, y las frases que dependen del idioma
src/03_audio.js             todo el sonido, sintetizado con WebAudio
src/04_scene.js             el local, las luces y los asadores
src/05_chars.js             personajes: caras y ropa dibujadas por código
src/06_sim.js               simulación, acciones y red del cooperativo
src/02d_map.js              el barrio sacado de OpenStreetMap, generado por tools/osm2town.py
src/04b_town.js             calles, playa, tapias, árboles, farolas y coches aparcados
src/04c_streetlife.js       comercios, máquinas, basura, vagabundos y bancos
src/04d_tower.js            fachadas, portales, escalera y ascensor de cada torre
src/07_game.js              entrada, cámara, HUD y bucle principal
assets/textures/            texturas originales (ver SOURCES.md)
tools/build.py              une todo en un solo archivo
tools/osm2town.py           convierte data/osm.json en src/02d_map.js
tools/fetch/                lo que baja el mapa y las texturas (workflow fetch-benidorm.yml)
```

## Compilar

```
pip install pillow
python3 tools/build.py
```

## Añadir un idioma

En `src/02b_i18n.js`: añade el código a `LANGS` y una entrada en `LX`, `STR`, `JOB`, `CTL`, `RULESX`, `MSGX`, `GENX`, `ANOMX` y `XL`. Después añade su botón en `src/page.html` (`data-lang`).

## Créditos

- Texturas: *SBS - Horror Texture Pack 256x256*, de Screaming Brain Studios, CC0 1.0; y texturas de calle de ambientCG.com, CC0 1.0.
- Mapa: © colaboradores de OpenStreetMap, bajo licencia ODbL (openstreetmap.org/copyright).
- three.js r128 (MIT) y PeerJS 1.5.4 (MIT), incluidos en `lib/`.
- Fuentes Anton e IBM Plex Mono (SIL Open Font License), desde Google Fonts.

---

## English

First-person PS2-style horror game: you run a kebab shop in Benidorm through the night, 11 pm to 6 am. Carve the meat, build the orders, serve 28 different customers and decide when to take the shotgun off the wall. Playable in Spanish, English and Romanian; pick the language in the menu.

Play at the link above or open `index.html`. To play online with a friend, both open the same link: one presses **Create room** and shares the 4-digit code or the link shown; the other types the code and presses **Join**. Whoever opens the shop first hosts the shift. To rebuild: `pip install pillow && python3 tools/build.py`.

## Română

Joc horror la persoana întâi, în stil PS2: ții un kebab în Benidorm toată noaptea, de la 23:00 la 06:00. Tai carnea, pregătești comenzile, servești 28 de clienți diferiți și hotărăști când iei pușca de pe perete. Se poate juca în spaniolă, engleză și română; limba se alege din meniu.

Joacă de la linkul de mai sus sau deschide `index.html`. Ca să jucați online în doi, deschideți amândoi același link: unul apasă **Creează o cameră** și îi dă celuilalt codul din 4 cifre sau linkul afișat; celălalt scrie codul și apasă **Intră**. Cine deschide primul localul pornește tura. Pentru build: `pip install pillow && python3 tools/build.py`.
