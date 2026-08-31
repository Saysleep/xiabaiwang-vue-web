export class GameSocketService {
  constructor() {
    this.globalWs = null;
    this.roomWs = null;
    // 替换为你的后端实际地址
    this.baseUrl = 'ws://localhost:8080/ws'; 
  }

  // 连接大厅全局 Socket
  connectGlobal() {
    const token = localStorage.getItem('xiabaiwang_token');
    if (!token) {
      console.error("未找到 Token，拒绝建立 WebSocket 连接");
      window.location.href = '/login';
      return;
    }

    // ⭐ 核心改变：URL 路径最后跟的是 token，而非 nickname
    this.globalWs = new WebSocket(`${this.baseUrl}/global/${token}`);

    this.globalWs.onopen = () => console.log('🌐 全局大厅连接成功');
    
    this.globalWs.onclose = (event) => {
      // 判断后端是否因为验签失败主动踢出 (我们在后端写的 CloseCodes.VIOLATED_POLICY)
      if (event.code === 1008) {
        console.error('WebSocket 鉴权失败，Token 可能被篡改或过期');
        localStorage.removeItem('xiabaiwang_token');
        window.location.href = '/login';
      }
    };
    
    this.globalWs.onmessage = (msg) => {
      // 处理大厅逻辑，如刷新房间列表
    };
  }

  // 连接局内房间 Socket
  connectRoom(roomId) {
    const token = localStorage.getItem('xiabaiwang_token');
    if (!token) return;

    // ⭐ 同理，传入 roomId 和 token
    this.roomWs = new WebSocket(`${this.baseUrl}/room/${roomId}/${token}`);

    this.roomWs.onopen = () => console.log(`🚪 成功进入房间: ${roomId}`);
    // ... 局内事件监听 ...
  }
}