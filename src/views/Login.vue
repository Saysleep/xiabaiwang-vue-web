<template>
  <div class="login-container">
    <h2>瞎掰王 - 登 录</h2>
    
    <div class="form-box">
      <div class="tab-nav">
        <span :class="{ active: currentTab === 'code' }" @click="switchTab('code')">邮箱登录 / 注册</span>
        <span :class="{ active: currentTab === 'pwd' }" @click="switchTab('pwd')">密码登录</span>
      </div>

      <!-- 面板 1：邮箱验证码登录/自动注册 -->
      <div v-show="currentTab === 'code'" class="panel-content">
        <div class="input-group">
          <label>邮箱：</label>
          <input v-model="codeForm.email" type="email" placeholder="输入邮箱" />
        </div>
        
        <div class="input-group">
          <label>验证码：</label>
          <div class="code-box">
            <input v-model="codeForm.code" type="text" placeholder="6位数字" maxlength="6" />
            <button type="button" class="btn-code" :disabled="countdown > 0" @click.prevent="handleSendCode(codeForm.email, 'LOGIN')">
              {{ countdown > 0 ? `${countdown}s 后重发` : '获取验证码' }}
            </button>
          </div>
        </div>

        <button type="button" class="btn" @click.prevent="submitCodeLogin">验 证 并 进 入</button>
      </div>

      <!-- 面板 2：密码登录 (必须已有账号) -->
      <div v-show="currentTab === 'pwd'" class="panel-content">
        <div class="input-group">
          <label>账号 / 邮箱：</label>
          <input v-model="pwdForm.account" type="text" placeholder="输入8位账号或绑定邮箱" />
        </div>
        
        <div class="input-group">
          <label>密码：</label>
          <input v-model="pwdForm.password" type="password" placeholder="输入密码" />
        </div>

        <button type="button" class="btn" @click.prevent="submitPwdLogin">进 入 大 厅</button>
        
        <div class="bottom-links">
          <span @click="showRegisterModal = true">没有账号？注册角色</span>
          <span @click="showResetModal = true">忘记密码？</span>
        </div>
      </div>
    </div>

    <!-- 弹窗 1：标准注册 (需要邮箱和昵称，走验证码逻辑) -->
    <div v-if="showRegisterModal" class="custom-modal-overlay">
      <div class="custom-modal wide-modal">
        <h3>注 册 角 色</h3>
        <div class="modal-body">
          <input v-model="regForm.email" type="email" class="modal-input" placeholder="输入邮箱" />
          <div class="code-box modal-code-box">
            <input v-model="regForm.code" type="text" class="modal-input" placeholder="验证码" />
            <button type="button" class="btn-code" :disabled="countdown > 0" @click.prevent="handleSendCode(regForm.email, 'REGISTER')">
              {{ countdown > 0 ? `${countdown}s` : '获取' }}
            </button>
          </div>
          <input v-model="regForm.nickname" type="text" class="modal-input" placeholder="起个响亮的名字" />
          <input v-model="regForm.password" type="password" class="modal-input" placeholder="设置密码" />
        </div>
        <div class="modal-actions-center">
          <button type="button" class="btn-cancel" @click="showRegisterModal = false">取 消</button>
          <button type="button" class="btn-confirm-green" @click.prevent="submitRegister">创 建</button>
        </div>
      </div>
    </div>

    <!-- 弹窗 2：找回密码 -->
    <div v-if="showResetModal" class="custom-modal-overlay">
      <div class="custom-modal wide-modal">
        <h3>找 回 密 码</h3>
        <div class="modal-body">
          <input v-model="resetForm.email" type="email" class="modal-input" placeholder="输入绑定邮箱" />
          <div class="code-box modal-code-box">
            <input v-model="resetForm.code" type="text" class="modal-input" placeholder="验证码" />
            <button type="button" class="btn-code" :disabled="countdown > 0" @click.prevent="handleSendCode(resetForm.email, 'RESET')">
              {{ countdown > 0 ? `${countdown}s` : '获取' }}
            </button>
          </div>
          <input v-model="resetForm.newPassword" type="password" class="modal-input" placeholder="输入新密码" />
        </div>
        <div class="modal-actions-center">
          <button type="button" class="btn-cancel" @click="showResetModal = false">取 消</button>
          <button type="button" class="btn-confirm-green" @click.prevent="submitResetPassword">重 置</button>
        </div>
      </div>
    </div>

    <!-- 弹窗 3：中央提示系统 -->
    <div v-if="ui.alertVisible" class="custom-modal-overlay alert-overlay">
      <div class="custom-modal">
        <h3 v-if="ui.title">{{ ui.title }}</h3>
        <p class="modal-msg" v-html="ui.alertMsg"></p>
        <button type="button" class="btn-confirm" @click.prevent="handleAlertConfirm">确 定</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import request from '@/utils/request' 
