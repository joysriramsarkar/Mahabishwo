import { defineConfig, type Plugin, type ResolvedConfig } from 'vite';
import glsl from 'vite-plugin-glsl';
import { resolve, basename, extname } from 'path';
import { existsSync, mkdirSync, copyFileSync, readFileSync, readdirSync } from 'fs';

const MIME_BY_EXT: Record<string, string> = {
  '.wasm': 'application/wasm',
  '.mjs': 'application/javascript; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
};

function getOrtRuntimeFiles(ortDistDir: string): string[] {
  if (!existsSync(ortDistDir)) return [];
  return readdirSync(ortDistDir).filter(
    (name) => name.startsWith('ort-wasm') && (name.endsWith('.wasm') || name.endsWith('.mjs'))
  );
}

/**
 * Serves ONNX Runtime Web WASM/JSEP/Asyncify runtime artifacts from node_modules
 * during dev and copies them into dist/ort/ during production builds without
 * committing ~60 MB of binary artifacts to git.
 */
function ortRuntimePlugin(): Plugin {
  let config: ResolvedConfig;
  const ortDistDir = resolve(__dirname, 'node_modules/onnxruntime-web/dist');
  const runtimeFiles = getOrtRuntimeFiles(ortDistDir);

  return {
    name: 'onnxruntime-web-assets',
    configResolved(resolved) {
      config = resolved;
    },
    configureServer(server) {
      const base = config.base.endsWith('/') ? config.base : `${config.base}/`;
      const prefix = `${base}ort/`;
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0] ?? '';
        if (!url.startsWith(prefix)) return next();

        const fileName = basename(url.slice(prefix.length));
        if (!runtimeFiles.includes(fileName)) return next();

        const fullPath = resolve(ortDistDir, fileName);
        if (!existsSync(fullPath)) return next();

        const mime = MIME_BY_EXT[extname(fileName)] || 'application/octet-stream';
        res.setHeader('Content-Type', mime);
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.end(readFileSync(fullPath));
      });
    },
    closeBundle() {
      const outDir = resolve(__dirname, config.build.outDir, 'ort');
      mkdirSync(outDir, { recursive: true });
      for (const fileName of runtimeFiles) {
        const src = resolve(ortDistDir, fileName);
        if (existsSync(src)) {
          copyFileSync(src, resolve(outDir, fileName));
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [
    glsl({
      include: ['**/*.glsl', '**/*.vert', '**/*.frag', '**/*.vs', '**/*.fs'],
      minify: false,
    }),
    ortRuntimePlugin(),
  ],
  optimizeDeps: {
    exclude: ['onnxruntime-web'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    target: 'esnext',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          postprocessing: ['postprocessing'],
        },
      },
    },
  },
});
