<template>
  <div class="room-container">
    <header class="room-header">
      <div class="room-info">
        <span class="room-id">🏠 房间: {{ roomId }}</span>
        <span class="invite-btn" @click="copyLink" v-if="gamePhase === 'WAITING'">🔗 复制邀请链接</span>
      </div>
      
      <div class="header-actions">
        <button class="btn-friends" @click="showFriendsDrawer = true">👥 好友面板</button>
        <button v-if="gamePhase === 'WAITING'" @click="leaveRoom" class="btn-leave">🚪 离开</button>
        <span v-if="gamePhase !== 'WAITING'" class="playing-status">🔥 {{ phaseText }}</span>
      </div>
    </header>

    <main class="game-board">
      <div class="log-board" v-if="gamePhase !== 'WAITING'">
        <p v-for="(log, idx) in gameLogs" :key="idx" class="log-item">{{ log }}</p>
      </div>

      <div class="my-identity-panel" v-if="gamePhase === 'SPEAKING' || gamePhase === 'JUDGING'">
        <div class="my-role-info">身份: <span class="role-text" :class="myRole === '老实人' ? 'honest' : (myRole === '大聪明' ? 'smart' : 'bluffer')">{{ myRole }}</span></div>
        <div v-if="myRole === '老实人'" class="true-answer-box-mini">🤫 真相：{{ trueAnswer }}</div>
        <div v-if="myRole === '瞎掰人'" class="bluff-tips-mini">🧠 请尽情瞎掰</div>
        <div v-if="myRole === '大聪明'" class="smart-tips-mini">🕵️ 找出老实人</div>
      </div>

      <div class="table">
        <div v-if="gamePhase === 'WAITING'">
          <h2 class="table-text">准备阶段</h2>
          <p class="waiting-text">当前人数: {{ players.length }} / {{ maxPlayers }}</p>
          <p class="waiting-text">⏱️ 发言限时: {{ timeLimit }}s</p>
        </div>
        <div v-else class="active-table">
          <h2 class="question-text">{{ questionTitle }}</h2>
          <h3 class="turn-indicator" :class="{ 'my-turn': activePlayer === nickname }">
            {{ activePlayer === nickname ? '👉 轮到你了！' : `等待 ${activePlayer} 行动...` }}
          </h3>
          <div class="timer" v-if="gamePhase === 'SPEAKING'">⏳ 发言倒计时: {{ countdown }}s</div>
        </div>
      </div>
      
      <div class="player-zone">
        <div class="players-container">
          <div v-for="(player, index) in players" :key="index" class="player-wrapper">
            <div class="player-avatar" :class="{ 'active-player': player.nickname === activePlayer, 'is-big-smart': player.nickname === bigSmartPlayer, 'is-host': player.nickname === hostPlayer && gamePhase === 'WAITING' }">
              <div v-if="player.nickname === hostPlayer && gamePhase === 'WAITING'" class="role-badge host-badge">👑 房主</div>
              <div v-if="player.nickname === bigSmartPlayer && gamePhase !== 'WAITING'" class="role-badge">👑 大聪明</div>
              <div class="player-name">👤 {{ player.nickname }} <span v-if="player.nickname === nickname">(我)</span></div>
              <div class="player-score">⭐ {{ scores[player.nickname] || 0 }} 分</div>
              <span v-if="player.isReady && gamePhase === 'WAITING'" class="ready-icon">✅</span>
            </div>
            <div class="speech-bubble" v-if="speeches[player.nickname]">📝 {{ speeches[player.nickname] }}</div>
            
            <div v-if="gamePhase === 'WAITING' && hostPlayer === nickname && player.nickname !== nickname" class="host-actions">
              <button @click="kickPlayer(player.nickname)" class="btn-kick">踢出</button>
              <button @click="transferHost(player.nickname)" class="btn-transfer">转让</button>
            </div>
            
            <div v-if="gamePhase === 'JUDGING' && myRole === '大聪明' && player.nickname !== nickname" class="judge-actions">
              <button v-if="!localSkillUsed" class="btn-skill-mini" @click="useSkill(player.nickname)">💥 扯淡</button>
              <button v-else class="btn-skill-disabled" disabled>已使用</button>
              <button class="btn-guess-mini" @click="finalGuess(player.nickname)">✅ 认作老实人</button>
            </div>
          </div>
        </div>
        
        <button v-if="gamePhase === 'WAITING'" @click="toggleReady" class="btn-ready">准 备 / 取 消</button>
        <div v-if="gamePhase === 'SPEAKING' && activePlayer === nickname && myRole !== '大聪明'" class="action-panel">
          <div class="input-group">
            <textarea v-model="mySpeech" placeholder="输入你的解释..."></textarea>
            <button class="btn-submit" @click="submitSpeech">提 交 发 言</button>
          </div>
        </div>
      </div>

      <div v-if="showGameOverOverlay" class="game-over-overlay">
        <div class="game-over-box">
          <h2 class="result-title">{{ gameOverResult }}</h2>
          <div class="result-content">
            <div class="result-col">
              <h3>揭晓真实身份</h3>
              <ul class="clean-list">
                <li v-for="(role, name) in gameOverRoles" :key="name"><span class="res-name">{{ name }}</span> <span :class="role === '老实人' ? 'txt-honest' : (role === '大聪明' ? 'txt-smart' : 'txt-bluffer')">[{{ role }}]</span></li>
              </ul>
            </div>
            <div class="result-col">
              <h3>🏆 积分榜</h3>
              <ul class="clean-list">
                <li v-for="(score, name) in scores" :key="name"><span class="res-name">{{ name }}</span> : <span class="res-score">{{ score }} 分</span></li>
              </ul>
            </div>
          </div>
          <div class="game-over-actions">
            <button class="btn-play-again" @click="playAgain">🔄 再来一局</button>
            <button class="btn-leave-room" @click="leaveRoomDirect">🚪 离开房间</button>
          </div>
        </div>
      </div>

      <!-- ⭐ 好友面板，去掉那句累赘字 -->
      <div class="friends-drawer" v-if="showFriendsDrawer">
         <div class="drawer-header">
            <span>好友列表</span>
            <span class="drawer-close" @click="showFriendsDrawer = false">✖ 关</span>
         </div>
         <div class="drawer-body">
            <div v-for="f in globalFriends" :key="f.id" class="friend-item-room" @dblclick="openChat(f.nickname)">
               <span :class="{'online': onlineStatus[f.nickname]}">
                 {{ onlineStatus[f.nickname] ? '🟢' : '⚪' }} {{ f.nickname }}
               </span>
               <div style="display:flex; gap:5px; align-items:center;">
                 <span v-if="unreadCount[f.nickname]" class="unread-dot">{{ unreadCount[f.nickname] }}</span>
                 <button v-if="onlineStatus[f.nickname] && gamePhase === 'WAITING'" class="btn-invite-room" @click.stop="inviteFriend(f.nickname)">邀请</button>
               </div>
            </div>
         </div>
      </div>

      <div v-if="chatTarget" class="chat-box">
        <div class="chat-header">与 {{ chatTarget }} 私聊中 <span class="close-chat" @click="chatTarget = ''">✖</span></div>
        <div class="chat-history">
          <div v-for="(msg, idx) in chatHistory[chatTarget] || []" :key="idx" :class="['msg-line', msg.from === nickname ? 'msg-me' : 'msg-other']">{{ msg.content }}</div>
        </div>
        <div class="chat-input"><input v-model="chatInput" @keyup.enter="sendChat" placeholder="回车发送..." /></div>
      </div>

      <!-- ⭐ 中央弹窗系统 (Alert, Confirm) -->
      <div v-if="ui.visible" class="custom-modal-overlay">
        <div class="custom-modal">
          <h3 v-if="ui.title">{{ ui.title }}</h3>
          <p class="modal-msg" v-html="ui.msg"></p>
          <div class="modal-actions-center">
            <button v-if="ui.type === 'confirm'" @click="ui.onCancel" class="btn-cancel">取消</button>
            <button @click="ui.onConfirm()" class="btn-confirm-green">确 定</button>
          </div>
        </div>
      </div>

    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, reactive, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'

