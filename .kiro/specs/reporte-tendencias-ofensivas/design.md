# Design Document

## Overview

El backend (FastAPI + pandas) carga cuatro CSV al arrancar, une la información por jugada en una sola tabla en memoria y calcula los reportes en cada solicitud filtrando esa tabla. El tracking se lee por partido solo cuando se pide una animación. El dashboard (React + Vite + TypeScript + Tailwind 3 + Recharts) tiene tres vistas (Equipo, QB, Partido) y un visor de jugadas en SVG.

Decisiones principales:

- **Una tabla enriquecida de jugadas (`JUGADAS`)** con todo lo que necesitan los reportes. Son 8,557 filas: filtrar y agrupar en cada solicitud toma milisegundos, así que no se precalculan reportes.
- **Una sola función de métricas (`resumen`)** que usan los tres reportes y el promedio de liga. Así las cifras son consistentes entre vistas.
- **Tracking bajo demanda** con caché en memoria de los últimos partidos leídos. Nada se escribe en disco.
- **El backend no sirve `dashboard/dist`.** `backend/main.py` de la plantilla no lo hace y `.hackathon/setup.py` excluye `dist` del zip de entrega, así que el hosting compila y sirve el build. En desarrollo, Vite hace proxy de `/api`.
- **Colores de jugadores:** el dataset no trae colores de equipo, así que se usan dos colores fijos: ofensiva (`possessionTeam`) y defensiva.

## Architecture

```
data/…/plays.csv, games.csv, players.csv, pffScoutingData.csv
        │  (al arrancar)
        ▼
backend/datos.py ── JUGADAS (DataFrame en memoria), PARTIDOS, QBS, PRESION_POR_JUGADA
        │
        ├── backend/metricas.py   resumen(), distribucion(), por_cobertura()
        ├── backend/reportes.py   reporte_equipo(), reporte_qb(), reporte_partido()
        └── backend/tracking.py   tracking_jugada()  ← tracking_<gameId>.csv (bajo demanda, lru_cache)
        │
        ▼
backend/main.py  (FastAPI: /health, /api/...)
        │  JSON
        ▼
dashboard/src  (fetch('api/...'))
  App.tsx ── VistaEquipo / VistaQB / VistaPartido ── VisorJugada (SVG)
```

Estructura de archivos nuevos o modificados:

```
backend/
  main.py        # rutas (modificado)
  datos.py       # carga y tabla JUGADAS
  metricas.py    # funciones de métricas puras
  reportes.py    # armado de los tres reportes
  tracking.py    # lectura de tracking por jugada
  tests/test_api.py   # opcional, pytest + httpx (ya instalados)
dashboard/
  vite.config.ts # agrega server.proxy (modificado)
  src/
    App.tsx      # pestañas y estado global (reemplaza la plantilla)
    api.ts       # funciones fetch('api/...') y tipos
    tipos.ts     # interfaces TypeScript de las respuestas
    componentes/
      Filtros.tsx, Tarjetas.tsx, GraficaComparada.tsx,
      TablaCoberturas.tsx, TablaJugadas.tsx, AvisoMuestra.tsx
    vistas/
      VistaEquipo.tsx, VistaQB.tsx, VistaPartido.tsx
    visor/
      VisorJugada.tsx, Campo.tsx
```

## Components and Interfaces

### backend/datos.py (Requisito 1)

Ruta base: `RAIZ = Path(__file__).resolve().parent.parent` y `DATOS = RAIZ / "data/nfl-big-data-bowl-regional-event-data-main/data"`.

Al importar el módulo se construye:

| Objeto | Contenido |
|---|---|
| `JUGADAS` | `plays.csv` + columnas derivadas (abajo). Índice por (`gameId`, `playId`). |
| `PARTIDOS` | `games.csv`. |
| `QBS` | Por `nflId` del pasador: `displayName`, equipos (`possessionTeam` únicos), número de jugadas. |
| `CLAVES` | `set` de tuplas (`gameId`, `playId`) válidas, para validar el tracking. |
| `ROLES` | De `pffScoutingData.csv`, por jugada: `qb_id` y lista `presion_ids` (defensores con hit, hurry o sack = 1). |

