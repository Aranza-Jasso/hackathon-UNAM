export const MUESTRA_MINIMA = 20

export const pct = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${(v * 100).toFixed(1)} %`)
export const num = (v: number | null | undefined, decimales = 2) => (v === null || v === undefined ? '—' : v.toFixed(decimales))

const RESULTADOS: Record<string, string> = { C: 'Completo', I: 'Incompleto', IN: 'Intercepción', S: 'Sack', R: 'Scramble' }
export const resultado = (r: string) => RESULTADOS[r] ?? r

// Nombres en español de los 7 valores de `offenseFormation`. El valor original se conserva en el tooltip.
const FORMACIONES: Record<string, string> = {
  SHOTGUN: 'Escopeta',
  EMPTY: 'Backfield vacío',
  SINGLEBACK: 'Un corredor',
  I_FORM: 'Formación I',
  PISTOL: 'Pistola',
  JUMBO: 'Pesada',
  WILDCAT: 'Gato montés',
}
export const formacion = (v: string) => FORMACIONES[v] ?? v

const ORDINAL = ['', '1.º', '2.º', '3.º', '4.º']
export const downYDistancia = (down: number, ytg: number) => (down >= 1 && down <= 4 ? `${ORDINAL[down]} y ${ytg}` : `— y ${ytg}`)
export const cuarto = (q: number) => (q === 5 ? 'TE' : `Q${q}`)
