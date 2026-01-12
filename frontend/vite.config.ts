import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Allow external connections (needed for ngrok)
    port: 5173,
    allowedHosts: [
      'semirhythmical-caron-unsaleably.ngrok-free.dev',
      '.ngrok-free.dev', // Allow all ngrok subdomains
      '.ngrok.io', // Allow all ngrok.io subdomains
      '.ngrok-free.app', // Allow all ngrok-free.app subdomains
      'localhost',
      '127.0.0.1'
    ],
    hmr: {
      clientPort: 443, // Use HTTPS port for ngrok HTTPS tunnels
      protocol: 'wss', // WebSocket Secure for HTTPS ngrok
    },
    watch: {
      usePolling: false, // Better performance
    }
  }
})
