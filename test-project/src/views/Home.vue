<template>
  <div class="home">
    
    <div class="hero-section">
      <div :title="'哈哈'">{{ $t('剩余车位：') }}{{ '--' }}</div>
      <div>{{ false == 1 ? '手动入场' : '手动出场' }}</div>
      <input :placeholder="$t('请输入哈哈哈')"></input>
      <div
        prop="parkid"
        :label="$t('车场编号')"
        show-overflow-tooltip
      ></div>
      <div prop="parkname" :label="$t('车场名称')" show-overflow-tooltip min-width="100"></div>
  <p>{{ new Date().getFullYear() }} {{ $t('深圳市富士智能股份有限公司 版权所有') }}</p>
      <h1 class="hero-title">{{ $t('欢迎使用自动国际化插件') }}</h1>
      <p class="hero-subtitle">{{ $t('这是一个演示项目，展示webpack插件如何自动提取和翻译中文文本') }}</p>
      <button class="cta-button" @click="showDemo">{{ $t('开始演示') }}</button>
    </div>

    <div class="features-section">
      <h2 class="section-title">{{ $t('主要特性') }}</h2>
      <div class="features-grid">
        <div class="feature-card">
          <h3>{{ $t('自动提取') }}</h3>
          <p>{{ $t('自动从Vue组件和JavaScript文件中提取中文文本') }}</p>
        </div>
        <div class="feature-card">
          <h3>{{ $t('智能翻译') }}</h3>
          <p>{{ $t('支持多种翻译服务，包括百度翻译、谷歌翻译等') }}</p>
        </div>
        <div class="feature-card">
          <h3>{{ $t('代码转换') }}</h3>
          <p>{{ $t('自动将中文字符串替换为i18n函数调用') }}</p>
        </div>
        <div class="feature-card">
          <h3>{{ $t('预设翻译') }}</h3>
          <p>{{ $t('支持预定义翻译词汇，优先于自动翻译') }}</p>
        </div>
      </div>
    </div>

    <div class="demo-section">
      <h2 class="section-title">{{ $t('功能演示') }}</h2>
      <div class="demo-form">
        <div class="form-group">
          <label for="username">{{ $t('用户名:') }}</label>
          <input type="text" id="username" v-model="demoForm.username" :placeholder="$t('请输入用户名')">
        </div>
        <div class="form-group">
          <label for="password">{{ $t('密码:') }}</label>
          <input type="password" id="password" v-model="demoForm.password" :placeholder="$t('请输入密码')">
        </div>
        <div class="form-actions">
          <button @click="handleLogin" class="primary-btn">{{ $t('登录') }}</button>
          <button @click="handleRegister" class="secondary-btn">{{ $t('注册') }}</button>
          <button @click="handleReset" class="secondary-btn">{{ $t('重置') }}</button>
        </div>
      </div>
    </div>

    <DemoComponent />

    <div class="status-section" v-if="showStatus">
      <div class="status-message" :class="statusType">
        {{ statusMessage }}
      </div>
    </div>
  </div>
</template>

<script>
import DemoComponent from '@/components/DemoComponent.vue';
import I18nTest from '@/components/I18nTest.vue';

export default {
  name: 'Home',
  components: {
    DemoComponent,
    I18nTest
  },
  props: {
    placeholder: {
      type: String,
      default: i18n.t('请输入车牌号码')
    }
  },
  data() {
    return {
      demoForm: {
        username: '',
        password: ''
      },
      showStatus: false,
      statusMessage: '',
      statusType: 'success'
    };
  },
  methods: {
    showDemo() {
      alert(this.$t("这是一个演示弹窗，展示中文文本的自动国际化！"));
    },
    handleLogin() {
      if (!this.demoForm.username || !this.demoForm.password) {
        this.showStatusMessage(this.$t("请填写完整的登录信息"), 'error');
        return;
      }
      this.showStatusMessage(this.$t("登录成功！"), 'success');
      console.log(this.$t("用户登录:"), this.demoForm.username);
    },
    handleRegister() {
      if (!this.demoForm.username) {
        this.showStatusMessage(this.$t("请先输入用户名"), 'error');
        return;
      }
      this.showStatusMessage(this.$t("注册功能开发中..."), 'info');
    },
    handleReset() {
      this.demoForm.username = '';
      this.demoForm.password = '';
      this.showStatusMessage(this.$t("表单已重置"), 'info');
    },
    showStatusMessage(message, type) {
      this.statusMessage = message;
      this.statusType = type;
      this.showStatus = true;

      setTimeout(() => {
        this.showStatus = false;
      }, 3000);
    }
  },
  mounted() {
    console.log(this.$t("首页组件已加载"));
  }
};</script>

<style scoped>
.home {
  max-width: 1000px;
  margin: 0 auto;
}

.hero-section {
  text-align: center;
  padding: 3rem 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 10px;
  margin-bottom: 3rem;
}

.hero-title {
  font-size: 2.5rem;
  margin-bottom: 1rem;
  font-weight: bold;
}

.hero-subtitle {
  font-size: 1.2rem;
  margin-bottom: 2rem;
  opacity: 0.9;
}

.cta-button {
  background-color: #ff6b6b;
  color: white;
  border: none;
  padding: 1rem 2rem;
  font-size: 1.1rem;
  border-radius: 25px;
  cursor: pointer;
  transition: all 0.3s;
}

.cta-button:hover {
  background-color: #ff5252;
  transform: translateY(-2px);
}

.features-section, .demo-section {
  margin-bottom: 3rem;
}

.section-title {
  font-size: 2rem;
  text-align: center;
  margin-bottom: 2rem;
  color: #2c3e50;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.feature-card {
  background: white;
  padding: 1.5rem;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  text-align: center;
  transition: transform 0.3s;
}

.feature-card:hover {
  transform: translateY(-5px);
}

.feature-card h3 {
  color: #3498db;
  margin-bottom: 1rem;
  font-size: 1.3rem;
}

.demo-form {
  background: white;
  padding: 2rem;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  max-width: 400px;
  margin: 0 auto;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
  color: #2c3e50;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #ddd;
  border-radius: 5px;
  font-size: 1rem;
  transition: border-color 0.3s;
}

.form-group input:focus {
  outline: none;
  border-color: #3498db;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.primary-btn, .secondary-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 5px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s;
}

.primary-btn {
  background-color: #3498db;
  color: white;
}

.primary-btn:hover {
  background-color: #2980b9;
}

.secondary-btn {
  background-color: #95a5a6;
  color: white;
}

.secondary-btn:hover {
  background-color: #7f8c8d;
}

.status-section {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
}

.status-message {
  padding: 1rem 1.5rem;
  border-radius: 5px;
  color: white;
  font-weight: bold;
  animation: slideIn 0.3s ease-out;
}

.status-message.success {
  background-color: #27ae60;
}

.status-message.error {
  background-color: #e74c3c;
}

.status-message.info {
  background-color: #3498db;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 2rem;
  }
  
  .hero-subtitle {
    font-size: 1rem;
  }
  
  .features-grid {
    grid-template-columns: 1fr;
  }
  
  .form-actions {
    flex-direction: column;
  }
}
</style>