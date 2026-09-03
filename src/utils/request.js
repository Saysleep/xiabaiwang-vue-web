import axios from 'axios';
import { useRouter } from 'vue-router'; // 假设使用 vue-router

// 创建 Axios 实例
const request = axios.create({
  baseURL: '/api', 
  timeout: 10000
});

// 请求拦截器：所有发往后端的 HTTP 请求，自动带上 Token
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('xiabaiwang_token');
    if (token) {
      // 按照 OAuth2.0 规范，通常加上 Bearer 前缀，但具体看你后端需不需要
      config.headers['Authorization'] = `Bearer ${token}`; 
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器：统一处理过期和错误
request.interceptors.response.use(
  (response) => {
    // 假设你后端的 Result 结构中，业务状态码在 response.data.code
    const res = response.data;
    if (res.code !== 200) {
      // 可以在这里统一引入 Element-Plus 或 Vant 的 Toast 报错
      console.error(res.message);
      return Promise.reject(new Error(res.message || 'Error'));
    }
    return res;
  },
  (error) => {
    // 处理 HTTP 状态码层面的错误 (如 401 Token 过期)
    if (error.response && error.response.status === 401) {
      console.warn('Token 已过期或无效，请重新登录');
      localStorage.removeItem('xiabaiwang_token');
      // 强制打回登录页
      window.location.href = '/login'; 
    }
    return Promise.reject(error);
  }
);

export default request;