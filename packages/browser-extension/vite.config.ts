import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-built-popup',
      closeBundle() {
        // Copy built popup.html to dist root for extension manifest
        const src = path.resolve(__dirname, 'dist/src/popup/index.html')
        const dest = path.resolve(__dirname, 'dist/popup.html')
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest)
        }
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'terser',
    rollupOptions: {
      input: {
        popup: path.resolve(__dirname, 'src/popup/index.html'),
        background: path.resolve(__dirname, 'src/background/index.ts'),
        content: path.resolve(__dirname, 'src/content/index.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
  },
  publicDir: 'public',
  optimizeDeps: {
    include: ['react', 'react-dom', 'zustand', '@supabase/supabase-js', 'webextension-polyfill'],
  },
})