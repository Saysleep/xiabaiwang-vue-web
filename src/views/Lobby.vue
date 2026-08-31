<template>
  <div class="lobby-container" @click="closeContextMenu">
    <header class="header">
      <div class="brand">瞎 掰 王 <span>v4.0</span></div>
      <button @click="handleLogout" class="btn-logout">退出登录</button>
    </header>

    <main class="main-content">
      <aside class="social-panel">
        <div class="user-profile">
          <div class="avatar">👤</div>
          <div class="info">
            <h3>{{ nickname }}</h3>
            <p class="score">⭐ 荣誉积分: {{ score }}</p>
          </div>
        </div>
        
        <div class="friends-list">
          <div class="tab-header">
            <span :class="{active: activeTab === 'friends'}" @click="activeTab = 'friends'">好友列表</span>
            <span :class="{active: activeTab === 'requests'}" @click="activeTab = 'requests'">
              新申请 <b v-if="requests.length" class="red-dot">{{ requests.length }}</b>
            </span>
          </div>
          
          <div v-if="activeTab === 'friends'" class="tab-content">
            <div class="add-friend-box">
              <input v-model="targetUsername" placeholder="输入 8 位账号搜索" @keyup.enter="searchFriend" />
              <button @click="searchFriend">搜索</button>
            </div>
            <ul class="list-wrapper">
              <li v-for="f in friends" :key="f.id" class="friend-item" 
                  @contextmenu.prevent="showContextMenu($event, f)" @dblclick="openChat(f)">
                <span :class="{'online': onlineStatus[f.nickname]}">
                  {{ onlineStatus[f.nickname] ? '🟢' : '⚪' }} {{ f.nickname }}
                </span>
                <span v-if="unreadCount[f.nickname]" class="unread-dot">{{ unreadCount[f.nickname] }}</span>
              </li>
            </ul>
          </div>

          <div v-if="activeTab === 'requests'" class="tab-content">
            <ul class="list-wrapper">
              <li v-for="r in requests" :key="r.applyId" class="req-item">
                <span>{{ r.nickname }}</span>
                <div>
                  <button class="btn-agree" @click="handleApply(r.applyId, true, r.nickname)">同意</button>
                  <button class="btn-reject" @click="handleApply(r.applyId, false, r.nickname)">拒绝</button>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </aside>

      <section class="action-board">
        <div class="board-header">
          <h2>公开房间大厅</h2>
          <div class="board-actions">
            <button @click="showCreateModal = true" class="btn-primary">🏠 创建房间</button>
            <div class="join-box">
              <input v-model="roomId" placeholder="6位房间号" maxlength="6" @keyup.enter="joinRoom(roomId)" />
              <button @click="joinRoom(roomId)" class="btn-secondary">加入</button>
            </div>
          </div>
        </div>
        
        <div class="room-grid">
          <div v-for="room in publicRooms" :key="room.roomId" class="room-card" :class="{'private-room': room.isPrivate}">
            <div class="room-card-head">
              <span class="room-id">No. {{ room.roomId }}</span>
              <span v-if="room.isPrivate" class="lock-icon">🔒 私密</span>
              <span v-else class="room-count">{{ room.playerCount }} / {{ room.maxPlayers }} 人</span>
            </div>
            <div class="room-card-body">
              <template v-if="room.isPrivate">
                <p class="private-tips">该房间为私密状态<br>需要密码才能进入</p>
              </template>
              <template v-else>
                <p>房主: {{ room.host }}</p>
                <p>发言限时: {{ room.timeLimit }} 秒</p>
              </template>
            </div>
            <button :class="room.isPrivate ? 'btn-join-private' : 'btn-join-card'" @click="joinRoom(room.roomId, room.isPrivate)">
              {{ room.isPrivate ? '🔑 输入密码加入' : '加入房间' }}
            </button>
          </div>
          <div v-if="publicRooms.length === 0" class="empty-rooms">当前没有公开房间，自己创建一个吧！</div>
        </div>
      </section>
    </main>

    <!-- 创建房间弹窗 -->
    <div v-if="showCreateModal" class="modal-overlay">
      <div class="modal-box">
        <h3>创建自定义房间</h3>
        <div class="form-group">
          <label>房间类型：</label>
          <select v-model="roomSetting.isPrivate">
            <option :value="false">🌐 公开房间</option>
            <option :value="true">🔒 私密房间</option>
          </select>
        </div>
        <div v-if="roomSetting.isPrivate" class="form-group">
          <label>房间密码：</label>
          <input v-model="roomSetting.password" type="text" placeholder="输入进入密码" />
        </div>
        <div class="form-group">
          <label>最大人数：</label>
          <input v-model.number="roomSetting.maxPlayers" type="number" min="3" max="10" />
        </div>
        <div class="form-group">
          <label>发言限时(秒)：</label>
          <input v-model.number="roomSetting.timeLimit" type="number" min="30" max="120" />
        </div>
        <div class="modal-actions">
          <button @click="showCreateModal = false" class="btn-cancel">取消</button>
          <button @click="submitCreateRoom" class="btn-confirm-green">确认创建</button>
        </div>
      </div>
    </div>

    <!-- ⭐ 好友搜索名片弹窗 -->
    <div v-if="searchResultUser" class="modal-overlay">
      <div class="modal-box user-card">
        <h3>🔍 玩家名片</h3>
        <div class="card-avatar">👤</div>
        <h2>{{ searchResultUser.nickname }}</h2>
        <p>账号：{{ searchResultUser.username }}</p>
        <p class="card-score">荣誉积分：{{ searchResultUser.score }} ⭐</p>
        <div class="modal-actions">
          <button @click="searchResultUser = null" class="btn-cancel">关闭</button>
          <button @click="confirmApplyFriend" class="btn-confirm-blue">发送申请</button>
        </div>
      </div>
    </div>

    <!-- ⭐ 中央弹窗系统 (Alert, Confirm, Prompt) -->
    <div v-if="ui.visible" class="custom-modal-overlay">
      <div class="custom-modal">
        <h3 v-if="ui.title">{{ ui.title }}</h3>
        <p class="modal-msg" v-html="ui.msg"></p>
        
        <input v-if="ui.type === 'prompt'" v-model="ui.inputVal" class="modal-input" placeholder="请输入内容..." @keyup.enter="ui.onConfirm(ui.inputVal)" />

        <div class="modal-actions-center">
          <button v-if="ui.type !== 'alert'" @click="ui.onCancel" class="btn-cancel">取消</button>
          <button @click="ui.onConfirm(ui.inputVal)" class="btn-confirm-green">确 定</button>
        </div>
      </div>
    </div>

    <!-- 右键菜单 -->
    <div v-show="contextMenu.visible" :style="{top: contextMenu.y + 'px', left: contextMenu.x + 'px'}" class="context-menu">
      <div @click="openChat(contextMenu.target)">💬 发送消息</div>
      <div @click="inviteRoom(contextMenu.target)">🎮 邀请加入当前房间</div>
      <div @click="requestJoin(contextMenu.target)">🏃 求拉入房间</div>
      <div class="menu-danger" @click="deleteFriend(contextMenu.target)">🗑️ 删除好友</div>
    </div>

    <!-- 悬浮聊天 -->
    <div v-if="chatTarget" class="chat-box">
      <div class="chat-header">与 {{ chatTarget }} 聊天中 <span class="close-chat" @click="chatTarget = ''">✖</span></div>
      <div class="chat-history">
        <div v-for="(msg, idx) in chatHistory[chatTarget] || []" :key="idx" :class="['msg-line', msg.from === nickname ? 'msg-me' : 'msg-other']">{{ msg.content }}</div>
      </div>
      <div class="chat-input"><input v-model="chatInput" @keyup.enter="sendChat" placeholder="回车发送..." /></div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
