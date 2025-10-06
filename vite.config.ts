import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  
  // Base path for assets – important for deployment on Vercel
  base: '/',

  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    alias: {
      '@': path.resolve(__dirname, './src'), // use '@' for src
      // Optional: add more aliases here if needed, no versions required
    },
  },

  build: {
    target: 'esnext',   // modern JS output
    outDir: 'build',    // Vercel static-build folder
    sourcemap: false,   // optional: disable sourcemaps for smaller build
    chunkSizeWarningLimit: 2000, // optional: suppress chunk size warnings
  },

  server: {
    port: 3000,   // local dev server port
    open: true,   // open browser on dev start
  },
});
