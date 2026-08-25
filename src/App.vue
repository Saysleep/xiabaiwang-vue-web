<template>
  <!-- 这里的 router-view 就是页面的“画框”，路由匹配到哪个页面，就往这里塞哪个页面 -->
  <router-view></router-view>
</template>

<style>
/* 清楚默认边距，让全屏生效 */
body {
  margin: 0;
  padding: 0;
  background-color: #2c3e50; /* 先给个深色背景，有点酒馆大厅的氛围 */
  color: white;
}
</style>