import { useRouter } from 'vue-router'

const router = useRouter()
const currentTab = ref('code') 
const countdown = ref(0)
let timer = null

const showResetModal = ref(false)
const showRegisterModal = ref(false)

// 表单状态完全独立，互不干扰
const codeForm = reactive({ email: '', code: '' })
const pwdForm = reactive({ account: '', password: '' })
const regForm = reactive({ email: '', code: '', nickname: '', password: '' })
const resetForm = reactive({ email: '', code: '', newPassword: '' })

// 修复后的 alert 机制
const ui = reactive({ alertVisible: false, title: '提示', alertMsg: '', onConfirm: null })

const customAlert = (msg, onConfirm = null, title = '提示') => {
  ui.title = title
  ui.alertMsg = msg
  ui.onConfirm = onConfirm
  ui.alertVisible = true
}

const handleAlertConfirm = () => {
  ui.alertVisible = false
  if (ui.onConfirm) ui.onConfirm() 
}

const switchTab = (tab) => {
  currentTab.value = tab
  if (timer) { clearInterval(timer); countdown.value = 0 }
}

const startCountdown = () => {
  countdown.value = 60
  timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) clearInterval(timer)
  }, 1000)
}

// 统一发送验证码逻辑（支持 LOGIN, REGISTER, RESET）
const handleSendCode = async (targetEmail, sendType) => {
  if (!targetEmail || !targetEmail.includes('@')) return customAlert('请输入正确的邮箱格式！')
  try {
    await request.post('/user/send-code', { email: targetEmail, type: sendType })
    customAlert('验证码已发送至邮箱，有效期 5 分钟。')
    startCountdown()
  } catch (error) {}
}

const submitCodeLogin = async () => {
  if (!codeForm.email || !codeForm.code) return customAlert('请输入邮箱和验证码！')
  try {
    const res = await request.post('/user/login-by-email', codeForm)
    if (res.data.isNewUser) {
      customAlert(`🎉 欢迎新玩家！<br>系统已为您自动生成专属账号：<br><span style="color:#f1c40f;font-size:24px;font-weight:bold;">${res.data.username}</span><br>初始密码与账号相同，请务必保存！`, () => saveAuthAndRedirect(res.data))
    } else {
      saveAuthAndRedirect(res.data)
    }
  } catch (error) {}
}

const submitPwdLogin = async () => {
  if (!pwdForm.account || !pwdForm.password) return customAlert('请输入账号/邮箱和密码！')
  try {
    // 后端需支持 account 字段同时匹配 username 或 email
    const res = await request.post('/user/login', { account: pwdForm.account, password: pwdForm.password })
    saveAuthAndRedirect(res.data)
  } catch (error) {}
}

const submitRegister = async () => {
  if (!regForm.email || !regForm.code || !regForm.nickname || !regForm.password) return customAlert('请填写完整注册信息！')
  try {
    const res = await request.post('/user/register', regForm)
    customAlert(`🎉 角色创建成功！<br>您的唯一登录账号为：<br><span style="color:#f1c40f;font-size:24px;font-weight:bold;">${res.data}</span>`, null, '注册成功')
    showRegisterModal.value = false
    pwdForm.account = res.data // 自动填入账号
    switchTab('pwd')
  } catch (error) {}
}