// ⭐ 核心修改 1：引入封装好的 request，代替原生 axios
import request from '@/utils/request' 


const router = useRouter()
const nickname = ref(localStorage.getItem('nickname') || '神秘玩家')
const score = ref(localStorage.getItem('score') || 0)
const roomId = ref('')

const activeTab = ref('friends')
const friends = ref([])
const requests = ref([])
const targetUsername = ref('')
const onlineStatus = reactive({})
const searchResultUser = ref(null)

const publicRooms = ref([])
const showCreateModal = ref(false)
const roomSetting = reactive({ isPrivate: false, password: '', maxPlayers: 6, timeLimit: 60 })

let globalWs = null
const contextMenu = reactive({ visible: false, x: 0, y: 0, target: null })
const chatTarget = ref('')
const chatInput = ref('')
const chatHistory = reactive({})
const unreadCount = reactive({})

const ui = reactive({ visible: false, type: 'alert', title: '', msg: '', inputVal: '', onConfirm: null, onCancel: null })
const customAlert = (msg, title = '提示') => { ui.type = 'alert'; ui.title = title; ui.msg = msg; ui.visible = true; ui.onConfirm = () => { ui.visible = false } }
const customConfirm = (msg, cbConfirm, title = '系统确认') => { ui.type = 'confirm'; ui.title = title; ui.msg = msg; ui.visible = true; ui.onConfirm = () => { ui.visible = false; cbConfirm() }; ui.onCancel = () => { ui.visible = false } }
const customPrompt = (msg, cbConfirm, title = '系统输入') => { ui.type = 'prompt'; ui.title = title; ui.msg = msg; ui.inputVal = ''; ui.visible = true; ui.onConfirm = (val) => { ui.visible = false; cbConfirm(val) }; ui.onCancel = () => { ui.visible = false } }

