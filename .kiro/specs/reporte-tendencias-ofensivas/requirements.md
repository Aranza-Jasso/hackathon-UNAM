# Requirements Document

## Introduction

Aplicación web (FastAPI + React) que genera reportes de tendencias ofensivas de pase por equipo, por QB y por partido, y anima cualquier jugada de pase en un campo 2D, con datos de las semanas 1 a 8 de la temporada 2021 de la NFL. Todas las cifras las calcula el backend con pandas a partir de `data/`. El MVP no usa IA. Si sobra tiempo, se puede añadir una búsqueda con Amazon Nova (Opcional A) que solo interpreta la pregunta y elige qué reporte ya calculado mostrar, sin generar ni modificar cifras.

Fuente de datos: `data/nfl-big-data-bowl-regional-event-data-main/data/` (`plays.csv`, `games.csv`, `players.csv`, `pffScoutingData.csv` y `tracking/tracking_<gameId>.csv`). El tracking solo se usa para las animaciones y se lee por partido bajo demanda.

## Glossary

- **Jugada de pase**: una fila de `plays.csv` (8,557 en total). El dataset solo contiene jugadas de pase.
- **QB de la jugada**: el jugador con `pff_role = "Pass"` en `pffScoutingData.csv` para ese `gameId` + `playId`. Hay exactamente uno por jugada; 60 jugadores distintos.
- **Intento**: jugada con `passResult` en {C, I, IN}.
- **% de completos**: jugadas con `passResult = C` / intentos.
- **Yardas por jugada**: promedio de `prePenaltyPlayResult` sobre todas las jugadas del grupo (incluye sacks y scrambles). No equivale a "yardas por pase" oficiales.
- **Tasa de sack**: jugadas con `passResult = S` / jugadas.
- **Tasa de intercepción**: jugadas con `passResult = IN` / intentos.
- **Tasa de scramble**: jugadas con `passResult = R` / jugadas.
- **% de play action**: promedio de `pff_playAction`.
- **Jugada con presión**: jugada en la que al menos un jugador tiene `pff_hit`, `pff_hurry` o `pff_sack` igual a 1.
- **Distancia**: corta = `yardsToGo` 1–3; media = 4–7; larga = 8 o más.
- **Muestra pequeña**: grupo con n < 20 jugadas.
- **Frame**: una fila por entidad (22 jugadores + balón = 23) en un instante de la jugada; hay 10 frames por segundo. Las filas del balón tienen `team = "football"` y `nflId` vacío.
- **Promedio de liga**: la misma métrica calculada sobre todas las jugadas que cumplen los mismos filtros de situación (down, distancia, cuarto), sin filtrar por equipo.

## Requirements

### Requisito 1: Carga de datos y salud del servicio

**Historia de usuario:** Como equipo, quiero que el backend cargue los datos al arrancar para responder sin escribir en disco.

1. CUANDO el servidor arranca, el sistema DEBERÁ leer `plays.csv`, `games.csv`, `players.csv` y `pffScoutingData.csv` con rutas relativas a la raíz del proyecto, sin modificarlos ni escribir archivos. Los archivos de tracking NO DEBERÁN cargarse al arrancar.
2. `GET /health` DEBERÁ responder `{"status": "ok"}`.
3. Toda la API DEBERÁ estar bajo `/api/...`.

### Requisito 2: Reporte por equipo

**Historia de usuario:** Como analista defensivo, quiero ver cómo pasa el balón un equipo para preparar el partido contra él.

1. `GET /api/equipos` DEBERÁ devolver los 32 códigos de equipo presentes en `possessionTeam`.
2. CUANDO el usuario elige un equipo, el sistema DEBERÁ mostrar: número de jugadas (n), % de uso por `offenseFormation`, % de uso de las 5 combinaciones de `personnelO` más usadas, % de play action, % de completos, yardas por jugada, tasa de sack, tasa de intercepción, tasa de scramble y % de jugadas con presión.
3. El sistema DEBERÁ permitir filtrar por down (1, 2, 3, 4), distancia (corta, media, larga) y cuarto (1, 2, 3, 4, tiempo extra = 5). Las jugadas con `down = 0` (35) solo se incluyen cuando no hay filtro de down.
4. Cada métrica DEBERÁ mostrarse junto a su promedio de liga y su n.
5. CUANDO un grupo tenga n < 20, el dashboard DEBERÁ marcarlo como "muestra pequeña".
6. El sistema DEBERÁ mostrar los resultados (% de completos y yardas por jugada) desglosados por `pff_passCoverage` enfrentada y por `pff_passCoverageType` (Man, Zone, Other).
7. El sistema DEBERÁ listar las jugadas filtradas con semana, rival, down, distancia, `playDescription` y `passResult`, y cada fila DEBERÁ abrir la animación de esa jugada (Requisito 5).

