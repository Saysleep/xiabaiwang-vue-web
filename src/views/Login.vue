<template>
  <div class="login-container">
    <h2>瞎掰王 - {{ isRegister ? '注 册' : '登 录' }}</h2>
    
    <div class="form-box">
      <!-- 注册时隐藏账号输入，由系统分配 -->
      <div v-if="!isRegister" class="input-group">
        <label>账号：</label>
        <input v-model="form.username" type="text" placeholder="输入 8 位数字账号" />
      </div>
      
      <div v-if="isRegister" class="input-group">
        <label>游戏昵称：</label>
        <input v-model="form.nickname" type="text" placeholder="起个响亮的名字" />
      </div>

      <div class="input-group">
        <label>密码：</label>
        <input v-model="form.password" type="password" placeholder="输入密码" />
      </div>

      <button @click="handleSubmit" class="btn">{{ isRegister ? '创 建 角 色' : '进 入 大 厅' }}</button>
      
      <p class="toggle-text" @click="toggleMode">
        {{ isRegister ? '已有账号？去登录' : '没有账号？申请角色' }}
      </p>
    </div>

    <!-- ⭐ 中央提示弹窗 -->
    <div v-if="ui.alertVisible" class="custom-modal-overlay">
      <div class="custom-modal">
        <h3>{{ ui.alertTitle }}</h3>
        <p class="modal-msg" v-html="ui.alertMsg"></p>
        <button class="btn-confirm" @click="ui.alertVisible = false">确 定</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'

const router = useRouter()
const isRegister = ref(false)

const form = reactive({ username: '', password: '', nickname: '' })
const ui = reactive({ alertVisible: false, alertTitle: '提示', alertMsg: '' })

const customAlert = (title, msg) => {
  ui.alertTitle = title; ui.alertMsg = msg; ui.alertVisible = true;
}

const toggleMode = () => {
  isRegister.value = !isRegister.value
  form.username = ''; form.password = ''; form.nickname = ''
}

const handleSubmit = async () => {
  if ((!isRegister.value && !form.username) || !form.password || (isRegister.value && !form.nickname)) {
    return customAlert('提示', '请填写完整信息！')
  }

  try {
    const url = isRegister.value ? 'http://localhost:8080/api/user/register' : 'http://localhost:8080/api/user/login'
    const res = await axios.post(url, form)
    
    if (res.data.code === 200) {
      if (isRegister.value) {
        // 注册成功，展示分配的账号
        customAlert('🎉 角色创建成功！', `您的唯一登录账号为：<br><span style="color:#f1c40f;font-size:24px;font-weight:bold;letter-spacing:2px;">${res.data.data}</span><br><br>请务必牢记，这代表了您的尊贵身份！`)
        isRegister.value = false
        form.username = res.data.data
        form.password = ''
      } else {
        localStorage.setItem('token', res.data.data.token)
        localStorage.setItem('nickname', res.data.data.nickname)
        localStorage.setItem('score', res.data.data.score || 0)
        router.push('/lobby')
      }
    } else {
      customAlert('错误', res.data.msg)
    }
  } catch (error) { customAlert('错误', '网络或服务器异常！') }
}
</script>

<style scoped>
.login-container { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #1a252f; color: white;}
.form-box { background: #2c3e50; padding: 40px 30px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); display: flex; flex-direction: column; gap: 20px; width: 320px; border-top: 5px solid #3498db;}
.input-group { display: flex; flex-direction: column; }
.input-group label { margin-bottom: 8px; font-weight: bold; color: #bdc3c7;}
input { padding: 12px; border-radius: 6px; border: 1px solid #7f8c8d; font-size: 15px; background: #ecf0f1; color: #2c3e50; outline: none;}
input:focus { border-color: #3498db; box-shadow: 0 0 5px #3498db; }
.btn { padding: 15px; background: #3498db; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: bold; margin-top: 10px; transition: 0.2s;}
.btn:hover { background: #2980b9; transform: translateY(-2px);}
.toggle-text { color: #f1c40f; text-align: center; font-size: 14px; cursor: pointer; margin: 0; }
.toggle-text:hover { text-decoration: underline; }

/* 中央弹窗系统 */
.custom-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 9999; }
.custom-modal { background: #2c3e50; padding: 30px; border-radius: 12px; width: 320px; text-align: center; border: 2px solid #3498db; color: white; box-shadow: 0 10px 30px rgba(0,0,0,0.5);}
.modal-msg { margin: 20px 0; font-size: 15px; color: #ecf0f1; line-height: 1.5;}
.btn-confirm { background: #27ae60; color: white; border: none; padding: 10px 30px; border-radius: 6px; font-size: 15px; cursor: pointer; font-weight: bold;}
.btn-confirm:hover { background: #2ecc71; }
</style>