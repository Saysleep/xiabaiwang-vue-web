import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import Lobby from '../views/Lobby.vue'
import Room from '../views/Room.vue' // 👈 引入新写的房间组件

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', name: 'Login', component: Login },
  { path: '/lobby', name: 'Lobby', component: Lobby },
  // 👈 :id 是一个动态参数，代表房间号
  { path: '/room/:id', name: 'Room', component: Room } 
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router