// Tipos de las respuestas de la API (backend/reportes.py y backend/tracking.py).

export type Resumen = {
  n: number
  intentos: number
  pct_completos: number | null
  yardas_por_jugada: number | null
  tasa_sack: number | null
  tasa_int: number | null
  tasa_scramble: number | null
  pct_play_action: number | null
  pct_presion: number | null
}

export type Comparado = { valor: string; n_equipo: number; pct_equipo: number | null; pct_liga: number | null }
export type Grupo = { valor: string; n: number; pct_completos: number | null; yardas_por_jugada: number | null }
export type Distribucion = { valor: string; n: number; pct: number | null }

export type JugadaFila = {
  gameId: number
  playId: number
  semana: number
  posesion: string
  rival: string
  quarter: number
  gameClock: string
  down: number
  yardsToGo: number
  passResult: string
  playDescription: string
  pff_passCoverage: string | null
}

export type Filtros = { down: number | null; distancia: string | null; cuarto: number | null }

export type ReporteEquipo = {
  equipo_abbr: string
  filtros: Filtros
  equipo: Resumen
  liga: Resumen
  formaciones: Comparado[]
  personal: Comparado[]
  coberturas: Grupo[]
  tipo_cobertura: Grupo[]
  jugadas: JugadaFila[]
}

export type QBLista = { nflId: number; nombre: string; equipos: string[]; jugadas: number }

export type ReporteQB = {
  qb: { nflId: number; nombre: string; equipos: string[] }
  resumen: Resumen
  man_zona: Grupo[]
  por_partido: (Omit<Grupo, 'valor'> & { gameId: number; semana: number; rival: string })[]
  jugadas: JugadaFila[]
}

export type PartidoLista = { gameId: number; semana: number; fecha: string; local: string; visitante: string }

export type EquipoPartido = {
  equipo: string
  resumen: Resumen
  sacks: number
  intercepciones: number
  qbs: string[]
  coberturas: Distribucion[]
}

export type ReportePartido = { partido: PartidoLista; equipos: EquipoPartido[]; jugadas: JugadaFila[] }

export type Entidad = { nflId: number | null; num: number | null; team: string; x: number; y: number; s: number }
export type Frame = { frameId: number; event: string | null; entidades: Entidad[] }

export type Tracking = {
  jugada: {
    gameId: number
    playId: number
    playDescription: string
    quarter: number
    down: number
    yardsToGo: number
    passResult: string
    pff_passCoverage: string | null
    absoluteYardlineNumber: number
    posesion: string
    rival: string
  }
  playDirection: string | null
  frame_snap: number | null
  qb_id: number | null
  presion_ids: number[]
  frames: Frame[]
}

export type JugadaRef = { gameId: number; playId: number }
