import { Suspense, lazy, useCallback, useState } from 'react'
import type { JugadaRef } from './tipos'
import { Cargando } from './componentes/Comunes'

// Carga diferida: cada vista y el visor se descargan solo cuando se usan.
const VistaEquipo = lazy(() => import('./vistas/VistaEquipo').then((m) => ({ default: m.VistaEquipo })))
const VistaQB = lazy(() => import('./vistas/VistaQB').then((m) => ({ default: m.VistaQB })))
const VistaPartido = lazy(() => import('./vistas/VistaPartido').then((m) => ({ default: m.VistaPartido })))
const VisorJugada = lazy(() => import('./visor/VisorJugada').then((m) => ({ default: m.VisorJugada })))

const VISTAS = [
  { id: 'equipo', nombre: 'Equipo' },
  { id: 'qb', nombre: 'Quarterback' },
  { id: 'partido', nombre: 'Partido' },
] as const
type Vista = (typeof VISTAS)[number]['id']

export default function App() {
  const [vista, setVista] = useState<Vista>('equipo')
  const [jugada, setJugada] = useState<JugadaRef | null>(null)
  const abrir = useCallback((gameId: number, playId: number) => setJugada({ gameId, playId }), [])
  const cerrar = useCallback(() => setJugada(null), [])

  return (
    <div className="min-h-screen">
      <header className="bg-azul text-white shadow-lg">
        <div className="h-1.5 bg-rojo" />
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <h1 className="text-xl font-black tracking-tight sm:text-2xl">
              Reporte de tendencias <span className="text-amarillo">ofensivas</span> de pase
            </h1>
            <p className="text-xs text-white/80 sm:text-sm">NFL Big Data Bowl · temporada 2021, semanas 1–8 · solo jugadas de pase</p>
          </div>
          <nav className="flex gap-1 rounded-xl bg-azul-oscuro/60 p-1" aria-label="Vistas">
            {VISTAS.map((v) => (
              <button key={v.id} onClick={() => setVista(v.id)} aria-current={vista === v.id}
                className={`rounded-lg px-3 py-1.5 text-sm font-bold transition sm:px-4 ${
                  vista === v.id ? 'bg-amarillo text-azul-oscuro' : 'text-white hover:bg-white/10'}`}>
                {v.nombre}
              </button>
            ))}
          </nav>
        </div>
        <div className="h-1 bg-amarillo" />
      </header>

      <main className="mx-auto max-w-7xl px-3 py-5 sm:px-4">
        <Suspense fallback={<Cargando />}>
          {vista === 'equipo' && <VistaEquipo onAbrir={abrir} />}
          {vista === 'qb' && <VistaQB onAbrir={abrir} />}
          {vista === 'partido' && <VistaPartido onAbrir={abrir} />}
        </Suspense>
      </main>

      <footer className="mx-auto max-w-7xl px-4 pb-6 text-xs text-azul/60 dark:text-white/50">
        Datos: NFL Next Gen Stats y Pro Football Focus (NFL Big Data Bowl). Todas las cifras se calculan a partir del dataset.
        Los colores de equipo son solo visuales.
      </footer>

      {jugada && (
        <Suspense fallback={null}>
          <VisorJugada jugada={jugada} onCerrar={cerrar} />
        </Suspense>
      )}
    </div>
  )
}