**Verificación:** para KC sin filtros, n = 339 y SHOTGUN = 75 %; para NO sin filtros, n = 203.

### Requisito 3: Reporte por QB

**Historia de usuario:** Como analista, quiero consultar el rendimiento de un QB específico.

1. `GET /api/qbs` DEBERÁ devolver los 60 pasadores con `nflId`, `displayName`, equipo(s) y número de jugadas.
2. CUANDO el usuario elige un QB, el sistema DEBERÁ mostrar: jugadas, intentos, % de completos, yardas por jugada, tasa de sack, tasa de intercepción, tasa de scramble, % de play action, % de jugadas con presión, y % de completos y yardas por jugada contra Man y contra Zone, cada una con su n.
3. El sistema DEBERÁ mostrar el desglose por partido (semana, rival, jugadas, % de completos, yardas por jugada) y la lista de jugadas del QB, donde cada fila abre su animación (Requisito 5).
4. El sistema DEBERÁ identificar a los QBs por `nflId`, porque `players.csv` contiene nombres repetidos.
5. CUANDO el QB tenga menos de 20 jugadas, el dashboard DEBERÁ marcar el reporte como "muestra pequeña" (17 pasadores están en este caso).

**Verificación:** Patrick Mahomes = 322 jugadas; Jared Goff = 326; Tom Brady = 306.

### Requisito 4: Reporte por partido

**Historia de usuario:** Como analista, quiero ver el resumen del juego aéreo de un partido.

1. `GET /api/partidos` DEBERÁ devolver los 122 partidos con `gameId`, semana, fecha, equipo local y visitante.
2. CUANDO el usuario elige un partido, el sistema DEBERÁ mostrar, para cada equipo: jugadas de pase, % de completos, yardas por jugada, sacks, intercepciones, % de jugadas con presión, QB(s) que lanzaron y coberturas enfrentadas (conteo por `pff_passCoverage`).
3. El sistema DEBERÁ listar las jugadas de pase del partido en orden (cuarto, reloj), y cada fila DEBERÁ abrir su animación (Requisito 5).
4. El sistema NO DEBERÁ mostrar un marcador final: el dataset solo trae el marcador antes de cada jugada de pase y no incluye la última anotación (por ejemplo, el partido 2021090900 termina con 28-29 registrado antes de la última jugada de pase). Si se muestra, DEBERÁ etiquetarse como "marcador antes de la última jugada de pase registrada".

### Requisito 5: Animación de jugadas

**Historia de usuario:** Como analista, quiero ver cómo se mueven los 22 jugadores y el balón en una jugada para entender la formación, la protección y la presión.

1. `GET /api/jugadas/{gameId}/{playId}/tracking` DEBERÁ leer solo `tracking_<gameId>.csv`, filtrar por `playId` y devolver los frames ordenados por `frameId`, con `nflId`, `jerseyNumber`, `team`, `x`, `y`, `s` y `event` de cada entidad, junto con los datos de la jugada de `plays.csv` (`playDescription`, cuarto, down, `yardsToGo`, `passResult`, `pff_passCoverage`, `absoluteYardlineNumber`) y el `playDirection` del tracking.
2. SI `gameId` y `playId` no existen juntos en `plays.csv`, el endpoint DEBERÁ responder 404 sin intentar abrir ningún archivo. La ruta del archivo DEBERÁ construirse solo a partir de un `gameId` validado.
3. El dashboard DEBERÁ dibujar un campo en SVG de 120 × 53.3 yardas, con zonas de anotación (x de 0 a 10 y de 110 a 120), líneas cada 10 yardas y la línea de scrimmage en x = `absoluteYardlineNumber`.
4. Cada jugador DEBERÁ dibujarse como un círculo con el color de su equipo y su `jerseyNumber`; el balón DEBERÁ distinguirse de los jugadores. El QB de la jugada (`pff_role = "Pass"`) y los defensores con `pff_hit`, `pff_hurry` o `pff_sack` = 1 DEBERÁN resaltarse, con una leyenda que lo explique.
5. El dashboard DEBERÁ tener controles de reproducir/pausar, reiniciar, barra para moverse por frame y velocidades 0.5×, 1× y 2×. A 1×, cada frame DEBERÁ durar 100 ms (10 frames por segundo).
6. Durante la reproducción, el dashboard DEBERÁ mostrar el número de frame, el último evento ocurrido (por ejemplo `ball_snap`, `pass_forward`, `qb_sack`) y los segundos transcurridos desde `ball_snap`.
7. El dashboard DEBERÁ mostrar el aviso: "El tracking termina poco después del lanzamiento, el sack o el inicio del scramble; no incluye la recepción ni la carrera posterior."
8. La animación DEBERÁ implementarse con React y SVG, sin dependencias nuevas.

