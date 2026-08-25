import { createApp } from 'vue'
import App from './App.vue'
import router from './router' // 引入路由配置

const app = createApp(App)
app.use(router) // 告诉 Vue 使用这个路由
app.mount('#app')