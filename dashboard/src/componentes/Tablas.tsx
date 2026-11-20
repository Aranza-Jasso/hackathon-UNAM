import { memo } from 'react'
import type { Grupo, JugadaFila } from '../tipos'
import { cuarto, downYDistancia, num, pct, resultado } from '../formato'
import { AvisoMuestra, ChipEquipo } from './Comunes'

/** % de completos y yardas por jugada por grupo (cobertura, tipo de cobertura…). */
export const TablaGrupos = memo(function TablaGrupos({ filas, etiqueta, color }: { filas: Grupo[]; etiqueta: string; color: string }) {
  if (!filas.length) return <p className="text-sm opacity-70">Sin jugadas con estos filtros.</p>
  const maxN = Math.max(...filas.map((f) => f.n))
  return (
    <div className="overflow-x-auto">
      <table className="tabla">
        <thead><tr><th>{etiqueta}</th><th className="text-right">n</th><th className="text-right">% completos</th><th className="text-right">Yardas/jugada</th></tr></thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.valor}>
              <td>
                <div className="flex items-center gap-2">
                  <span className="h-2 rounded-full" style={{ width: `${Math.max(6, (f.n / maxN) * 60)}px`, background: color }} />
                  <span className="font-medium">{f.valor}</span><AvisoMuestra n={f.n} />
                </div>
              </td>
              <td className="text-right tabular-nums">{f.n}</td>
              <td className="text-right tabular-nums">{pct(f.pct_completos)}</td>
              <td className="text-right tabular-nums">{num(f.yardas_por_jugada)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
})

const COLOR_RESULTADO: Record<string, string> = {
  C: 'bg-azul/10 text-azul dark:bg-white/10 dark:text-white',
  I: 'bg-gray-200 text-gray-700 dark:bg-white/5 dark:text-white/70',
  IN: 'bg-rojo/15 text-rojo dark:text-rojo-claro',
  S: 'bg-rojo/15 text-rojo dark:text-rojo-claro',
  R: 'bg-amarillo/25 text-azul-oscuro dark:text-amarillo-claro',
}

/** Lista de jugadas; cada fila abre la animación. */
export const TablaJugadas = memo(function TablaJugadas({ jugadas, onAbrir }: { jugadas: JugadaFila[]; onAbrir: (gameId: number, playId: number) => void }) {
  if (!jugadas.length) return <p className="text-sm opacity-70">Sin jugadas con estos filtros.</p>
  return (
    <div className="max-h-[28rem] overflow-auto">
      <table className="tabla">
        <thead className="sticky top-0 bg-white dark:bg-azul-oscuro">
          <tr><th>Sem.</th><th>Ofensiva</th><th>Rival</th><th>Tiempo</th><th>Down</th><th>Resultado</th><th>Cobertura</th><th className="min-w-[18rem]">Descripción</th><th /></tr>
        </thead>
        <tbody>
          {jugadas.map((j) => (
            <tr key={`${j.gameId}-${j.playId}`} onClick={() => onAbrir(j.gameId, j.playId)}
              className="cursor-pointer hover:bg-amarillo/10">
              <td className="tabular-nums">{j.semana}</td>
              <td><ChipEquipo abbr={j.posesion} /></td>
              <td><ChipEquipo abbr={j.rival} /></td>
              <td className="whitespace-nowrap tabular-nums">{cuarto(j.quarter)} {j.gameClock}</td>
              <td className="whitespace-nowrap">{downYDistancia(j.down, j.yardsToGo)}</td>
              <td><span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${COLOR_RESULTADO[j.passResult] ?? ''}`}>{resultado(j.passResult)}</span></td>
              <td className="whitespace-nowrap">{j.pff_passCoverage ?? '—'}</td>
              <td className="text-xs">{j.playDescription}</td>
              <td><button className="boton !px-2 !py-1 text-xs" aria-label="Ver animación">▶</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
})
