import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],

  // Base path for assets – ensures correct paths on Vercel
  base: '/',

  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    alias: {
      // Use '@' to reference your src folder
      '@': path.resolve(__dirname, './src'),

      // Only alias packages if you really need it, without versions
      // Example: '@radix-ui/react-switch': '@radix-ui/react-switch',
      // Otherwise, you can remove package aliases entirely
    },
  },

  build: {
    target: 'esnext',   // modern JS output
    outDir: 'build',    // matches Vercel static-build folder
    sourcemap: false,   // optional: disable sourcemaps for smaller build
    chunkSizeWarningLimit: 2000, // optional: suppress chunk size warnings
  },

  server: {
    port: 3000,   // local dev server port
    open: true,   // open browser automatically
  },
});
