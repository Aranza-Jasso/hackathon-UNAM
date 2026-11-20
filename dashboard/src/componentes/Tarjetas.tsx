import { memo } from 'react'
import type { Resumen } from '../tipos'
import { num, pct } from '../formato'
import { AvisoMuestra } from './Comunes'

type Metrica = { clave: keyof Resumen; nombre: string; formato: (v: number | null) => string; ayuda: string }

const METRICAS: Metrica[] = [
  { clave: 'pct_completos', nombre: '% completos', formato: pct, ayuda: 'Completos / intentos (C, I, IN)' },
  { clave: 'yardas_por_jugada', nombre: 'Yardas por jugada', formato: (v) => num(v, 2), ayuda: 'Promedio de prePenaltyPlayResult (incluye sacks y scrambles)' },
  { clave: 'tasa_sack', nombre: 'Tasa de sack', formato: pct, ayuda: 'Sacks / jugadas' },
  { clave: 'tasa_int', nombre: 'Tasa de intercepción', formato: pct, ayuda: 'Intercepciones / intentos' },
  { clave: 'tasa_scramble', nombre: 'Tasa de scramble', formato: pct, ayuda: 'Scrambles / jugadas' },
  { clave: 'pct_play_action', nombre: '% play action', formato: pct, ayuda: 'Jugadas con play action / jugadas' },
  { clave: 'pct_presion', nombre: '% con presión', formato: pct, ayuda: 'Jugadas con hit, hurry o sack de algún defensor / jugadas' },
]

/** Una tarjeta por métrica. Si llega `liga`, muestra el promedio de liga debajo. */
export const Tarjetas = memo(function Tarjetas({ datos, liga, color }: { datos: Resumen; liga?: Resumen; color: string }) {
  return (
    <div>
      <p className="mb-2 text-sm">
        <span className="font-bold">{datos.n}</span> jugadas de pase · <span className="font-bold">{datos.intentos}</span> intentos
        {liga && <span className="text-azul/60 dark:text-white/60"> (liga: {liga.n.toLocaleString('es-MX')} jugadas)</span>}
        <AvisoMuestra n={datos.n} />
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
        {METRICAS.map((m) => (
          <div key={m.clave} title={m.ayuda} className="tarjeta !p-3" style={{ borderTop: `4px solid ${color}` }}>
            <p className="text-[11px] font-semibold uppercase leading-tight text-azul/70 dark:text-white/70">{m.nombre}</p>
            <p className="mt-1 text-xl font-extrabold">{m.formato(datos[m.clave] as number | null)}</p>
            {liga && <p className="text-xs text-azul/60 dark:text-white/60">Liga: {m.formato(liga[m.clave] as number | null)}</p>}
          </div>
        ))}
      </div>
    </div>
  )
})
