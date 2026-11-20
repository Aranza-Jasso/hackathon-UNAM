import { memo, useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Comparado } from '../tipos'
import { useModoOscuro } from '../equipos'

/** Barras horizontales: uso del equipo (color del equipo) contra uso de la liga (gris). */
export const GraficaComparada = memo(function GraficaComparada({ datos, color, nombre }:
  { datos: Comparado[]; color: string; nombre: string }) {
  const oscuro = useModoOscuro()
  const texto = oscuro ? '#E5E7EB' : '#0A1A33'
  const filas = useMemo(
    () => datos.map((d) => ({ ...d, equipo: (d.pct_equipo ?? 0) * 100, liga: (d.pct_liga ?? 0) * 100 })),
    [datos],
  )
  if (!filas.length) return <p className="text-sm opacity-70">Sin jugadas con estos filtros.</p>
  return (
    <div style={{ height: 70 + filas.length * 44 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={filas} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
          <CartesianGrid horizontal={false} stroke={oscuro ? '#ffffff22' : '#01336922'} />
          <XAxis type="number" unit=" %" tick={{ fill: texto, fontSize: 11 }} domain={[0, 'auto']} />
          <YAxis type="category" dataKey="valor" width={120} tick={{ fill: texto, fontSize: 11 }} />
          <Tooltip
            formatter={(v, k) => [`${Number(v).toFixed(1)} %`, k === 'equipo' ? nombre : 'Liga']}
            labelFormatter={(l, p) => `${l} · n = ${p?.[0]?.payload?.n_equipo ?? 0}`}
            contentStyle={{ background: oscuro ? '#0A1A33' : '#fff', border: '1px solid #01336933', color: texto }}
          />
          <Legend formatter={(v) => (v === 'equipo' ? nombre : 'Liga')} wrapperStyle={{ color: texto, fontSize: 12 }} />
          <Bar dataKey="equipo" fill={color} radius={[0, 4, 4, 0]} animationDuration={400} />
          <Bar dataKey="liga" fill={oscuro ? '#94A3B8' : '#9CA3AF'} radius={[0, 4, 4, 0]} animationDuration={400} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
})
