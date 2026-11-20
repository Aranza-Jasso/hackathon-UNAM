import { useEffect, useMemo, useState } from 'react'
import { rutas, useApi } from '../api'
import type { EquipoPartido, PartidoLista, ReportePartido } from '../tipos'
import { colores, textoSobre, useColorEquipo } from '../equipos'
import { pct } from '../formato'
import { AvisoMuestra, CajaError, Cargando, Seccion } from '../componentes/Comunes'
import { Tarjetas } from '../componentes/Tarjetas'
import { TablaJugadas } from '../componentes/Tablas'

function ColumnaEquipo({ e, local }: { e: EquipoPartido; local: boolean }) {
  const color = useColorEquipo(e.equipo)
  const c = colores(e.equipo)
  return (
    <section className="tarjeta space-y-3 !p-0 overflow-hidden">
      <div className="px-4 py-3" style={{ background: c.primario, color: textoSobre(c.primario), borderBottom: `5px solid ${c.secundario}` }}>
        <p className="text-xs font-semibold uppercase tracking-widest opacity-80">{local ? 'Local' : 'Visitante'}</p>
        <p className="text-2xl font-extrabold">{e.equipo}</p>
        <p className="text-sm opacity-90">QB: {e.qbs.join(', ') || '—'}</p>
      </div>
      <div className="space-y-3 px-4 pb-4">
        <div className="flex gap-3 text-sm">
          <span className="rounded bg-rojo/10 px-2 py-1 font-semibold">Sacks: {e.sacks}</span>
          <span className="rounded bg-rojo/10 px-2 py-1 font-semibold">Intercepciones: {e.intercepciones}</span>
        </div>
        <Tarjetas datos={e.resumen} color={color} />
        <div>
          <h4 className="titulo-seccion !mb-1">Coberturas que enfrentó</h4>
          <table className="tabla">
            <thead><tr><th>Cobertura</th><th className="text-right">n</th><th className="text-right">% de jugadas</th></tr></thead>
            <tbody>
              {e.coberturas.map((cb) => (
                <tr key={cb.valor}>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="h-2 rounded-full" style={{ width: `${Math.max(6, (cb.pct ?? 0) * 120)}px`, background: color }} />
                      {cb.valor}
                    </div>
                  </td>
                  <td className="text-right tabular-nums">{cb.n}<AvisoMuestra n={cb.n} /></td>
                  <td className="text-right tabular-nums">{pct(cb.pct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

export function VistaPartido({ onAbrir }: { onAbrir: (gameId: number, playId: number) => void }) {
  const lista = useApi<PartidoLista[]>(rutas.partidos())
  const [gameId, setGameId] = useState<number | null>(null)
  useEffect(() => { if (gameId === null && lista.datos?.length) setGameId(lista.datos[0].gameId) }, [lista.datos, gameId])
  const reporte = useApi<ReportePartido>(gameId === null ? null : rutas.reportePartido(gameId))
  const r = reporte.datos

  const porSemana = useMemo(() => {
    const m = new Map<number, PartidoLista[]>()
    for (const p of lista.datos ?? []) m.set(p.semana, [...(m.get(p.semana) ?? []), p])
    return [...m.entries()]
  }, [lista.datos])

  return (
    <div className="space-y-4">
      <div className="tarjeta flex flex-wrap items-end gap-3">
        <label className="flex min-w-[16rem] flex-col text-xs font-semibold uppercase tracking-wide">
          Partido
          <select className="selector mt-1 normal-case" value={gameId ?? ''} onChange={(e) => setGameId(Number(e.target.value))}>
            {porSemana.map(([semana, partidos]) => (
              <optgroup key={semana} label={`Semana ${semana}`}>
                {partidos.map((p) => <option key={p.gameId} value={p.gameId}>{p.visitante} @ {p.local} · {p.fecha}</option>)}
              </optgroup>
            ))}
          </select>
        </label>
      </div>

      {lista.error && <CajaError mensaje={lista.error} reintentar={lista.reintentar} />}
      {reporte.error && <CajaError mensaje={reporte.error} reintentar={reporte.reintentar} />}
      {(lista.cargando || (reporte.cargando && !r)) && <Cargando />}

      {r && (
        <div className={`space-y-4 transition-opacity ${reporte.cargando ? 'opacity-60' : ''}`}>
          <div className="overflow-hidden rounded-xl shadow">
            <div className="grid grid-cols-2">
              {[r.partido.visitante, r.partido.local].map((abbr) => {
                const c = colores(abbr)
                return (
                  <div key={abbr} className="px-5 py-4 text-center" style={{ background: c.primario, color: textoSobre(c.primario) }}>
                    <p className="text-3xl font-black">{abbr}</p>
                  </div>
                )
              })}
            </div>
            <div className="bg-azul px-5 py-2 text-center text-sm text-white">
              Semana {r.partido.semana} · {r.partido.fecha} · solo jugadas de pase (el dataset no trae el marcador final)
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {r.equipos.map((e) => <ColumnaEquipo key={e.equipo} e={e} local={e.equipo === r.partido.local} />)}
          </div>
          <Seccion titulo={`Jugadas de pase del partido (${r.jugadas.length}) · haz clic para ver la animación`}>
            <TablaJugadas jugadas={r.jugadas} onAbrir={onAbrir} />
          </Seccion>
        </div>
      )}
    </div>
  )
}