onMounted(() => { fetchSocialData(); fetchPublicRooms(); initGlobalWebSocket() })
onUnmounted(() => { if (globalWs) globalWs.close() })

const initGlobalWebSocket = () => {
  // ⭐ 核心修改 2：取出 token，使用 token 进行 WebSocket 握手
  const token = localStorage.getItem('xiabaiwang_token')
  if (!token) {
    return router.push('/login')
  }

  // 此处连接地址使用相对路径或统配的 baseURL 地址
  globalWs = new WebSocket(`ws://localhost:8080/ws/global/${token}`)
  
  globalWs.onclose = (event) => {
    // 监听后端抛出的 VIOLATED_POLICY 错误码（1008），处理鉴权失败情况
    if (event.code === 1008) {
      customAlert('登录已过期，请重新登录')
      localStorage.removeItem('xiabaiwang_token')
      router.push('/login')
    }
  }

  globalWs.onmessage = (event) => {
    const data = JSON.parse(event.data)
    if (data.type === 'online_status') onlineStatus[data.user] = data.isOnline
    else if (data.type === 'chat') {
      if (!chatHistory[data.from]) chatHistory[data.from] = []
      chatHistory[data.from].push({ from: data.from, content: data.msg })
      if (chatTarget.value !== data.from) unreadCount[data.from] = (unreadCount[data.from] || 0) + 1
    } 
    else if (data.type === 'invite') {
      customConfirm(`好友 [${data.from}] 邀请你加入房间 [${data.roomId}]，是否前往？`, () => {
        router.push({ path: `/room/${data.roomId}`, query: { invite: '1' } })
      })
    } 
    else if (data.type === 'request_join') customAlert(`好友 [${data.from}] 正在求拉，快去右键邀请他吧！`)
    else if (data.type === 'room_list_update') fetchPublicRooms()
    else if (data.type === 'social_update') fetchSocialData()
  }
}

const showContextMenu = (e, friend) => { contextMenu.x = e.clientX; contextMenu.y = e.clientY; contextMenu.target = friend; contextMenu.visible = true }
const closeContextMenu = () => { contextMenu.visible = false }
const openChat = (friendOrName) => { const name = friendOrName.nickname || friendOrName; chatTarget.value = name; unreadCount[name] = 0 }

