import { memo } from 'react'
import type { Frame } from '../tipos'
import { textoSobre } from '../equipos'

const LARGO = 120
const ANCHO = 53.3
const M = 2 // margen alrededor del campo, en yardas
const LINEAS = Array.from({ length: 11 }, (_, i) => 10 + i * 10)
const yPantalla = (y: number) => ANCHO - y // el eje y se invierte para dibujar con la convención de pantalla

/** Pasto, zonas de anotación, líneas y línea de scrimmage. Solo se vuelve a dibujar si cambia la jugada. */
const Fondo = memo(function Fondo({ lineaScrimmage }: { lineaScrimmage: number }) {
  return (
    <>
      <rect x={-M} y={-M} width={LARGO + 2 * M} height={ANCHO + 2 * M} fill="#1B5E20" />
      <rect x={0} y={0} width={LARGO} height={ANCHO} fill="#2E7D32" stroke="#FFFFFF" strokeWidth={0.3} />
      <rect x={0} y={0} width={10} height={ANCHO} fill="#013369" opacity={0.85} />
      <rect x={110} y={0} width={10} height={ANCHO} fill="#D50A0A" opacity={0.85} />
      {LINEAS.map((x) => (
        <g key={x}>
          <line x1={x} y1={0} x2={x} y2={ANCHO} stroke="#FFFFFF" strokeWidth={0.25} opacity={0.8} />
          {x > 10 && x < 110 && (
            <text x={x} y={4.5} fill="#FFFFFF" opacity={0.6} fontSize={2.6} textAnchor="middle" fontWeight={700}>
              {x <= 60 ? x - 10 : 110 - x}
            </text>
          )}
        </g>
      ))}
      <line x1={lineaScrimmage} y1={0} x2={lineaScrimmage} y2={ANCHO} stroke="#FFB612" strokeWidth={0.45} strokeDasharray="1.2 0.8" />
    </>
  )
})

type Props = {
  frame: Frame
  lineaScrimmage: number
  ofensiva: string
  colorOfensiva: string
  colorDefensiva: string
  qbId: number | null
  presionIds: Set<number>
}

export function Campo({ frame, lineaScrimmage, ofensiva, colorOfensiva, colorDefensiva, qbId, presionIds }: Props) {
  const textoO = textoSobre(colorOfensiva)
  const textoD = textoSobre(colorDefensiva)
  let balon = null
  const jugadores = []
  for (const e of frame.entidades) {
    if (e.team === 'football') {
      balon = <ellipse key="balon" cx={e.x} cy={yPantalla(e.y)} rx={0.75} ry={0.45} fill="#8B4513" stroke="#FFFFFF" strokeWidth={0.15} />
      continue
    }
    const esOfensiva = e.team === ofensiva
    const resaltado = e.nflId === null ? null : e.nflId === qbId ? '#FFB612' : presionIds.has(e.nflId) ? '#FF1744' : null
    jugadores.push(
      <g key={e.nflId ?? `${e.team}-${e.num}`} transform={`translate(${e.x} ${yPantalla(e.y)})`}>
        {resaltado && <circle r={1.85} fill="none" stroke={resaltado} strokeWidth={0.45} />}
        <circle r={1.25} fill={esOfensiva ? colorOfensiva : colorDefensiva} stroke={esOfensiva ? '#FFFFFF' : '#000000'} strokeWidth={0.18} />
        <text y={0.45} fontSize={1.25} textAnchor="middle" fontWeight={800} fill={esOfensiva ? textoO : textoD}>{e.num ?? ''}</text>
      </g>,
    )
  }

  return (
    <svg viewBox={`${-M} ${-M} ${LARGO + 2 * M} ${ANCHO + 2 * M}`} className="h-auto w-full rounded-lg"
      role="img" aria-label="Animación de la jugada">
      <Fondo lineaScrimmage={lineaScrimmage} />
      {jugadores}
      {balon}
    </svg>
  )
}