Columnas derivadas en `JUGADAS`:

- `qb_id`, `qb_nombre`: del jugador con `pff_role == "Pass"`, unido a `players.csv`.
- `presion`: `True` si algún jugador de la jugada tiene `pff_hit`, `pff_hurry` o `pff_sack` igual a 1.
- `distancia`: `corta` (1–3), `media` (4–7), `larga` (8+), con `pd.cut` sobre `yardsToGo`.
- `semana`, `local`, `visitante`: unidas desde `games.csv`.
- `rival`: `defensiveTeam`.
- `reloj_seg`: `gameClock` "MM:SS" convertido a segundos, para ordenar.

### backend/metricas.py (Requisitos 2–4)

Funciones puras sobre un DataFrame. Las definiciones son exactamente las del glosario de requirements.

```python
def resumen(df) -> dict
# {n, intentos, pct_completos, yardas_por_jugada, tasa_sack, tasa_int,
#  tasa_scramble, pct_play_action, pct_presion}
# Si el denominador es 0, el valor es None.

def distribucion(df, columna, top=None) -> list[dict]
# [{valor, n, pct}] ordenado por n descendente.

def por_grupo(df, columna) -> list[dict]
# [{valor, n, pct_completos, yardas_por_jugada}] (coberturas, man/zona, partidos).

def filtrar(df, down=None, distancia=None, cuarto=None) -> DataFrame
# Si down es None se incluyen las 35 jugadas con down = 0; si no, se filtra por ese down.
```

Los porcentajes se devuelven como fracción (0–1) redondeada a 4 decimales; el dashboard los formatea. Todos los valores se convierten a tipos de Python y `NaN` a `None` antes de responder.

### backend/reportes.py

- `reporte_equipo(abbr, down, distancia, cuarto)`:
  - `equipo = filtrar(JUGADAS[possessionTeam == abbr], …)` y `liga = filtrar(JUGADAS, …)`.
  - Devuelve `resumen` de ambos, `formaciones` y `personal` (top 5) con `pct_equipo` y `pct_liga` por valor, `coberturas` y `tipo_cobertura` con `por_grupo`, y `jugadas` (lista para la tabla).
- `reporte_qb(nfl_id)`: `resumen`, `por_grupo` de `pff_passCoverageType` (Man y Zone), `por_grupo` por partido (con semana y rival) y `jugadas`.
- `reporte_partido(game_id)`: datos de `games.csv`; para cada equipo, `resumen` de sus jugadas con posesión, sacks e intercepciones (conteos), QBs que lanzaron y `distribucion` de `pff_passCoverage` que enfrentó; `jugadas` ordenadas por `quarter` ascendente y `reloj_seg` descendente. No incluye marcador (Requisito 4.4).

Cada jugada de las listas tiene: `gameId`, `playId`, `semana`, `posesion`, `rival`, `quarter`, `gameClock`, `down`, `yardsToGo`, `passResult`, `playDescription`, `pff_passCoverage`.

### backend/tracking.py (Requisito 5)

```python
@lru_cache(maxsize=4)
def _leer_partido(game_id: int) -> DataFrame   # solo se llama con un gameId validado

def tracking_jugada(game_id: int, play_id: int) -> dict | None
```

1. Si `(game_id, play_id)` no está en `CLAVES`, devuelve `None` (la ruta responde 404) sin abrir archivos. Como `game_id` es `int` validado contra datos conocidos, la ruta `DATOS / "tracking" / f"tracking_{game_id}.csv"` no puede apuntar a otro lugar.
2. Lee el CSV con `usecols` (`playId, frameId, nflId, jerseyNumber, team, playDirection, x, y, s, event`), filtra `playId` y ordena por `frameId`.
3. `event == "None"` se convierte en `null`.
4. Frame del snap: el primero con `event` en {`ball_snap`, `autoevent_ballsnap`}; si no hay, `null`.

Respuesta:

```json
{
  "jugada": {"gameId", "playId", "playDescription", "quarter", "down", "yardsToGo",
             "passResult", "pff_passCoverage", "absoluteYardlineNumber",
             "posesion", "rival"},
  "playDirection": "right",
  "frame_snap": 11,
  "qb_id": 25511,
  "presion_ids": [ ... ],
  "frames": [
    {"frameId": 1, "event": null,
     "entidades": [{"nflId": 25511, "num": 12, "team": "TB", "x": 37.77, "y": 24.22, "s": 0.29}, ...]}
  ]
}
```