const sendChat = () => {
  if (!chatInput.value.trim() || !globalWs) return
  globalWs.send(JSON.stringify({ type: 'chat', target: chatTarget.value, msg: chatInput.value }))
  if (!chatHistory[chatTarget.value]) chatHistory[chatTarget.value] = []
  chatHistory[chatTarget.value].push({ from: nickname.value, content: chatInput.value })
  chatInput.value = ''
}
const inviteRoom = (friend) => {
  const currentRoom = localStorage.getItem('currentRoom')
  if (!currentRoom) return customAlert('你目前不在任何房间内！')
  globalWs.send(JSON.stringify({ type: 'invite', target: friend.nickname, roomId: currentRoom }))
  customAlert('邀请已发送！')
}
const requestJoin = (friend) => { globalWs.send(JSON.stringify({ type: 'request_join', target: friend.nickname })); customAlert('求拉请求已发送！') }

// ⭐ 核心修改 3：移除所有的 headers 手动注入和 data 解构，全部走 request 实例
const fetchSocialData = async () => {
  try {
    const res = await request.get('/friend/list')
    friends.value = res.friends || res.data?.friends || [] 
    requests.value = res.requests || res.data?.requests || []
  } catch (e) {}
}

const fetchPublicRooms = async () => {
  try {
    const res = await request.get('/room/list')
    publicRooms.value = res.data || []
  } catch(e) {}
}

const searchFriend = async () => {
  if (!targetUsername.value) return customAlert('请输入要搜索的账号！')
  try {
    const res = await request.get(`/friend/search?username=${targetUsername.value}`)
    searchResultUser.value = res.data
  } catch(e){ 
    // 错误在拦截器中已经可以统一处理，这里的 catch 可留作特定的 UI 异常兜底
  }
}

const confirmApplyFriend = async () => {
  const currentTarget = searchResultUser.value.username; searchResultUser.value = null
  try {
    const res = await request.post('/friend/apply', { username: currentTarget })
    customAlert(res.message || '申请已发送')
    targetUsername.value = ''
    if (globalWs) globalWs.send(JSON.stringify({ type: 'social_update', target: currentTarget }))
  } catch (e) {}
}

const handleApply = async (applyId, agree, targetNickname) => {
  try {
    await request.post('/friend/handle', { applyId, agree })
    fetchSocialData()
    if (globalWs) globalWs.send(JSON.stringify({ type: 'social_update', target: targetNickname }))
  } catch (e) {}
}

const deleteFriend = (friend) => {
  customConfirm(`确定删除好友 [${friend.nickname}] 吗？`, async () => {
    try {
      await request.post('/friend/delete', { username: friend.username })
      fetchSocialData()
      if (globalWs) globalWs.send(JSON.stringify({ type: 'social_update', target: friend.nickname }))
    } catch (e) {}
  })
}

const submitCreateRoom = async () => {
  if (roomSetting.isPrivate && !roomSetting.password.trim()) return customAlert('私密房间必须设置密码！')
  try {
    const res = await request.post('/room/create', { ...roomSetting, nickname: nickname.value })
    // 如果走到这行，拦截器已经判断 code === 200
    const newRoomId = res.data.roomId || res.roomId || res.data
    localStorage.setItem('currentRoom', newRoomId)
    sessionStorage.setItem(`access_${newRoomId}`, '1')
    router.push(`/room/${newRoomId}`) 
  } catch (e) {}
}

const joinRoom = async (id, isPrivate = false) => { 
  if (!id) return
  id = id.toUpperCase()
  let targetRoom = publicRooms.value.find(r => r.roomId === id)
  let isTargetPrivate = isPrivate || (targetRoom && targetRoom.isPrivate)

  if (!targetRoom) {
     try {
        const res = await request.get(`/room/info?roomId=${id}`)
        isTargetPrivate = res.data.isPrivate || res.isPrivate
     } catch(e) {
        return // 错误弹窗交给了全局拦截器
     }
  }

  if (isTargetPrivate) {
    customPrompt('该房间为私密状态，请输入密码：', async (pwd) => {
      if (!pwd) return customAlert('密码不能为空！') 
      try {
        await request.post('/room/verify', { roomId: id, password: pwd })
        // 验证成功
        localStorage.setItem('currentRoom', id)
        sessionStorage.setItem(`access_${id}`, '1')
        router.push(`/room/${id}`) 
      } catch(e) { 
        // 密码错误等业务异常在拦截器处理
      }
    })
    return
  }
  
  localStorage.setItem('currentRoom', id)
  sessionStorage.setItem(`access_${id}`, '1')
  router.push(`/room/${id}`) 
}

