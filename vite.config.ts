import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // Served from https://<user>.github.io/ks-piano/ on GitHub Pages.
  base: command === 'build' ? '/ks-piano/' : '/',
  plugins: [react()],
}))