Tamaño típico: ~37 frames × 23 entidades (mediana del partido 2021090900), unos 900 objetos.

### backend/main.py (Requisitos 1 y 6)

Conserva `app` y `GET /health`. Rutas nuevas:

| Método y ruta | Parámetros | Respuesta | Errores |
|---|---|---|---|
| `GET /api/equipos` | | lista de 32 códigos ordenada | |
| `GET /api/equipos/{abbr}/reporte` | `down: Literal[1,2,3,4] \| None`, `distancia: Literal["corta","media","larga"] \| None`, `cuarto: Literal[1,2,3,4,5] \| None` | `reporte_equipo` | 404 si `abbr` no existe; 422 si un filtro no es válido |
| `GET /api/qbs` | | `[{nflId, nombre, equipos, jugadas}]` ordenada por jugadas | |
| `GET /api/qbs/{nfl_id}/reporte` | | `reporte_qb` | 404 si no es pasador |
| `GET /api/partidos` | | `[{gameId, semana, fecha, local, visitante}]` | |
| `GET /api/partidos/{game_id}/reporte` | | `reporte_partido` | 404 si no existe |
| `GET /api/jugadas/{game_id}/{play_id}/tracking` | | `tracking_jugada` | 404 si la pareja no existe |

FastAPI valida los tipos (`int`, `Literal`) y responde 422 por sí solo cuando no coinciden. Las respuestas son `dict` serializables; no hace falta un modelo Pydantic por respuesta para el MVP.

### Dashboard

**`vite.config.ts`**: `base: './'` y `server: { proxy: { '/api': 'http://localhost:8000' } }`. El proxy usa `/api` porque así llega la ruta al servidor de Vite; el código del dashboard sigue usando `fetch('api/...')`.

**`api.ts`**: una función por endpoint, todas con rutas relativas sin diagonal inicial, por ejemplo `fetch(\`api/equipos/${abbr}/reporte?${params}\`)`. Si `res.ok` es falso, lanza un error con el código para mostrarlo en pantalla.

**`App.tsx`**: pestañas Equipo / QB / Partido y estado `jugadaAbierta: {gameId, playId} | null`. Cuando no es `null`, muestra `VisorJugada` como panel sobre la vista.

**Componentes compartidos:**

- `Tarjetas`: una tarjeta por métrica con valor del grupo, valor de liga (si existe) y n. Formatea fracciones como porcentaje y `null` como "—".
- `AvisoMuestra`: etiqueta "muestra pequeña" cuando n < 20 (Requisitos 2.5 y 3.5).
- `GraficaComparada`: `BarChart` de Recharts con dos barras por valor (`pct_equipo`, `pct_liga`) para formaciones, personal y coberturas (Requisito 6.2).
- `TablaCoberturas`: tabla de `por_grupo` con n y aviso de muestra pequeña por fila.
- `TablaJugadas`: tabla con semana, rival, cuarto, reloj, down y distancia, resultado y descripción; al hacer clic en una fila llama `onAbrir(gameId, playId)`.
- `Filtros`: selects de down, distancia y cuarto (solo en la vista Equipo).

**Vistas:**

- `VistaEquipo`: select de equipo (de `/api/equipos`) + `Filtros` → `Tarjetas` (equipo vs. liga), gráficas de formación y personal, tablas de cobertura y tipo de cobertura, `TablaJugadas`.
- `VistaQB`: select de QB con nombre y equipo, ordenado por jugadas → `Tarjetas`, tabla Man/Zone, tabla por partido, `TablaJugadas`.
- `VistaPartido`: select de partido ("Semana N · VISITANTE @ LOCAL") → dos columnas, una por equipo, con `Tarjetas`, QBs y coberturas enfrentadas; `TablaJugadas` del partido.

**Visor de jugadas (`VisorJugada` + `Campo`)** (Requisito 5):

