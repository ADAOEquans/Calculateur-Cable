import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Base URL for GitHub Pages: https://adaoequans.github.io/Calculateur-Cable/
  base: '/Calculateur-Cable/',
})
