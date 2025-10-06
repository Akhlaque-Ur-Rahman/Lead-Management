import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],

  // Base path ensures assets load correctly on Vercel
  base: '/',

  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    alias: {
      // Only alias your src folder
      '@': path.resolve(__dirname, './src'),

      // Remove all package aliases with version numbers
      // You can import packages normally in your code
      // Example: import { Label } from '@radix-ui/react-label';
    },
  },

  build: {
    target: 'esnext',   // modern JS output
    outDir: 'build',    // folder Vercel expects
    sourcemap: false,   // optional: disable for smaller build
    chunkSizeWarningLimit: 2000, // optional: suppress large chunk warnings
  },

  server: {
    port: 3000,
    open: true,
  },
});