- `Campo` es un `<svg viewBox="0 0 120 53.3">`. Zonas de anotación como `rect` en x 0–10 y 110–120, líneas verticales cada 10 yardas, línea de scrimmage en `x = absoluteYardlineNumber`. El eje y se invierte (`53.3 − y`) para dibujar con la convención usual de pantalla.
- Jugadores: `circle` de radio ~1 con color de ofensiva o defensiva según `team == posesion`, y `text` con `num`. Balón: círculo más pequeño, color café. QB: borde amarillo grueso. Defensores en `presion_ids`: borde rojo. Leyenda debajo del campo.
- Estado: `indice` (frame actual), `reproduciendo`, `velocidad` (0.5, 1, 2). Un `setInterval` con periodo `100 / velocidad` ms avanza `indice` y se detiene en el último frame. Controles: reproducir/pausar, reiniciar, `<input type="range">` para elegir frame y botones de velocidad.
- Información: frame actual / total, último evento no nulo hasta el frame actual, y segundos desde el snap `(frameId − frame_snap) / 10` (negativo antes del snap; "—" si no hay snap).
- Debajo: descripción de la jugada, down y distancia, cobertura y resultado.
- Aviso fijo (Requisito 5.7): "El tracking termina poco después del lanzamiento, el sack o el inicio del scramble; no incluye la recepción ni la carrera posterior."

## Data Models

Tipos TypeScript principales (`tipos.ts`):

```ts
type Resumen = { n: number; intentos: number; pct_completos: number | null;
  yardas_por_jugada: number | null; tasa_sack: number | null; tasa_int: number | null;
  tasa_scramble: number | null; pct_play_action: number | null; pct_presion: number | null }

type Comparado = { valor: string; n_equipo: number; pct_equipo: number; pct_liga: number }
type Grupo = { valor: string; n: number; pct_completos: number | null; yardas_por_jugada: number | null }
type JugadaFila = { gameId: number; playId: number; semana: number; posesion: string; rival: string;
  quarter: number; gameClock: string; down: number; yardsToGo: number; passResult: string;
  playDescription: string; pff_passCoverage: string | null }

type ReporteEquipo = { equipo: Resumen; liga: Resumen; formaciones: Comparado[];
  personal: Comparado[]; coberturas: Grupo[]; tipo_cobertura: Grupo[]; jugadas: JugadaFila[] }
type ReporteQB = { qb: { nflId: number; nombre: string; equipos: string[] }; resumen: Resumen;
  man_zona: Grupo[]; por_partido: (Grupo & { semana: number; rival: string; gameId: number })[];
  jugadas: JugadaFila[] }
type ReportePartido = { partido: { gameId: number; semana: number; fecha: string; local: string; visitante: string };
  equipos: { equipo: string; resumen: Resumen; sacks: number; intercepciones: number;
    qbs: string[]; coberturas: { valor: string; n: number; pct: number }[] }[];
  jugadas: JugadaFila[] }
type Tracking = { jugada: JugadaFila & { absoluteYardlineNumber: number }; playDirection: string;
  frame_snap: number | null; qb_id: number; presion_ids: number[];
  frames: { frameId: number; event: string | null;
    entidades: { nflId: number | null; num: number | null; team: string; x: number; y: number; s: number }[] }[] }
```

## Error Handling

| Caso | Backend | Dashboard |
|---|---|---|
| Equipo, QB, partido o jugada inexistente | 404 con `{"detail": "..."}` | Mensaje "No encontrado" en la vista |
| Filtro con valor no permitido | 422 (validación de FastAPI) | No ocurre desde los selects; se muestra el error si pasa |
| Grupo sin intentos o sin jugadas | Métricas en `None`, n = 0 | "—" y aviso de muestra pequeña |
| `down = 0` | Excluido cuando hay filtro de down | Sin cambio visible |
| Jugada sin frame de snap | `frame_snap = null` | Segundos desde el snap como "—" |
| Fallo de red | | Mensaje de error y botón para reintentar |

Ningún error escribe en disco ni expone rutas internas.

## Correctness Properties

*Una propiedad es una característica que debe cumplirse en toda ejecución válida del sistema. Sirve de puente entre los requisitos y las pruebas automáticas.*

### Property 1: Consistencia de las métricas

