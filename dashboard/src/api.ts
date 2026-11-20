import { useCallback, useEffect, useState } from 'react'
import type { Filtros } from './tipos'

// Caché en memoria por ruta: los datos no cambian mientras la app está abierta, así que
// volver a una vista, equipo o jugada ya vistos es instantáneo. Las solicitudes en curso
// se comparten para no pedir lo mismo dos veces.
const cache = new Map<string, unknown>()
const enCurso = new Map<string, Promise<unknown>>()

// Rutas relativas SIN diagonal inicial: la app se publica en una subruta.
function obtener<T>(ruta: string): Promise<T> {
  if (cache.has(ruta)) return Promise.resolve(cache.get(ruta) as T)
  const pendiente = enCurso.get(ruta)
  if (pendiente) return pendiente as Promise<T>
  const promesa = fetch(ruta)
    .then(async (res) => {
      if (!res.ok) throw new Error(res.status === 404 ? 'No encontrado' : `Error ${res.status}`)
      const datos = (await res.json()) as T
      cache.set(ruta, datos)
      return datos
    })
    .finally(() => enCurso.delete(ruta))
  enCurso.set(ruta, promesa)
  return promesa
}

export const rutas = {
  equipos: () => 'api/equipos',
  reporteEquipo: (abbr: string, f: Filtros) => {
    const p = new URLSearchParams()
    if (f.down !== null) p.set('down', String(f.down))
    if (f.distancia !== null) p.set('distancia', f.distancia)
    if (f.cuarto !== null) p.set('cuarto', String(f.cuarto))
    const q = p.toString()
    return `api/equipos/${encodeURIComponent(abbr)}/reporte${q ? `?${q}` : ''}`
  },
  qbs: () => 'api/qbs',
  reporteQB: (nflId: number) => `api/qbs/${nflId}/reporte`,
  partidos: () => 'api/partidos',
  reportePartido: (gameId: number) => `api/partidos/${gameId}/reporte`,
  tracking: (gameId: number, playId: number) => `api/jugadas/${gameId}/${playId}/tracking`,
}

export type Estado<T> = { datos: T | null; cargando: boolean; error: string | null; reintentar: () => void }

/** Carga `ruta` (o nada si es null). Si ya está en caché, la devuelve sin estado de carga. */
export function useApi<T>(ruta: string | null): Estado<T> {
  const [datos, setDatos] = useState<T | null>(() => (ruta && cache.has(ruta) ? (cache.get(ruta) as T) : null))
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    if (!ruta) { setDatos(null); return }
    if (cache.has(ruta)) { setDatos(cache.get(ruta) as T); setError(null); setCargando(false); return }
    let vigente = true
    setCargando(true)
    setError(null)
    obtener<T>(ruta)
      .then((d) => { if (vigente) setDatos(d) })
      .catch((e: Error) => { if (vigente) { setDatos(null); setError(e.message) } })
      .finally(() => { if (vigente) setCargando(false) })
    return () => { vigente = false }
  }, [ruta, intento])

  const reintentar = useCallback(() => setIntento((i) => i + 1), [])
  return { datos, cargando, error, reintentar }
}