const route = useRoute()
const router = useRouter()

const roomId = ref('')
const nickname = ref(localStorage.getItem('nickname') || '神秘玩家')
const players = ref([])
const hostPlayer = ref('') 
const inviteLink = ref(window.location.href) 
let ws = null 

const gamePhase = ref('WAITING') 
const activePlayer = ref('')
const gameLogs = ref([]) 
const speeches = ref({}) 
const scores = ref({}) 
const questionTitle = ref('')
const bigSmartPlayer = ref('') 
const myRole = ref('')         
const trueAnswer = ref('')     
const mySpeech = ref('')

const showGameOverOverlay = ref(false)
const gameOverResult = ref('')
const gameOverRoles = ref({})
const localSkillUsed = ref(false) 

const timeLimit = ref(60)
const maxPlayers = ref(6)
const countdown = ref(0)
let timerId = null

let globalWs = null
const showFriendsDrawer = ref(false)
const globalFriends = ref([])
const onlineStatus = reactive({})

const chatTarget = ref('')
const chatInput = ref('')
const chatHistory = reactive({})
const unreadCount = reactive({})

const ui = reactive({ visible: false, type: 'alert', title: '', msg: '', onConfirm: null, onCancel: null })
const customAlert = (msg, title = '提示') => { ui.type = 'alert'; ui.title = title; ui.msg = msg; ui.visible = true; ui.onConfirm = () => { ui.visible = false } }
const customConfirm = (msg, cbConfirm, title = '系统确认') => { ui.type = 'confirm'; ui.title = title; ui.msg = msg; ui.visible = true; ui.onConfirm = () => { ui.visible = false; cbConfirm() }; ui.onCancel = () => { ui.visible = false } }