*Para cualquier* conjunto de jugadas, `resumen` devuelve `n` igual al número de filas, `intentos <= n`, y toda tasa o porcentaje en [0, 1] o `None` cuando su denominador es 0. Los tres reportes y el promedio de liga usan la misma función, por lo que una misma selección de jugadas produce las mismas cifras en cualquier vista.

**Validates: Requirements 2.2, 2.4, 3.2, 4.2**

### Property 2: Los filtros solo reducen y respetan la regla de `down`

*Para cualquier* combinación válida de `down`, `distancia` y `cuarto`, todas las jugadas devueltas cumplen cada filtro activo, y el resultado es un subconjunto del reporte sin filtros. Si `down` es `None`, se incluyen las jugadas con `down = 0`; si tiene valor, ninguna jugada con otro `down` aparece.

**Validates: Requirements 2.3**

### Property 3: Equipo y liga se calculan con los mismos filtros

*Para cualquier* equipo y filtros, el `resumen` de la liga se calcula sobre todas las jugadas con los mismos filtros, y las jugadas del equipo son un subconjunto de ellas.

**Validates: Requirements 2.4**

### Property 4: Las distribuciones suman uno

*Para cualquier* distribución sin recorte `top`, la suma de `pct` es 1 (±0.001) y la lista está ordenada por `n` descendente.

**Validates: Requirements 2.2, 4.2**

### Property 5: Validación de entradas

*Para cualquier* valor de `down`, `distancia` o `cuarto` fuera de los permitidos, la API responde 422. *Para cualquier* equipo, QB, partido o par (`gameId`, `playId`) inexistente, responde 404 sin abrir archivos de tracking.

**Validates: Requirements 2.3, 3.4, 5.2**

### Property 6: Orden cronológico de las jugadas de un partido

*Para cualquier* partido, las jugadas del reporte están ordenadas por `quarter` ascendente y, dentro de cada cuarto, por `reloj_seg` descendente. El reporte no contiene campo de marcador.

**Validates: Requirements 4.3, 4.4**

### Property 7: Integridad del tracking

*Para cualquier* jugada válida, los frames se devuelven en orden ascendente de `frameId`, cada frame contiene las mismas entidades, `event == "None"` se convierte en `null`, y `frame_snap` es el primer frame con `ball_snap` o `autoevent_ballsnap`, o `null` si no existe.

**Validates: Requirements 5.1, 5.6**

### Property 8: Segundos desde el snap

*Para cualquier* frame de una jugada con snap, el tiempo mostrado es `(frameId − frame_snap) / 10`, negativo antes del snap. Sin snap se muestra "—".

**Validates: Requirements 5.6**

### Property 9: Aviso de muestra pequeña

*Para cualquier* grupo con `n < 20`, la interfaz muestra la etiqueta "muestra pequeña"; con `n >= 20` no la muestra.

**Validates: Requirements 2.5, 3.5**

## Testing Strategy

Pruebas con pytest 8.3.5 + httpx 0.28.1 (ya en `.venv`) usando `fastapi.testclient.TestClient`, en `backend/tests/test_api.py`. Cubren los valores de verificación de requirements:

| Prueba | Esperado |
|---|---|
| `GET /health` | `{"status": "ok"}` |
| `GET /api/equipos` | 32 códigos |
| Reporte KC sin filtros | n = 339; SHOTGUN `pct_equipo` = 0.75 (±0.005) |
| Reporte NO sin filtros | n = 203 |
| `GET /api/qbs` | 60 pasadores; 17 con < 20 jugadas |
| Mahomes / Goff / Brady | 322 / 326 / 306 jugadas |
| `GET /api/partidos` | 122 partidos |
| Reporte equipo con `down=3` | ninguna jugada con down distinto de 3 |
| Reporte partido 2021090900 | sin campo de marcador |
| Tracking 2021090900 / 97 | 23 entidades en cada frame; frames ordenados |
| Tracking con `playId` inexistente | 404 |
| Mediana \|x balón en snap − LOS\| en 2021090900 | < 1 yarda |
| `down=9` o `distancia=xx` | 422 |

