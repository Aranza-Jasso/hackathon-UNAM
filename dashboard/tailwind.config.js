/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // 'media': el modo claro/oscuro sigue la preferencia del dispositivo.
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        // Paleta general (menú y elementos sin información de equipos): azul, rojo, blanco y amarillo.
        azul: { DEFAULT: '#013369', claro: '#1E5AA8', oscuro: '#0A1A33', noche: '#060F20' },
        rojo: { DEFAULT: '#D50A0A', claro: '#F04646' },
        amarillo: { DEFAULT: '#FFB612', claro: '#FFD166' },
      },
    },
  },
  plugins: [],
}