const initGlobalWebSocket = () => {
  globalWs = new WebSocket(`ws://localhost:8080/ws/global/${nickname.value}`)
  globalWs.onmessage = (event) => {
    const data = JSON.parse(event.data)
    if (data.type === 'online_status') onlineStatus[data.user] = data.isOnline
    else if (data.type === 'request_join') {
      if (gamePhase.value !== 'WAITING') return customAlert(`好友 [${data.from}] 想加入，但游戏已开始。`)
      customConfirm(`好友 [${data.from}] 正在大厅求拉，是否直接拉ta进房？`, () => globalWs.send(JSON.stringify({ type: 'invite', target: data.from, roomId: roomId.value })))
    } 
    else if (data.type === 'chat') {
       if (!chatHistory[data.from]) chatHistory[data.from] = []
       chatHistory[data.from].push({ from: data.from, content: data.msg })
       if (chatTarget.value !== data.from) unreadCount[data.from] = (unreadCount[data.from] || 0) + 1
    } 
    else if (data.type === 'invite') {
       customConfirm(`好友 ${data.from} 邀请你加入房间 [${data.roomId}]，是否前往？`, () => {
         router.push({ path: `/room/${data.roomId}`, query: { invite: '1' } })
         setTimeout(() => window.location.reload(), 200) 
       })
    } 
    else if (data.type === 'social_update') fetchGlobalFriends()
  }
}

const fetchGlobalFriends = async () => {
  try {
    const res = await axios.get('http://localhost:8080/api/friend/list', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } })
    if (res.data.code === 200) globalFriends.value = res.data.friends
  } catch(e){}
}

const inviteFriend = (targetName) => { globalWs.send(JSON.stringify({ type: 'invite', target: targetName, roomId: roomId.value })); customAlert(`已向 ${targetName} 发送入房邀请！`) }
const openChat = (targetName) => { chatTarget.value = targetName; unreadCount[targetName] = 0 }
const sendChat = () => {
  if (!chatInput.value.trim() || !globalWs) return
  globalWs.send(JSON.stringify({ type: 'chat', target: chatTarget.value, msg: chatInput.value }))
  if (!chatHistory[chatTarget.value]) chatHistory[chatTarget.value] = []
  chatHistory[chatTarget.value].push({ from: nickname.value, content: chatInput.value })
  chatInput.value = ''
}

