import { useSyncExternalStore } from 'react'

// Colores oficiales de cada franquicia en la temporada 2021 (estilo visual; no forman parte del dataset).
// Claves = abreviaturas de `possessionTeam` en plays.csv.
export const COLORES_EQUIPO: Record<string, { primario: string; secundario: string }> = {
  ARI: { primario: '#97233F', secundario: '#FFB612' },
  ATL: { primario: '#A71930', secundario: '#000000' },
  BAL: { primario: '#241773', secundario: '#9E7C0C' },
  BUF: { primario: '#00338D', secundario: '#C60C30' },
  CAR: { primario: '#0085CA', secundario: '#101820' },
  CHI: { primario: '#0B162A', secundario: '#C83803' },
  CIN: { primario: '#FB4F14', secundario: '#000000' },
  CLE: { primario: '#311D00', secundario: '#FF3C00' },
  DAL: { primario: '#003594', secundario: '#869397' },
  DEN: { primario: '#FB4F14', secundario: '#002244' },
  DET: { primario: '#0076B6', secundario: '#B0B7BC' },
  GB: { primario: '#203731', secundario: '#FFB612' },
  HOU: { primario: '#03202F', secundario: '#A71930' },
  IND: { primario: '#002C5F', secundario: '#A2AAAD' },
  JAX: { primario: '#006778', secundario: '#D7A22A' },
  KC: { primario: '#E31837', secundario: '#FFB81C' },
  LA: { primario: '#003594', secundario: '#FFA300' },
  LAC: { primario: '#0080C6', secundario: '#FFC20E' },
  LV: { primario: '#000000', secundario: '#A5ACAF' },
  MIA: { primario: '#008E97', secundario: '#FC4C02' },
  MIN: { primario: '#4F2683', secundario: '#FFC62F' },
  NE: { primario: '#002244', secundario: '#C60C30' },
  NO: { primario: '#D3BC8D', secundario: '#101820' },
  NYG: { primario: '#0B2265', secundario: '#A71930' },
  NYJ: { primario: '#125740', secundario: '#FFFFFF' },
  PHI: { primario: '#004C54', secundario: '#A5ACAF' },
  PIT: { primario: '#FFB612', secundario: '#101820' },
  SEA: { primario: '#002244', secundario: '#69BE28' },
  SF: { primario: '#AA0000', secundario: '#B3995D' },
  TB: { primario: '#D50A0A', secundario: '#FF7900' },
  TEN: { primario: '#0C2340', secundario: '#4B92DB' },
  WAS: { primario: '#5A1414', secundario: '#FFB612' },
}

const NEUTRO = { primario: '#6B7280', secundario: '#D1D5DB' }
export const colores = (abbr: string) => COLORES_EQUIPO[abbr] ?? NEUTRO

export const FONDO_CLARO = '#FFFFFF'
export const FONDO_OSCURO = '#0A1A33'

/** Memoiza una función de argumentos string: los colores posibles son pocos y se repiten en cada render. */
function memo<A extends string[], R>(fn: (...a: A) => R): (...a: A) => R {
  const m = new Map<string, R>()
  return (...a: A) => {
    const k = a.join('|')
    let v = m.get(k)
    if (v === undefined) { v = fn(...a); m.set(k, v) }
    return v
  }
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const luminancia = memo((hex: string) => {
  const [r, g, b] = rgb(hex).map((c) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
})

/** Relación de contraste WCAG entre dos colores (1 a 21). */
export function contraste(a: string, b: string): number {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}

/** Texto blanco o casi negro, el que se lea mejor sobre `fondo`. */
export const textoSobre = memo((fondo: string) =>
  contraste(fondo, '#FFFFFF') >= contraste(fondo, FONDO_OSCURO) ? '#FFFFFF' : FONDO_OSCURO)

/** Color del equipo que se distingue sobre `fondo`: primario, si no secundario, si no gris. */
export const colorVisible = memo((abbr: string, fondo: string) => {
  const c = colores(abbr)
  if (contraste(c.primario, fondo) >= 2) return c.primario
  if (contraste(c.secundario, fondo) >= 2) return c.secundario
  return luminancia(fondo) > 0.5 ? '#374151' : '#D1D5DB'
})

/** Colores de ofensiva y defensiva en el campo: si los primarios se parecen, la defensa usa su secundario. */
export const coloresEnfrentados = memo((ofensiva: string, defensiva: string): [string, string] => {
  const o = colores(ofensiva).primario
  const d = colores(defensiva)
  const [x, y] = [rgb(o), rgb(d.primario)]
  const parecidos = Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]) < 120
  return [o, parecidos ? d.secundario : d.primario]
})

// Modo del dispositivo: un solo listener compartido por toda la app.
const consulta = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null
const suscribir = (aviso: () => void) => {
  consulta?.addEventListener('change', aviso)
  return () => consulta?.removeEventListener('change', aviso)
}
const leer = () => consulta?.matches ?? false

/** true si el dispositivo está en modo oscuro; se actualiza al cambiarlo. */
export const useModoOscuro = () => useSyncExternalStore(suscribir, leer, () => false)

/** Color del equipo que se ve bien sobre el fondo del modo actual. */
export function useColorEquipo(abbr: string): string {
  return colorVisible(abbr, useModoOscuro() ? FONDO_OSCURO : FONDO_CLARO)
}
