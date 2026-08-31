import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path' // 引入 path

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      // 告诉 Vite，遇到 @ 就替换为 src 目录的绝对路径
      '@': resolve(__dirname, 'src') 
    }
  }
})