const submitResetPassword = async () => {
  if (!resetForm.email || !resetForm.code || !resetForm.newPassword) return customAlert('请填写完整重置信息！')
  try {
    await request.post('/user/reset-password', resetForm)
    customAlert('密码重置成功，请使用新密码登录！')
    showResetModal.value = false
  } catch (error) {}
}

const saveAuthAndRedirect = (data) => {
  localStorage.setItem('xiabaiwang_token', data.token || data)
  if (data.nickname) localStorage.setItem('nickname', data.nickname)
  if (data.score !== undefined) localStorage.setItem('score', data.score)
  router.push('/lobby')
}
</script>

<style scoped>
.login-container { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #1a252f; color: white;}
.form-box { background: #2c3e50; padding: 40px 30px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); display: flex; flex-direction: column; width: 320px; border-top: 5px solid #3498db;}
.tab-nav { display: flex; justify-content: space-around; border-bottom: 2px solid #34495e; padding-bottom: 15px; margin-bottom: 20px;}
.tab-nav span { font-weight: bold; color: #bdc3c7; cursor: pointer; transition: 0.3s; padding: 0 10px;}
.tab-nav span.active { color: #f1c40f; border-bottom: 2px solid #f1c40f; padding-bottom: 13px;}
.panel-content { display: flex; flex-direction: column; gap: 20px; }
.input-group { display: flex; flex-direction: column; }
.input-group label { margin-bottom: 8px; font-weight: bold; color: #bdc3c7;}
input { padding: 12px; border-radius: 6px; border: 1px solid #7f8c8d; font-size: 15px; background: #ecf0f1; color: #2c3e50; outline: none; box-sizing: border-box;}
input:focus { border-color: #3498db; box-shadow: 0 0 5px #3498db; }
.code-box { display: flex; gap: 10px; width: 100%; }
.code-box input { flex: 1; width: 0; } 
.btn-code { background: #e67e22; color: white; border: none; border-radius: 6px; padding: 0 15px; font-weight: bold; cursor: pointer; white-space: nowrap;}
.btn-code:disabled { background: #95a5a6; cursor: not-allowed; }
.btn { padding: 15px; background: #3498db; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: bold; margin-top: 10px; transition: 0.2s; width: 100%;}
.btn:hover { background: #2980b9; transform: translateY(-2px);}
.bottom-links { display: flex; justify-content: space-between; font-size: 13px; color: #f1c40f; margin-top: 5px; }
.bottom-links span { cursor: pointer; }
.bottom-links span:hover { text-decoration: underline; }
.custom-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 100; }
.alert-overlay { z-index: 9999; }
.custom-modal { background: #2c3e50; padding: 30px; border-radius: 12px; width: 320px; text-align: center; border: 2px solid #3498db; color: white; box-shadow: 0 10px 30px rgba(0,0,0,0.5); box-sizing: border-box;}
.wide-modal { width: 360px; }
.modal-body { display: flex; flex-direction: column; gap: 15px; margin: 20px 0; }
.modal-input { width: 100%; }
.modal-code-box { margin: 0; }
.modal-msg { margin: 20px 0; font-size: 15px; color: #ecf0f1; line-height: 1.5;}
.modal-actions-center { display: flex; gap: 15px; justify-content: center; }
.btn-cancel { background: #95a5a6; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold;}
.btn-confirm-green { background: #27ae60; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold;}
.btn-confirm { background: #27ae60; color: white; border: none; padding: 10px 30px; border-radius: 6px; font-size: 15px; cursor: pointer; font-weight: bold;}
.btn-confirm:hover, .btn-confirm-green:hover { background: #2ecc71; }
</style>