import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, rmSync } from 'fs';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-manifest-and-scripts',
      writeBundle() {
        const outDir = 'dist';

        // Copy manifest.json
        copyFileSync('src/manifest.json', `${outDir}/manifest.json`);

        // Move HTML files from src/ subdirectories to root
        copyFileSync(`${outDir}/src/popup/popup.html`, `${outDir}/popup.html`);
        copyFileSync(`${outDir}/src/side-panel/side-panel.html`, `${outDir}/side-panel.html`);

        // Clean up src directory
        rmSync(`${outDir}/src`, { recursive: true, force: true });
      },
    },
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/popup.html'),
        'side-panel': resolve(__dirname, 'src/side-panel/side-panel.html'),
        'content-script': resolve(__dirname, 'src/content-script/index.ts'),
        'background-worker': resolve(__dirname, 'src/background-worker/index.ts'),
        'injected-script': resolve(__dirname, 'src/content-script/injected-script.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
        dir: 'dist',
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
