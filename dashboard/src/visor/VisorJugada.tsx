import { useEffect, useMemo, useRef, useState } from 'react'
import { rutas, useApi } from '../api'
import type { JugadaRef, Tracking } from '../tipos'
import { coloresEnfrentados } from '../equipos'
import { cuarto, downYDistancia, resultado } from '../formato'
import { CajaError, Cargando, ChipEquipo } from '../componentes/Comunes'
import { Campo } from './Campo'

const VELOCIDADES = [0.5, 1, 2]
const MS_POR_FRAME = 100 // 10 frames por segundo a 1×

export function VisorJugada({ jugada, onCerrar }: { jugada: JugadaRef; onCerrar: () => void }) {
  const { datos, cargando, error, reintentar } = useApi<Tracking>(rutas.tracking(jugada.gameId, jugada.playId))
  const [indice, setIndice] = useState(0)
  const [reproduciendo, setReproduciendo] = useState(false)
  const [velocidad, setVelocidad] = useState(1)
  const total = datos?.frames.length ?? 0

  // Al cargar una jugada nueva: volver al inicio y reproducir.
  useEffect(() => { setIndice(0); setReproduciendo(Boolean(datos)) }, [datos])

  useEffect(() => {
    if (!reproduciendo || !total) return
    const id = window.setInterval(() => {
      setIndice((i) => {
        if (i >= total - 1) { setReproduciendo(false); return i }
        return i + 1
      })
    }, MS_POR_FRAME / velocidad)
    return () => window.clearInterval(id)
  }, [reproduciendo, velocidad, total])

  // Cerrar con Escape. El ref evita volver a registrar el listener si cambia onCerrar.
  const cerrarRef = useRef(onCerrar)
  cerrarRef.current = onCerrar
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') cerrarRef.current() }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [])

  const presion = useMemo(() => new Set(datos?.presion_ids ?? []), [datos])
  // Último evento hasta cada frame, calculado una vez por jugada (no en cada tick).
  const eventos = useMemo(() => {
    let ultimo: string | null = null
    return (datos?.frames ?? []).map((f) => (ultimo = f.event ?? ultimo))
  }, [datos])
  const ultimoEvento = eventos[indice] ?? null

  const frame = datos?.frames[indice]
  const j = datos?.jugada
  const [colorO, colorD] = j ? coloresEnfrentados(j.posesion, j.rival) : ['#013369', '#D50A0A']
  const segundos = frame && datos?.frame_snap != null ? (frame.frameId - datos.frame_snap) / 10 : null

  const alternar = () => {
    if (indice >= total - 1) setIndice(0)
    setReproduciendo((r) => !r)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-azul-noche/80 p-2 backdrop-blur-sm sm:p-6"
      onClick={onCerrar}>
      <div className="w-full max-w-6xl rounded-2xl bg-white p-4 shadow-2xl dark:bg-azul-oscuro" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-rojo dark:text-rojo-claro">Animación de la jugada</p>
            {j && (
              <p className="flex flex-wrap items-center gap-2 text-sm">
                <ChipEquipo abbr={j.posesion} /> <span className="opacity-60">vs</span> <ChipEquipo abbr={j.rival} />
                <span>{cuarto(j.quarter)} · {downYDistancia(j.down, j.yardsToGo)} · {j.pff_passCoverage ?? 'Cobertura —'} · <b>{resultado(j.passResult)}</b></span>
              </p>
            )}
          </div>
          <button className="boton !bg-rojo hover:!bg-rojo-claro" onClick={onCerrar} aria-label="Cerrar">✕</button>
        </div>

        {cargando && <Cargando texto="Cargando tracking…" />}
        {error && <CajaError mensaje={error} reintentar={reintentar} />}

        {datos && frame && j && (
          <>
            <Campo frame={frame} lineaScrimmage={j.absoluteYardlineNumber} ofensiva={j.posesion}
              colorOfensiva={colorO} colorDefensiva={colorD} qbId={datos.qb_id} presionIds={presion} />

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button className="boton boton-activo min-w-[6.5rem]" onClick={alternar}>
                {reproduciendo ? '❚❚ Pausa' : '▶ Reproducir'}
              </button>
              <button className="boton" onClick={() => { setIndice(0); setReproduciendo(false) }}>↺ Reiniciar</button>
              <input type="range" min={0} max={total - 1} value={indice} aria-label="Frame"
                onChange={(e) => { setReproduciendo(false); setIndice(Number(e.target.value)) }}
                className="mx-1 min-w-[10rem] flex-1 accent-amarillo" />
              {VELOCIDADES.map((v) => (
                <button key={v} className={`boton ${velocidad === v ? 'boton-activo' : ''}`} onClick={() => setVelocidad(v)}>{v}×</button>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
              <div className="tarjeta !p-3">
                <p><b>Frame</b> {frame.frameId} / {datos.frames[total - 1].frameId}</p>
                <p><b>Último evento:</b> {ultimoEvento ?? '—'}</p>
                <p><b>Segundos desde el snap:</b> {segundos === null ? '—' : segundos.toFixed(1)}</p>
              </div>
              <div className="tarjeta !p-3">
                <p className="mb-1 font-bold">Leyenda</p>
                <ul className="space-y-1">
                  <li className="flex items-center gap-2"><span className="h-3 w-3 rounded-full border border-white" style={{ background: colorO }} /> Ofensiva ({j.posesion})</li>
                  <li className="flex items-center gap-2"><span className="h-3 w-3 rounded-full border border-black" style={{ background: colorD }} /> Defensiva ({j.rival})</li>
                  <li className="flex items-center gap-2"><span className="h-3 w-3 rounded-full border-2 border-amarillo" /> QB de la jugada</li>
                  <li className="flex items-center gap-2"><span className="h-3 w-3 rounded-full border-2 border-[#FF1744]" /> Defensor con hit, hurry o sack (PFF)</li>
                  <li className="flex items-center gap-2"><span className="h-2 w-3 rounded-full bg-[#8B4513]" /> Balón · <span className="text-amarillo">┆</span> Línea de scrimmage</li>
                </ul>
              </div>
              <div className="tarjeta !p-3 text-xs">
                <p className="mb-1">{j.descripcion_es}</p>
                <details className="mb-2 opacity-70">
                  <summary className="cursor-pointer select-none">Ver original (inglés)</summary>
                  <p className="mt-1">{j.playDescription}</p>
                </details>
                <p className="rounded bg-amarillo/20 p-2 text-azul-oscuro dark:text-amarillo-claro">
                  El tracking termina poco después del lanzamiento, el sack o el inicio del scramble; no incluye la recepción ni la carrera posterior.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