**Verificación:** la jugada 2021090900 / 97 (T.Brady, incompleto a C.Godwin, Cover-1) DEBERÁ tener 23 entidades en cada frame. Para comprobar que la línea de scrimmage está bien dibujada, la mediana de |x del balón en el frame de `ball_snap` − `absoluteYardlineNumber`| DEBERÁ ser menor a 1 yarda. En los primeros 10 partidos (766 jugadas) es 0.31 yardas, y no es exacta en cada jugada: en la 97 el balón está en x = 41.56 y la línea en 43. Una solicitud con un `playId` que no existe DEBERÁ devolver 404.

### Requisito 6: Dashboard y despliegue

1. El dashboard DEBERÁ tener tres vistas: Equipo, QB y Partido. Cada vista DEBERÁ abrirse con selectores, y la animación se abre desde las listas de jugadas de cualquier vista.
2. Las gráficas DEBERÁN hacerse con Recharts: barras de formaciones, personal y coberturas, cada una comparada con la liga.
3. Todas las llamadas DEBERÁN usar rutas relativas sin diagonal inicial (`fetch('api/...')`).
4. `vite.config.ts` DEBERÁ conservar `base: './'` y un proxy de `/api` hacia `http://localhost:8000`.
5. `vite build` DEBERÁ generar `dashboard/dist` sin errores.
6. El MVP NO DEBERÁ depender de Bedrock ni de Strands: la app completa DEBERÁ funcionar sin `.env` ni conexión a AWS.

## Opcional (solo si sobra tiempo después de terminar y verificar los Requisitos 1–6)

### Opcional A: Preguntas en lenguaje natural con Amazon Nova

Se empieza solo si el MVP está terminado. Si no se alcanza, no se agrega código de IA y no hace falta quitar nada.

**Historia de usuario:** Como usuario, quiero escribir una pregunta como "¿Cómo le fue a Mahomes?" o "Partido de TB contra DAL" y ver el reporte correspondiente.

1. `POST /api/preguntar` DEBERÁ recibir `{"pregunta": "<texto>"}` y usar un agente de Strands con Amazon Nova en Bedrock que solo pueda llamar herramientas de consulta: buscar QB por nombre, buscar partido por equipos y/o semana, y obtener el reporte de equipo.
2. Las cifras de la respuesta DEBERÁN salir directamente de las mismas funciones de pandas de los Requisitos 2–4. La respuesta DEBERÁ tener la forma `{"tipo": "qb" | "partido" | "equipo" | "sin_resultado", "datos": {...}}`, y el dashboard DEBERÁ mostrar `datos` con los mismos componentes de los reportes. El texto del modelo no se usa para mostrar cifras.
3. CUANDO la búsqueda tenga varias coincidencias (por ejemplo, un nombre parcial que coincide con varios QBs, o "partidos de KC", que coincide con todos los partidos de KC), el sistema DEBERÁ devolver la lista de candidatos para que el usuario elija. Cada pareja local-visitante aparece una sola vez en `games.csv`, así que "TB contra DAL" identifica un único partido.
4. CUANDO la pregunta pida algo que el dataset no contiene (carreras, touchdowns como estadística, marcador final, semanas posteriores a la 8, otras temporadas), el sistema DEBERÁ responder `tipo = "sin_resultado"` con un mensaje fijo que lo explique.
5. El modelo DEBERÁ leerse con `os.environ.get("BEDROCK_MODEL_ID", "us.amazon.nova-pro-v1:0")` y la región con `os.environ.get("AWS_REGION", "us-east-1")`; el cliente se crea solo con la región y sin llaves en el código. En local, el `.env` se carga con la función `cargar_env()` de las reglas del proyecto al inicio de `backend/main.py`, sin agregar dependencias. No se leen ni se verifican variables de credenciales.
6. SI la llamada a Bedrock lanza cualquier error, `/api/preguntar` DEBERÁ responder con el mensaje "Búsqueda con IA no disponible; usa los selectores", y el resto de la app DEBERÁ seguir funcionando.
7. La caja de pregunta se agrega arriba de las tres vistas, sin cambiar los selectores.

## Fuera de alcance del MVP

- Métricas calculadas sobre todo el tracking (tiempo de lanzamiento por QB, velocidades promedio): requieren procesar los 122 archivos.
- Animar la recepción o la carrera después del pase: el tracking no las incluye.
- Jugadas de carrera, touchdowns, marcador final y estadísticas oficiales de yardas por pase: no existen en el dataset de forma directa.
- Predicciones o recomendaciones generadas por IA.
- Rendimiento individual de receptores (el dataset no indica el receptor objetivo).