const phaseText = computed(() => { return gamePhase.value === 'SPEAKING' ? '发言阶段' : (gamePhase.value === 'JUDGING' ? '审判阶段' : '') })

const startTimer = (limit) => {
  if (timerId) clearInterval(timerId)
  countdown.value = limit
  timerId = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(timerId)
      if (gamePhase.value === 'SPEAKING' && activePlayer.value === nickname.value && myRole.value !== '大聪明') {
        if (!mySpeech.value.trim()) mySpeech.value = '（超时未发言，已自动提交）'
        submitSpeech()
      }
    }
  }, 1000)
}
const stopTimer = () => { if (timerId) clearInterval(timerId) }

onMounted(async () => {
  roomId.value = route.params.id

  // ⭐ ⭐ 终极准入守卫 (Fail-Closed) ⭐ ⭐
  // 放行条件一：你是被好友邀请的 VIP (?invite=1)
  const isInvited = route.query.invite === '1'
  // 放行条件二：你在大厅正确走了流程、或者输对了密码，拿到了通行证
  const hasAccess = sessionStorage.getItem(`access_${roomId.value}`) === '1'
  
  if (!isInvited && !hasAccess) {
      customAlert('非法越权访问！请从大厅正常进入。', '禁止强闯')
      return router.push('/lobby')
  }

  // 受邀进来的玩家，给他补发一张本地通行证，保证他在房里按 F5 刷新时不会被踢出去
  if (isInvited) sessionStorage.setItem(`access_${roomId.value}`, '1')

  initGlobalWebSocket()
  fetchGlobalFriends()
  ws = new WebSocket(`ws://localhost:8080/ws/room/${roomId.value}/${nickname.value}`)

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data)
    
    if (data.type === 'reconnect_sync') {
      gamePhase.value = data.phase; questionTitle.value = data.question; bigSmartPlayer.value = data.bigSmart; myRole.value = data.role
      trueAnswer.value = data.answer; activePlayer.value = data.activePlayer; speeches.value = data.speeches; scores.value = data.scores
      if (data.timeLimit) timeLimit.value = data.timeLimit
      showGameOverOverlay.value = false; gameLogs.value.push('🔄 断线重连成功，已恢复现场！')
      if (gamePhase.value === 'SPEAKING') startTimer(timeLimit.value)
    }
    else if (data.type === 'update_players') {
      players.value = data.players; if (data.host) hostPlayer.value = data.host 
      if (data.timeLimit) timeLimit.value = data.timeLimit; if (data.maxPlayers) maxPlayers.value = data.maxPlayers
    }
    else if (data.type === 'kicked' && data.target === nickname.value) {
      customAlert('你已被房主移出房间！', '系统提示')
      setTimeout(() => router.push('/lobby'), 1500)
    }
    else if (data.type === 'update_scores') scores.value = data.scores
    else if (data.type === 'game_start') {
      gamePhase.value = data.phase; questionTitle.value = data.question; bigSmartPlayer.value = data.bigSmart; myRole.value = data.role
      trueAnswer.value = data.answer; if (data.timeLimit) timeLimit.value = data.timeLimit
      speeches.value = {}; gameLogs.value = []; showGameOverOverlay.value = false; localSkillUsed.value = false
      if (gamePhase.value === 'SPEAKING') startTimer(timeLimit.value)
    }
    else if (data.type === 'turn_change') {
      activePlayer.value = data.activePlayer; gamePhase.value = data.phase; if (data.timeLimit) timeLimit.value = data.timeLimit
      if (gamePhase.value === 'SPEAKING') startTimer(timeLimit.value); else stopTimer()
    }
    else if (data.type === 'update_speeches') speeches.value = data.speeches
    else if (data.type === 'game_log') {
      gameLogs.value.push(data.log); if (gameLogs.value.length > 6) gameLogs.value.shift()
    }
    else if (data.type === 'game_over') {
      gamePhase.value = 'WAITING'; speeches.value = {}; stopTimer()
      gameOverResult.value = data.result; gameOverRoles.value = data.roles; scores.value = data.scores; showGameOverOverlay.value = true
    }
    else if (data.type === 'room_reset') {
      gamePhase.value = 'WAITING'; speeches.value = {}; gameLogs.value = []; stopTimer()
    }
  }
})