Dashboard: `npm run build` (`tsc --noEmit && vite build`) sin errores, y revisión manual de las tres vistas y del visor con el backend en `:8000` y Vite en desarrollo. Antes de entregar: `sh .hackathon/setup.sh --check`.

## Requirements Traceability

| Requisito | Dónde se cumple en este diseño |
|---|---|
| 1.1 Carga al arrancar, sin escribir, sin tracking | `backend/datos.py` |
| 1.2 `GET /health` | `backend/main.py` (se conserva) |
| 1.3 API bajo `/api/...` | Tabla de rutas de `backend/main.py` |
| 2.1 Lista de 32 equipos | `GET /api/equipos` |
| 2.2 Métricas, formaciones, personal top 5 | `reporte_equipo` + `resumen` + `distribucion` |
| 2.3 Filtros y regla de `down = 0` | `filtrar()` y parámetros `Literal` |
| 2.4 Comparación con la liga y n | `reporte_equipo` (equipo y liga con los mismos filtros), `Tarjetas`, `GraficaComparada` |
| 2.5 Muestra pequeña | `AvisoMuestra` |
| 2.6 Resultados por cobertura y tipo | `por_grupo`, `TablaCoberturas` |
| 2.7 Lista de jugadas con animación | `TablaJugadas` → `VisorJugada` |
| 3.1 Lista de 60 QBs | `GET /api/qbs` (`QBS`) |
| 3.2 Métricas del QB y Man/Zone | `reporte_qb` |
| 3.3 Desglose por partido y jugadas | `reporte_qb` (`por_partido`, `jugadas`) |
| 3.4 Identificar por `nflId` | `QBS` y ruta `/api/qbs/{nfl_id}` |
| 3.5 Muestra pequeña del QB | `AvisoMuestra` |
| 4.1 Lista de 122 partidos | `GET /api/partidos` |
| 4.2 Resumen por equipo del partido | `reporte_partido` |
| 4.3 Jugadas en orden con animación | `reporte_partido` (orden por cuarto y `reloj_seg`) |
| 4.4 Sin marcador final | `reporte_partido` no incluye marcador |
| 5.1 Endpoint de tracking | `tracking_jugada` |
| 5.2 404 y ruta segura | Validación contra `CLAVES` antes de abrir el archivo |
| 5.3 Campo SVG | `Campo` |
| 5.4 Jugadores, balón, QB y presión resaltados, leyenda | `Campo` |
| 5.5 Controles y 100 ms por frame | `VisorJugada` |
| 5.6 Frame, evento y segundos desde el snap | `VisorJugada` |
| 5.7 Aviso de fin del tracking | `VisorJugada` |
| 5.8 Solo React y SVG | `VisorJugada` y `Campo` |
| 6.1 Tres vistas con selectores | `App.tsx` y vistas |
| 6.2 Gráficas con Recharts | `GraficaComparada` |
| 6.3 `fetch('api/...')` | `api.ts` |
| 6.4 `base: './'` y proxy | `vite.config.ts` |
| 6.5 `vite build` sin errores | Testing Strategy |
| 6.6 Sin Bedrock ni Strands en el MVP | Nada de IA fuera de Opcional A |

## Opcional A: Preguntas con Amazon Nova (solo si sobra tiempo)

- `backend/asistente.py` con un `Agent` de Strands configurado con `BEDROCK_MODEL_ID` y `AWS_REGION` según las reglas. `cargar_env()` va al inicio de `main.py`.
- Herramientas (`@tool`): `buscar_qb(nombre)`, `buscar_partido(equipo_a, equipo_b, semana)` y `reporte_equipo(abbr)`. Llaman a las funciones de `reportes.py` y guardan su resultado en una variable de la solicitud.
- `POST /api/preguntar` devuelve `{tipo, datos}` con el resultado guardado de la herramienta, no el texto del modelo. Varias coincidencias → `tipo` con lista de candidatos; ninguna herramienta llamada → `sin_resultado` con mensaje fijo.
- Toda la llamada va en `try/except`; ante cualquier error responde "Búsqueda con IA no disponible; usa los selectores".
- El dashboard agrega una caja de texto arriba de las pestañas que, según `tipo`, abre la vista correspondiente con los `datos` recibidos.
