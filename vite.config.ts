import fs from 'fs';
import path from 'path';
import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

function localComponentsPlugin(): Plugin {
  return {
    name: 'serve-local-tj-components',
    configureServer(server) {
      server.middlewares.use('/@tj-components', (req, res, next) => {
        const urlPath = req.url?.split('?')[0] || '';
        const fileName = urlPath.replace(/^\//, '');
        const filePath = path.resolve(__dirname, '../tj-components/dist', fileName);
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          res.setHeader('Content-Type', 'application/javascript');
          res.setHeader('Access-Control-Allow-Origin', '*');
          return fs.createReadStream(filePath).pipe(res);
        }
        next();
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 5173,
      host: '0.0.0.0',
      fs: {
        allow: ['..']
      }
    },
    plugins: [react(), tailwindcss(), localComponentsPlugin()],
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
