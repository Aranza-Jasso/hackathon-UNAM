import type { ReactNode } from 'react'
import { colores, textoSobre } from '../equipos'
import { MUESTRA_MINIMA } from '../formato'

export function AvisoMuestra({ n }: { n: number }) {
  if (n >= MUESTRA_MINIMA) return null
  return (
    <span title={`Menos de ${MUESTRA_MINIMA} jugadas: interpreta con cuidado`}
      className="ml-1 inline-block rounded bg-amarillo/25 px-1.5 py-0.5 text-[10px] font-bold uppercase text-azul-oscuro dark:bg-amarillo/30 dark:text-amarillo-claro">
      muestra pequeña
    </span>
  )
}

/** Etiqueta con los colores del equipo. */
export function ChipEquipo({ abbr }: { abbr: string }) {
  const c = colores(abbr)
  return (
    <span className="inline-block min-w-[2.6rem] rounded px-1.5 py-0.5 text-center text-xs font-bold"
      style={{ background: c.primario, color: textoSobre(c.primario), boxShadow: `inset 0 -3px 0 ${c.secundario}` }}>
      {abbr}
    </span>
  )
}

/** Banda de encabezado con el color primario del equipo y franja del secundario. */
export function BandaEquipo({ abbr, titulo, subtitulo, children }:
  { abbr: string; titulo: string; subtitulo?: string; children?: ReactNode }) {
  const c = colores(abbr)
  const texto = textoSobre(c.primario)
  return (
    <div className="overflow-hidden rounded-xl shadow" style={{ background: c.primario, color: texto }}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest opacity-80">{abbr}</p>
          <h2 className="text-2xl font-extrabold leading-tight">{titulo}</h2>
          {subtitulo && <p className="text-sm opacity-90">{subtitulo}</p>}
        </div>
        {children}
      </div>
      <div className="h-1.5" style={{ background: c.secundario }} />
    </div>
  )
}

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <div className="flex items-center gap-2 py-8 text-sm text-azul/70 dark:text-white/70">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-amarillo border-t-transparent" />
      {texto}
    </div>
  )
}

export function CajaError({ mensaje, reintentar }: { mensaje: string; reintentar?: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-rojo/40 bg-rojo/10 px-4 py-3 text-sm text-rojo dark:text-rojo-claro">
      <span className="font-semibold">{mensaje}</span>
      {reintentar && <button className="boton" onClick={reintentar}>Reintentar</button>}
    </div>
  )
}

export function Seccion({ titulo, children, className = '' }: { titulo: string; children: ReactNode; className?: string }) {
  return (
    <section className={`tarjeta ${className}`}>
      <h3 className="titulo-seccion">{titulo}</h3>
      {children}
    </section>
  )
}