const handleLogout = () => { customConfirm('确定要退出当前账号吗？', () => { localStorage.clear(); router.push('/login') }) }
</script>

<style scoped>
/* 样式部分保持不变 */
.lobby-container { min-height: 100vh; background: #1a252f; color: white; display: flex; flex-direction: column; position: relative;}
.header { display: flex; justify-content: space-between; padding: 15px 40px; background: #2c3e50; border-bottom: 2px solid #000; }
.brand { font-size: 24px; font-weight: bold; }
.btn-logout { background: #c0392b; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; }
.main-content { flex: 1; display: flex; padding: 30px; gap: 30px; max-width: 1400px; margin: 0 auto; width: 100%; box-sizing: border-box; }

.social-panel { width: 320px; display: flex; flex-direction: column; gap: 20px; }
.user-profile { background: #34495e; padding: 20px; border-radius: 12px; display: flex; align-items: center; gap: 15px; border-left: 5px solid #f1c40f; }
.avatar { font-size: 40px; }
.friends-list { background: #34495e; border-radius: 12px; flex: 1; display: flex; flex-direction: column; overflow: hidden;}
.tab-header { display: flex; background: #2c3e50; cursor: pointer; }
.tab-header span { flex: 1; text-align: center; padding: 12px; font-size: 14px; font-weight: bold;}
.tab-header .active { background: #34495e; border-bottom: 2px solid #3498db; }
.red-dot { background: #e74c3c; color: white; border-radius: 50%; padding: 2px 6px; font-size: 12px; }
.tab-content { padding: 15px; display: flex; flex-direction: column; flex: 1; }
.add-friend-box { display: flex; gap: 8px; margin-bottom: 15px; }
.add-friend-box input { flex: 1; padding: 8px; border: none; border-radius: 4px; }
.add-friend-box button { background: #3498db; color: white; border: none; border-radius: 4px; padding: 0 15px; cursor: pointer; }
.list-wrapper { list-style: none; padding: 0; margin: 0; overflow-y: auto; flex: 1;}
.friend-item { padding: 12px 10px; border-bottom: 1px dashed #7f8c8d; font-size: 15px; display: flex; justify-content: space-between; cursor: context-menu; transition: background 0.2s; user-select: none;}
.friend-item:hover { background: rgba(255,255,255,0.1); }
.online { font-weight: bold; color: #2ecc71; }
.unread-dot { background: #e74c3c; padding: 2px 6px; border-radius: 10px; font-size: 12px; }
.req-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px dashed #7f8c8d; font-size: 14px; }
.btn-agree { background: #27ae60; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; margin-right: 5px; }
.btn-reject { background: #c0392b; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; }

.action-board { flex: 1; background: #2c3e50; border-radius: 12px; padding: 30px; display: flex; flex-direction: column; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
.board-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #34495e; padding-bottom: 20px; margin-bottom: 20px;}
.board-header h2 { margin: 0; color: #ecf0f1; }
.board-actions { display: flex; gap: 15px; }
.btn-primary { background: #3498db; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; }
.btn-secondary { background: #9b59b6; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; }
.join-box { display: flex; gap: 5px; }
.join-box input { padding: 10px; border-radius: 8px; border: none; text-align: center; width: 120px; }

.room-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px; overflow-y: auto; }
.room-card { background: #34495e; border-radius: 10px; padding: 15px; border: 1px solid #7f8c8d; display: flex; flex-direction: column; gap: 10px;}
.private-room { border-color: #e74c3c; background: #2c3e50; opacity: 0.9; }
.room-card-head { display: flex; justify-content: space-between; font-weight: bold; font-size: 18px; color: #f1c40f; border-bottom: 1px dashed #7f8c8d; padding-bottom: 10px;}
.lock-icon { color: #e74c3c; }
.room-card-body p { margin: 5px 0; font-size: 14px; color: #bdc3c7;}
.private-tips { color: #e74c3c !important; text-align: center; font-style: italic; margin-top: 15px !important;}
.btn-join-card { background: #27ae60; color: white; border: none; padding: 10px; border-radius: 6px; font-weight: bold; cursor: pointer; width: 100%; margin-top: auto;}
.btn-join-private { background: #c0392b; color: white; border: none; padding: 10px; border-radius: 6px; font-weight: bold; cursor: pointer; width: 100%; margin-top: auto;}

.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal-box { background: #ecf0f1; color: #2c3e50; padding: 30px; border-radius: 12px; width: 400px; }
.modal-box h3 { margin-top: 0; text-align: center; margin-bottom: 20px;}
.form-group { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.form-group input, .form-group select { padding: 8px; border: 1px solid #bdc3c7; border-radius: 4px; width: 200px; }
.modal-actions { display: flex; justify-content: space-between; margin-top: 30px; }

.user-card { text-align: center; }
.card-avatar { font-size: 60px; margin-bottom: 10px; }
.card-score { color: #e67e22; font-weight: bold; font-size: 18px; margin-top: 10px; }

.custom-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 9999; }
.custom-modal { background: #2c3e50; padding: 30px; border-radius: 12px; width: 340px; text-align: center; border: 2px solid #3498db; color: white; box-shadow: 0 10px 30px rgba(0,0,0,0.5);}
.modal-msg { margin: 20px 0; font-size: 16px; line-height: 1.5; color: #ecf0f1;}
.modal-input { width: 100%; padding: 12px; margin-bottom: 20px; border-radius: 6px; border: none; font-size: 16px; text-align: center; box-sizing: border-box;}
.modal-actions-center { display: flex; gap: 15px; justify-content: center; }

.btn-cancel { background: #95a5a6; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold;}
.btn-confirm-green { background: #27ae60; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold;}
.btn-confirm-blue { background: #3498db; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold;}

.context-menu { position: fixed; background: #ecf0f1; color: #2c3e50; border-radius: 6px; box-shadow: 0 5px 15px rgba(0,0,0,0.3); z-index: 1000; padding: 5px 0; min-width: 150px;}
.context-menu div { padding: 10px 20px; font-size: 14px; cursor: pointer; }
.context-menu div:hover { background: #bdc3c7; }
.menu-danger { color: #c0392b; border-top: 1px solid #bdc3c7; }

.chat-box { position: fixed; bottom: 20px; right: 20px; width: 300px; height: 400px; background: #ecf0f1; border-radius: 8px 8px 0 0; display: flex; flex-direction: column; box-shadow: 0 -5px 20px rgba(0,0,0,0.5); z-index: 50;}
.chat-header { background: #3498db; color: white; padding: 10px; border-radius: 8px 8px 0 0; display: flex; justify-content: space-between; font-weight: bold; }
.close-chat { cursor: pointer; }
.chat-history { flex: 1; padding: 10px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; }
.msg-line { max-width: 80%; padding: 8px 12px; border-radius: 15px; font-size: 14px; word-break: break-all; }
.msg-me { background: #3498db; color: white; align-self: flex-end; border-bottom-right-radius: 2px; }
.msg-other { background: #bdc3c7; color: #2c3e50; align-self: flex-start; border-bottom-left-radius: 2px; }
.chat-input { padding: 10px; border-top: 1px solid #bdc3c7; }
.chat-input input { width: 100%; padding: 8px; border: 1px solid #95a5a6; border-radius: 15px; outline: none; box-sizing: border-box; }
</style>