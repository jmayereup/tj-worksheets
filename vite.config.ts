import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';


export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 5173,
      host: '0.0.0.0',
    },
    plugins: [react(), tailwindcss()],
    base: './',
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.NODE_ENV': JSON.stringify(mode),
      'process.env.POCKETBASE_URL': JSON.stringify(env.POCKETBASE_URL || env.PUBLIC_POCKETBASE_URL || env.VITE_POCKETBASE_URL || 'https://pb.teacherjake.com'),
      'process.env.FILES_BASE_URL': JSON.stringify(env.FILES_BASE_URL || 'https://files.teacherjake.com'),
      'process.env.VITE_GAS_SUBMISSION_URL': JSON.stringify(env.VITE_GAS_SUBMISSION_URL || env.VITE_SUBMISSION_URL || '')
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: process.env.VITE_WC ? {
      outDir: 'dist/wc',
      emptyOutDir: false,
      lib: {
        entry: {
          'tj-pocketbase-worksheet': path.resolve(__dirname, 'pocketbase-worksheet.tsx'),
          'tj-chapter-book': path.resolve(__dirname, 'chapter-book.tsx')
        },
        name: 'TJWorksheets',
        fileName: (format, entryName) => `${entryName}.${format}.js`
      }
    } : {
      outDir: 'dist',
      emptyOutDir: true
    }
  };
});