onUnmounted(() => { stopTimer(); if (ws) ws.close(); if (globalWs) globalWs.close() })

const toggleReady = () => { ws.send(JSON.stringify({ type: 'ready' })) }
const submitSpeech = () => {
  if (!mySpeech.value.trim()) return
  ws.send(JSON.stringify({ type: 'submit_speech', speech: mySpeech.value }))
  mySpeech.value = ''
}
const useSkill = (targetName) => { localSkillUsed.value = true; ws.send(JSON.stringify({ type: 'use_skill', target: targetName })) }

const finalGuess = (targetName) => { customConfirm(`确定指认 ${targetName} 吗？`, () => ws.send(JSON.stringify({ type: 'final_guess', target: targetName }))) }
const kickPlayer = (target) => { customConfirm(`确定踢出 ${target} 吗？`, () => ws.send(JSON.stringify({ type: 'kick', target }))) }
const transferHost = (target) => { customConfirm(`确定转让房主给 ${target} 吗？`, () => ws.send(JSON.stringify({ type: 'transfer_host', target }))) }

const copyLink = () => { navigator.clipboard.writeText(inviteLink.value); customAlert('房间链接已复制，去发给好友吧！') }
const playAgain = () => { showGameOverOverlay.value = false; ws.send(JSON.stringify({ type: 'play_again' })) }
const leaveRoom = () => { customConfirm('确定离开当前房间吗？', () => router.push('/lobby')) }
const leaveRoomDirect = () => { router.push('/lobby') } 
</script>

