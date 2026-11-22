import fs from 'fs';
import net from 'net';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
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

function localTjGenPlugin(tjGenDir: string, port = 3010): Plugin {
  let child: ChildProcess | null = null;

  const isPortInUse = (targetPort: number): Promise<boolean> =>
    new Promise((resolve) => {
      const socket = net.createConnection({ port: targetPort, host: '127.0.0.1' });
      socket.once('connect', () => {
        socket.destroy();
        resolve(true);
      });
      socket.once('error', () => {
        resolve(false);
      });
    });

  const stopChild = () => {
    if (child && !child.killed) {
      child.kill('SIGTERM');
      child = null;
    }
  };

  return {
    name: 'local-tj-gen',
    apply: 'serve',
    async configureServer(server) {
      if (process.env.USE_LOCAL_TJ_GEN !== 'true') {
        return;
      }

      if (!fs.existsSync(tjGenDir)) {
        console.warn(`[local-tj-gen] Directory not found: ${tjGenDir}`);
        return;
      }

      if (await isPortInUse(port)) {
        console.log(`[local-tj-gen] Port ${port} already in use; reusing existing tj-gen instance.`);
        return;
      }

      console.log(`[local-tj-gen] Starting local tj-gen from ${tjGenDir} on port ${port}...`);
      child = spawn('npm', ['run', 'dev'], {
        cwd: tjGenDir,
        stdio: 'inherit',
        shell: process.platform === 'win32',
        env: { ...process.env, PORT: String(port) },
      });

      child.on('exit', (code) => {
        if (code !== null && code !== 0) {
          console.warn(`[local-tj-gen] tj-gen exited with code ${code}`);
        }
        child = null;
      });

      server.httpServer?.once('close', stopChild);
      process.once('exit', stopChild);
      process.once('SIGINT', stopChild);
      process.once('SIGTERM', stopChild);
    },
  };
}

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, '.', '');
  const tjGenDir = path.resolve(__dirname, '../tj-gen');
  const tjGenPort = Number(env.TJ_GEN_PORT) || 3010;
  const localTjGenUrl =
    env.VITE_TJ_GEN_URL ||
    env.TJ_GEN_URL ||
    (command === 'serve' && process.env.USE_LOCAL_TJ_GEN === 'true' && fs.existsSync(tjGenDir)
      ? `http://localhost:${tjGenPort}`
      : '');

  return {
    server: {
      port: 5173,
      host: '0.0.0.0',
      fs: {
        allow: ['..']
      }
    },
    plugins: [react(), tailwindcss(), localComponentsPlugin(), localTjGenPlugin(tjGenDir, tjGenPort)],
    base: './',
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.NODE_ENV': JSON.stringify(mode),
      'process.env.POCKETBASE_URL': JSON.stringify(env.POCKETBASE_URL || env.PUBLIC_POCKETBASE_URL || env.VITE_POCKETBASE_URL || 'https://pb.teacherjake.com'),
      'process.env.FILES_BASE_URL': JSON.stringify(env.FILES_BASE_URL || 'https://files.teacherjake.com'),
      'process.env.VITE_GAS_SUBMISSION_URL': JSON.stringify(env.VITE_GAS_SUBMISSION_URL || env.VITE_SUBMISSION_URL || ''),
      'process.env.VITE_TJ_GEN_URL': JSON.stringify(localTjGenUrl),
      'import.meta.env.VITE_TJ_GEN_URL': JSON.stringify(localTjGenUrl)
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
