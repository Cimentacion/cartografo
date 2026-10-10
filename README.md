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
6. Disparar a un cliente delante de testigos acaba la partida. Si no lo ha visto nadie, el cuerpo se puede arrastrar a la mesa del almacén, despiezarlo y montar la carne en un asador, antes de que entre el siguiente cliente y lo vea.

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
src/07_game.js              entrada, cámara, HUD y bucle principal
assets/textures/            texturas originales (ver SOURCES.md)
tools/build.py              une todo en un solo archivo
```

## Compilar

```
pip install pillow
python3 tools/build.py
```

## Añadir un idioma

En `src/02b_i18n.js`: añade el código a `LANGS` y una entrada en `LX`, `STR`, `JOB`, `CTL`, `RULESX`, `MSGX`, `GENX`, `ANOMX` y `XL`. Después añade su botón en `src/page.html` (`data-lang`).

## Créditos

- Texturas: *SBS - Horror Texture Pack 256x256*, de Screaming Brain Studios, CC0 1.0.
- three.js r128 (MIT) y PeerJS 1.5.4 (MIT), incluidos en `lib/`.
- Fuentes Anton e IBM Plex Mono (SIL Open Font License), desde Google Fonts.

---

## English

First-person PS2-style horror game: you run a kebab shop in Benidorm through the night, 11 pm to 6 am. Carve the meat, build the orders, serve 28 different customers and decide when to take the shotgun off the wall. Playable in Spanish, English and Romanian; pick the language in the menu.

Play at the link above or open `index.html`. To play online with a friend, both open the same link: one presses **Create room** and shares the 4-digit code or the link shown; the other types the code and presses **Join**. Whoever opens the shop first hosts the shift. To rebuild: `pip install pillow && python3 tools/build.py`.

## Română

Joc horror la persoana întâi, în stil PS2: ții un kebab în Benidorm toată noaptea, de la 23:00 la 06:00. Tai carnea, pregătești comenzile, servești 28 de clienți diferiți și hotărăști când iei pușca de pe perete. Se poate juca în spaniolă, engleză și română; limba se alege din meniu.

Joacă de la linkul de mai sus sau deschide `index.html`. Ca să jucați online în doi, deschideți amândoi același link: unul apasă **Creează o cameră** și îi dă celuilalt codul din 4 cifre sau linkul afișat; celălalt scrie codul și apasă **Intră**. Cine deschide primul localul pornește tura. Pentru build: `pip install pillow && python3 tools/build.py`.
