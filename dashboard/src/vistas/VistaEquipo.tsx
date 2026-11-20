import { useState } from 'react'
import { rutas, useApi } from '../api'
import type { Filtros, ReporteEquipo } from '../tipos'
import { useColorEquipo } from '../equipos'
import { BandaEquipo, CajaError, Cargando, Seccion } from '../componentes/Comunes'
import { Tarjetas } from '../componentes/Tarjetas'
import { GraficaComparada } from '../componentes/GraficaComparada'
import { TablaGrupos, TablaJugadas } from '../componentes/Tablas'

type Props = { onAbrir: (gameId: number, playId: number) => void }

const SIN_FILTROS: Filtros = { down: null, distancia: null, cuarto: null }

function SelectFiltro({ etiqueta, valor, opciones, onCambio }: {
  etiqueta: string; valor: string; opciones: [string, string][]; onCambio: (v: string) => void
}) {
  return (
    <label className="flex flex-col text-xs font-semibold uppercase tracking-wide">
      {etiqueta}
      <select className="selector mt-1 normal-case" value={valor} onChange={(e) => onCambio(e.target.value)}>
        <option value="">Todos</option>
        {opciones.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
    </label>
  )
}

export function VistaEquipo({ onAbrir }: Props) {
  const equipos = useApi<string[]>(rutas.equipos())
  const [abbr, setAbbr] = useState('KC')
  const [filtros, setFiltros] = useState<Filtros>(SIN_FILTROS)
  const reporte = useApi<ReporteEquipo>(rutas.reporteEquipo(abbr, filtros))
  const color = useColorEquipo(abbr)
  const r = reporte.datos

  const setFiltro = (k: keyof Filtros, v: string) =>
    setFiltros((f) => ({ ...f, [k]: v === '' ? null : k === 'distancia' ? v : Number(v) }))

  return (
    <div className="space-y-4">
      <div className="tarjeta flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-xs font-semibold uppercase tracking-wide">
          Equipo
          <select className="selector mt-1" value={abbr} onChange={(e) => setAbbr(e.target.value)}>
            {(equipos.datos ?? [abbr]).map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </label>
        <SelectFiltro etiqueta="Down" valor={filtros.down?.toString() ?? ''} onCambio={(v) => setFiltro('down', v)}
          opciones={[['1', '1.º'], ['2', '2.º'], ['3', '3.º'], ['4', '4.º']]} />
        <SelectFiltro etiqueta="Distancia" valor={filtros.distancia ?? ''} onCambio={(v) => setFiltro('distancia', v)}
          opciones={[['corta', 'Corta (1–3)'], ['media', 'Media (4–7)'], ['larga', 'Larga (8+)']]} />
        <SelectFiltro etiqueta="Cuarto" valor={filtros.cuarto?.toString() ?? ''} onCambio={(v) => setFiltro('cuarto', v)}
          opciones={[['1', 'Q1'], ['2', 'Q2'], ['3', 'Q3'], ['4', 'Q4'], ['5', 'Tiempo extra']]} />
        <button className="boton" onClick={() => setFiltros(SIN_FILTROS)}>Quitar filtros</button>
      </div>

      {equipos.error && <CajaError mensaje={equipos.error} reintentar={equipos.reintentar} />}
      {reporte.error && <CajaError mensaje={reporte.error} reintentar={reporte.reintentar} />}
      {reporte.cargando && !r && <Cargando />}

      {r && (
        <div className={`space-y-4 transition-opacity ${reporte.cargando ? 'opacity-60' : ''}`}>
          <BandaEquipo abbr={r.equipo_abbr} titulo="Tendencias ofensivas de pase"
            subtitulo="Semanas 1–8, temporada 2021 · comparado con el promedio de la liga con los mismos filtros" />
          <Tarjetas datos={r.equipo} liga={r.liga} color={color} />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Seccion titulo="Formación ofensiva (% de jugadas)">
              <GraficaComparada datos={r.formaciones} color={color} nombre={r.equipo_abbr} />
            </Seccion>
            <Seccion titulo="Personal ofensivo · 5 más usados (% de jugadas)">
              <GraficaComparada datos={r.personal} color={color} nombre={r.equipo_abbr} />
            </Seccion>
            <Seccion titulo="Resultado por cobertura enfrentada">
              <TablaGrupos filas={r.coberturas} etiqueta="Cobertura" color={color} />
            </Seccion>
            <Seccion titulo="Resultado por tipo de cobertura">
              <TablaGrupos filas={r.tipo_cobertura} etiqueta="Tipo" color={color} />
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
