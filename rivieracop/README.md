# Riviera Cop

Roguelike de disparos sobre raíles al estilo Virtua Cop, cooperativo online para dos móviles Android.

- Se apunta girando el móvil (giroscopio) y se dispara tocando la pantalla.
- Los dos jugadores van en el mismo descapotable, al mismo ritmo: sales de un túnel y bajas hacia Mónaco.
- Aviso de disparo: círculo que se cierra sobre el enemigo que te va a disparar; si está fuera de pantalla, flecha en el borde para girar el móvil.
- Cada ~1 min, desvío: se dispara a los carteles y gana la ruta con más disparos (Mónaco, Puerto, Casino, Autopista, Zona industrial, La Cornisa).
- Cada ~3 min, terrorista: al matarlo suelta un arma con stats aleatorios; se la lleva el primero que le dé 5 veces.
- Ambulancias (revientan y sueltan botiquines: +1 vida o revivir al compañero), camiones de gallinas, motoristas, coches, helicópteros, drones, francotiradores, granaderos, barriles…
- 3 vidas por jugador.

## Online

Sin servidor propio: PeerJS (WebRTC). Uno pulsa **CREAR SALA**, le pasa el código de 4 letras al otro, que pulsa **UNIRSE**.
El que crea la sala hace de anfitrión (lleva la partida); el otro recibe el estado 20 veces por segundo.

## Parámetros de prueba (TODO-TESTEO)

`?bot=1` apunta y dispara solo · `?god=1` sin daño · `?ts=3` acelera el tiempo · `?nr=4` pinta 1 de cada N fotogramas · `?peerhost=127.0.0.1&peerport=9000` servidor PeerJS local · `?hq=1` resolución completa.
