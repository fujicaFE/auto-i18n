<template>
  <div id="app">
    <nav class="navbar">
      <div class="nav-container">
        <h1 class="nav-title">{{ $t('自动国际化测试项目') }}</h1>
        <!-- 测试修改触发重编译 v11 -->
        <div class="nav-links">
          <router-link to="/" class="nav-link">{{ $t('首页') }}</router-link>
          <router-link to="/about" class="nav-link">{{ $t('关于') }}</router-link>
          <router-link to="/contact" class="nav-link">{{ $t('联系我们') }}</router-link>
        </div>
        <div class="language-switcher">
          <select v-model="currentLanguage" @change="changeLanguage">
            <option value="zh">{{ $t('中文') }}</option>
            <option value="en">English</option>
            <option value="zh-TW">{{ $t('繁體中文') }}</option>
            <option value="ja">{{ $t('日本語') }}</option>
          </select>
        </div>
      </div>
    </nav>
    
    <main class="main-content">
      <router-view/>
    </main>
    
    <footer class="footer">
      <p>{{ $t('版权所有 © 2023 自动国际化测试项目') }}</p>
    </footer>
  </div>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
      currentLanguage: this.$i18n.locale
    };
  },
  methods: {
    changeLanguage() {
      this.$i18n.locale = this.currentLanguage;
      console.log(this.$t("语言已切换到:"), this.currentLanguage);
    },
    showWelcomeMessage() {
      alert(this.$t("欢迎使用自动国际化插件！"));
    }
  },
  mounted() {
    console.log(this.$t("应用已启动"));
    this.showWelcomeMessage();
  }
};</script>

<style>
#app {
  font-family: 'Microsoft YaHei', Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.navbar {
  background-color: #2c3e50;
  color: white;
  padding: 1rem 0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
}

.nav-title {
  font-size: 1.5rem;
  font-weight: bold;
}

.nav-links {
  display: flex;
  gap: 1rem;
}

.nav-link {
  color: white;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.nav-link:hover, .nav-link.router-link-active {
  background-color: #34495e;
}

.language-switcher select {
  padding: 0.5rem;
  border: none;
  border-radius: 4px;
  background-color: white;
  color: #2c3e50;
  font-size: 0.9rem;
}

.main-content {
  flex: 1;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
  width: 100%;
}

.footer {
  background-color: #34495e;
  color: white;
  text-align: center;
  padding: 1rem;
  margin-top: auto;
}

@media (max-width: 768px) {
  .nav-container {
    flex-direction: column;
    gap: 1rem;
  }
  
  .nav-links {
    order: 3;
  }
  
  .language-switcher {
    order: 2;
  }
}
</style>