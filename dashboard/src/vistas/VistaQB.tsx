import { useEffect, useState } from 'react'
import { rutas, useApi } from '../api'
import type { QBLista, ReporteQB } from '../tipos'
import { useColorEquipo } from '../equipos'
import { num, pct } from '../formato'
import { AvisoMuestra, BandaEquipo, CajaError, Cargando, ChipEquipo, Seccion } from '../componentes/Comunes'
import { Tarjetas } from '../componentes/Tarjetas'
import { TablaGrupos, TablaJugadas } from '../componentes/Tablas'

export function VistaQB({ onAbrir }: { onAbrir: (gameId: number, playId: number) => void }) {
  const lista = useApi<QBLista[]>(rutas.qbs())
  const [nflId, setNflId] = useState<number | null>(null)
  useEffect(() => { if (nflId === null && lista.datos?.length) setNflId(lista.datos[0].nflId) }, [lista.datos, nflId])
  const reporte = useApi<ReporteQB>(nflId === null ? null : rutas.reporteQB(nflId))
  const r = reporte.datos
  const equipo = r?.qb.equipos[0] ?? ''
  const color = useColorEquipo(equipo)

  return (
    <div className="space-y-4">
      <div className="tarjeta flex flex-wrap items-end gap-3">
        <label className="flex min-w-[16rem] flex-col text-xs font-semibold uppercase tracking-wide">
          Quarterback (ordenados por jugadas)
          <select className="selector mt-1 normal-case" value={nflId ?? ''} onChange={(e) => setNflId(Number(e.target.value))}>
            {(lista.datos ?? []).map((q) => (
              <option key={q.nflId} value={q.nflId}>{q.nombre} · {q.equipos.join('/')} · {q.jugadas} jugadas</option>
            ))}
          </select>
        </label>
      </div>

      {lista.error && <CajaError mensaje={lista.error} reintentar={lista.reintentar} />}
      {reporte.error && <CajaError mensaje={reporte.error} reintentar={reporte.reintentar} />}
      {(lista.cargando || (reporte.cargando && !r)) && <Cargando />}

      {r && (
        <div className={`space-y-4 transition-opacity ${reporte.cargando ? 'opacity-60' : ''}`}>
          <BandaEquipo abbr={equipo} titulo={r.qb.nombre} subtitulo="Quarterback · semanas 1–8, temporada 2021">
            <div className="flex gap-1">{r.qb.equipos.map((e) => <ChipEquipo key={e} abbr={e} />)}</div>
          </BandaEquipo>
          <Tarjetas datos={r.resumen} color={color} />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Seccion titulo="Contra cobertura Man y Zone">
              <TablaGrupos filas={r.man_zona} etiqueta="Tipo" color={color} />
            </Seccion>
            <Seccion titulo="Por partido">
              <div className="max-h-80 overflow-auto">
                <table className="tabla">
                  <thead><tr><th>Sem.</th><th>Rival</th><th className="text-right">n</th><th className="text-right">% completos</th><th className="text-right">Yardas/jugada</th></tr></thead>
                  <tbody>
                    {r.por_partido.map((p) => (
                      <tr key={p.gameId}>
                        <td className="tabular-nums">{p.semana}</td>
                        <td><ChipEquipo abbr={p.rival} /></td>
                        <td className="text-right tabular-nums">{p.n}<AvisoMuestra n={p.n} /></td>
                        <td className="text-right tabular-nums">{pct(p.pct_completos)}</td>
                        <td className="text-right tabular-nums">{num(p.yardas_por_jugada)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Seccion>
          </div>
          <Seccion titulo={`Jugadas (${r.jugadas.length}) · haz clic para ver la animación`}>
            <TablaJugadas jugadas={r.jugadas} onAbrir={onAbrir} />
          </Seccion>
        </div>
      )}
    </div>
  )
}