<style scoped>
/* 原有布局样式完全保留 */
.room-container { height: 100vh; display: flex; flex-direction: column; background-color: #1a252f; position: relative;}
.room-header { display: flex; justify-content: space-between; padding: 15px 20px; background-color: #2c3e50; border-bottom: 2px solid #000; align-items: center;}
.room-id { font-size: 20px; font-weight: bold; color: #f1c40f; }
.invite-btn { margin-left: 15px; color: #3498db; cursor: pointer; font-size: 14px; text-decoration: underline;}
.header-actions { display: flex; gap: 15px; align-items: center;}
.btn-friends { background: #9b59b6; color: white; border: none; padding: 6px 15px; border-radius: 4px; cursor: pointer; font-weight: bold;}
.btn-leave { background: #c0392b; color: white; border: none; padding: 6px 15px; border-radius: 4px; cursor: pointer; font-weight: bold;}
.playing-status { color: #e74c3c; font-weight: bold; }

.game-board { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; overflow: hidden; }

.friends-drawer { position: absolute; right: 0; top: 0; height: 100%; width: 260px; background: #2c3e50; border-left: 2px solid #34495e; z-index: 100; display: flex; flex-direction: column; padding: 15px; box-sizing: border-box; box-shadow: -5px 0 20px rgba(0,0,0,0.5); }
.drawer-header { display: flex; justify-content: space-between; align-items: center; color: white; border-bottom: 1px solid #7f8c8d; padding-bottom: 15px; margin-bottom: 15px; font-weight: bold;}
.drawer-close { cursor: pointer; color: #e74c3c; font-size: 12px; }
.friend-item-room { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px dashed #7f8c8d; color: white; font-size: 14px; cursor: pointer; transition: 0.2s;}
.friend-item-room:hover { background: rgba(255,255,255,0.1); }
.online { color: #2ecc71; font-weight: bold; }
.btn-invite-room { background: #3498db; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;}

.my-identity-panel { position: absolute; top: 20px; right: 280px; background: rgba(44, 62, 80, 0.9); padding: 15px; border-radius: 8px; border: 2px solid #3498db; width: 220px; z-index: 50; }
.my-role-info { color: white; font-size: 18px; font-weight: bold; margin-bottom: 8px; }
.role-text { padding: 0 5px; }
.true-answer-box-mini { color: #2ecc71; font-size: 13px; border-top: 1px dashed #7f8c8d; padding-top: 8px; }
.bluff-tips-mini { color: #e74c3c; font-size: 13px; border-top: 1px dashed #7f8c8d; padding-top: 8px; }
.smart-tips-mini { color: #9b59b6; font-size: 13px; border-top: 1px dashed #7f8c8d; padding-top: 8px; }
.txt-honest { color: #2ecc71; } .txt-smart { color: #9b59b6; } .txt-bluffer { color: #e74c3c; }

.table { width: 60%; height: 35%; background: #27ae60; border-radius: 100px; border: 10px solid #16a085; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.table-text { color: rgba(255,255,255,0.8); font-size: 32px; letter-spacing: 5px; }
.waiting-text { color: rgba(255,255,255,0.7); font-size: 18px; margin: 5px 0; }
.question-text { color: #fff; font-size: 22px; padding: 20px; text-align: center; background: rgba(0,0,0,0.4); border-radius: 10px; margin-bottom: 15px;}
.turn-indicator { color: white; font-size: 24px; text-align: center; }
.my-turn { color: #f1c40f; text-shadow: 0 0 10px #f1c40f; }
.timer { font-size: 20px; color: #e74c3c; font-weight: bold; margin-top: 15px; animation: pulse 1s infinite; }
@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.6; } 100% { opacity: 1; } }

.log-board { position: absolute; top: 20px; left: 20px; background: rgba(0,0,0,0.6); padding: 15px; border-radius: 8px; width: 300px; color: #bdc3c7; font-size: 14px; }
.log-item { margin: 5px 0; border-bottom: 1px dashed #7f8c8d; padding-bottom: 5px; }

.player-zone { position: absolute; bottom: 10px; display: flex; flex-direction: column; align-items: center; gap: 15px; width: 100%; }
.players-container { display: flex; gap: 30px; justify-content: center; align-items: flex-start; }
.player-wrapper { display: flex; flex-direction: column; align-items: center; gap: 10px; width: 150px; }

.player-avatar { position: relative; background: #34495e; padding: 10px; border-radius: 12px; font-size: 15px; border: 2px solid #34495e; color: white; text-align: center; width: 100%; box-sizing: border-box; }
.player-score { color: #f1c40f; font-size: 12px; margin-top: 5px; }
.active-player { border-color: #f1c40f !important; box-shadow: 0 0 15px #f1c40f; }
.is-big-smart { border-color: #9b59b6 !important; }
.is-host { border-color: #e67e22 !important; }
.role-badge { position: absolute; top: -15px; left: 50%; transform: translateX(-50%); background: #9b59b6; padding: 2px 8px; border-radius: 10px; font-size: 12px; font-weight: bold; white-space: nowrap; }
.host-badge { background: #e67e22; }
.ready-icon { position: absolute; top: -10px; right: -10px; font-size: 20px; }

.host-actions { display: flex; gap: 5px; margin-top: 5px; width: 100%;}
.btn-kick { flex: 1; background: #c0392b; color: white; border: none; border-radius: 4px; font-size: 12px; padding: 4px; cursor: pointer;}
.btn-transfer { flex: 1; background: #f39c12; color: white; border: none; border-radius: 4px; font-size: 12px; padding: 4px; cursor: pointer;}
.speech-bubble { background: white; color: black; padding: 8px; border-radius: 8px; font-size: 13px; width: 100%; box-sizing: border-box; text-align: left; word-break: break-all; position: relative; }
.speech-bubble::before { content: ""; position: absolute; top: -10px; left: 50%; transform: translateX(-50%); border-width: 5px; border-style: solid; border-color: transparent transparent white transparent; }

.judge-actions { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.btn-skill-mini { background: #c0392b; color: white; border: none; padding: 5px; border-radius: 4px; cursor: pointer; font-size: 12px; transition: 0.2s; }
.btn-skill-mini:hover { background: #e74c3c; }
.btn-skill-disabled { background: #7f8c8d; color: #bdc3c7; border: none; padding: 5px; border-radius: 4px; font-size: 12px; cursor: not-allowed; }
.btn-guess-mini { background: #27ae60; color: white; border: none; padding: 5px; border-radius: 4px; cursor: pointer; font-size: 12px; transition: 0.2s; }
.btn-guess-mini:hover { background: #2ecc71; }
.btn-ready { background: #e67e22; color: white; font-size: 20px; padding: 10px 40px; border: none; border-radius: 30px; cursor: pointer; }

.action-panel { background: #2c3e50; padding: 15px; border-radius: 12px; display: flex; flex-direction: column; align-items: center; gap: 10px; width: 400px; border: 2px solid #3498db; }
.input-group { display: flex; flex-direction: column; gap: 10px; width: 100%; }
textarea { width: 100%; height: 60px; padding: 8px; border-radius: 6px; box-sizing: border-box; resize: none; font-family: inherit; }
.btn-submit { background: #3498db; color: white; border: none; padding: 10px; border-radius: 6px; font-weight: bold; cursor: pointer; }

.game-over-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.85); display: flex; align-items: center; justify-content: center; z-index: 100; }
.game-over-box { background: #2c3e50; padding: 30px; border-radius: 12px; border: 2px solid #f1c40f; width: 500px; color: white; text-align: center; }
.result-title { color: #f1c40f; margin-bottom: 25px; font-size: 24px; }
.result-content { display: flex; justify-content: space-around; text-align: left; margin-bottom: 30px; }
.clean-list { list-style: none; padding: 0; margin: 0; }
.clean-list li { margin-bottom: 10px; font-size: 16px; }
.res-name { font-weight: bold; display: inline-block; width: 80px; }
.res-score { color: #f1c40f; font-weight: bold; }
.game-over-actions { display: flex; gap: 20px; justify-content: center; }
.btn-play-again { background: #27ae60; color: white; border: none; padding: 12px 25px; font-size: 16px; font-weight: bold; border-radius: 8px; cursor: pointer; }
.btn-leave-room { background: #c0392b; color: white; border: none; padding: 12px 25px; font-size: 16px; font-weight: bold; border-radius: 8px; cursor: pointer; }

.chat-box { position: fixed; bottom: 20px; right: 280px; width: 300px; height: 350px; background: #ecf0f1; border-radius: 8px 8px 0 0; display: flex; flex-direction: column; box-shadow: 0 -5px 20px rgba(0,0,0,0.5); z-index: 200;}
.chat-header { background: #3498db; color: white; padding: 10px; border-radius: 8px 8px 0 0; display: flex; justify-content: space-between; font-weight: bold; }
.close-chat { cursor: pointer; }
.chat-history { flex: 1; padding: 10px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; }
.msg-line { max-width: 80%; padding: 8px 12px; border-radius: 15px; font-size: 14px; word-break: break-all; }
.msg-me { background: #3498db; color: white; align-self: flex-end; border-bottom-right-radius: 2px; }
.msg-other { background: #bdc3c7; color: #2c3e50; align-self: flex-start; border-bottom-left-radius: 2px; }
.chat-input { padding: 10px; border-top: 1px solid #bdc3c7; }
.chat-input input { width: 100%; padding: 8px; border: 1px solid #95a5a6; border-radius: 15px; outline: none; box-sizing: border-box; }
.unread-dot { background: #e74c3c; padding: 2px 6px; border-radius: 10px; font-size: 12px; color: white; margin-left: 5px; }

/* 中央通用弹窗 */
.custom-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 9999; }
.custom-modal { background: #2c3e50; padding: 30px; border-radius: 12px; width: 340px; text-align: center; border: 2px solid #3498db; color: white; box-shadow: 0 10px 30px rgba(0,0,0,0.5);}
.modal-msg { margin: 20px 0; font-size: 16px; line-height: 1.5; color: #ecf0f1;}
.modal-actions-center { display: flex; gap: 15px; justify-content: center; }
.btn-cancel { background: #95a5a6; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold;}
.btn-confirm-green { background: #27ae60; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold;}
</style>