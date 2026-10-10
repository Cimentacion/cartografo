# Kebab Poniente

Juego de terror en primera persona con estética PS2: llevas un kebab de madrugada en Benidorm, de 23:00 a 06:00. Cortas la carne del asador, montas los pedidos, atiendes a 28 clientes distintos y decides cuándo descolgar la escopeta.

Disponible en **español, inglés y rumano** (se elige en el menú).

## Jugar

- Abre `index.html` en un navegador. Es un único archivo: las texturas van incrustadas y solo se descarga three.js y las fuentes.
- O activa GitHub Pages sobre la rama principal y entra en la URL del repositorio.

Aquí se juega en solitario. El cooperativo usa la sala en tiempo real de los artefactos de Claude: para jugar de dos, publica `dist/kebab-poniente.artifact.html` como artefacto con la capacidad `room` y comparte el enlace.

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

## Estructura

```
index.html                  juego completo, generado
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
- three.js r128 (MIT), cargado desde cdnjs.
- Fuentes Anton e IBM Plex Mono (SIL Open Font License), desde Google Fonts.

---

## English

First-person PS2-style horror game: you run a kebab shop in Benidorm through the night, 11 pm to 6 am. Carve the meat, build the orders, serve 28 different customers and decide when to take the shotgun off the wall. Playable in Spanish, English and Romanian; pick the language in the menu.

Open `index.html` to play solo. Co-op needs the real-time room of Claude artifacts: publish `dist/kebab-poniente.artifact.html` as an artifact with the `room` capability. To rebuild: `pip install pillow && python3 tools/build.py`.

## Română

Joc horror la persoana întâi, în stil PS2: ții un kebab în Benidorm toată noaptea, de la 23:00 la 06:00. Tai carnea, pregătești comenzile, servești 28 de clienți diferiți și hotărăști când iei pușca de pe perete. Se poate juca în spaniolă, engleză și română; limba se alege din meniu.

Deschide `index.html` ca să joci singur. Modul în doi folosește camera în timp real a artefactelor Claude: publică `dist/kebab-poniente.artifact.html` ca artefact cu capabilitatea `room`. Pentru build: `pip install pillow && python3 tools/build.py`.
