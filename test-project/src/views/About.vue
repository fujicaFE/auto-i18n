<template>
  <div class="about">
    <div class="about-header">
      <h1>{{ $t('关于自动国际化插件') }}</h1>
      <p class="about-subtitle">{{ $t('了解这个强大的webpack插件如何简化你的国际化工作流程') }}</p>
    </div>

    <div class="about-content">
      <section class="intro-section">
        <h2>{{ $t('项目介绍') }}</h2>
        <p>{{ $t('自动国际化插件是一个专为Vue.js项目设计的webpack插件，它能够自动识别代码中的中文文本， 并将其提取、翻译和转换为标准的i18n格式。这大大简化了国际化的工作流程， 让开发者可以专注于业务逻辑而不是繁琐的翻译工作。') }}</p>
      </section>

      <section class="features-section">
        <h2>{{ $t('核心功能') }}</h2>
        <div class="features-list">
          <div class="feature-item">
            <h3>{{ $t('智能文本识别') }}</h3>
            <p>{{ $t('自动识别Vue组件模板、脚本和JavaScript文件中的中文文本') }}</p>
          </div>
          <div class="feature-item">
            <h3>{{ $t('多译翻译支持') }}</h3>
            <p>{{ $t('集成百度翻译、谷歌翻译等多种翻译服务') }}</p>
          </div>
          <div class="feature-item">
            <h3>{{ $t('代码自动转换') }}</h3>
            <p>{{ $t('将中文字符串自动替换为$t()函数调用') }}</p>
          </div>
          <div class="feature-item">
            <h3>{{ $t('预设翻译管理') }}</h3>
            <p>{{ $t('支持预定义翻译词汇，确保翻译质量') }}</p>
          </div>
        </div>
      </section>

      <section class="usage-section">
        <h2>{{ $t('使用说明') }}</h2>
        <div class="usage-steps">
          <div class="step">
            <div class="step-number">1</div>
            <div class="step-content">
              <h3>{{ $t('安装插件') }}</h3>
              <code>npm install @fujica/auto-i18n --save-dev</code>
            </div>
          </div>
          <div class="step">
            <div class="step-number">2</div>
            <div class="step-content">
              <h3>{{ $t('配置webpack') }}</h3>
              <p>{{ $t('在vue.config.js中添加插件配置') }}</p>
            </div>
          </div>
          <div class="step">
            <div class="step-number">3</div>
            <div class="step-content">
              <h3>{{ $t('运行构建') }}</h3>
              <p>{{ $t('执行构建命令，插件会自动处理国际化') }}</p>
            </div>
          </div>
        </div>
      </section>

      <section class="stats-section">
        <h2>{{ $t('项目统计') }}</h2>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-number">{{ stats.filesProcessed }}</div>
            <div class="stat-label">{{ $t('处理文件数') }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">{{ stats.textsExtracted }}</div>
            <div class="stat-label">{{ $t('提取文本数') }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">{{ stats.languagesSupported }}</div>
            <div class="stat-label">{{ $t('支持语言数') }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">{{ stats.translationTime }}</div>
            <div class="stat-label">{{ $t('平均翻译时间(ms)') }}</div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script>
export default {
  name: 'About',
  data() {
    return {
      stats: {
        filesProcessed: 0,
        textsExtracted: 0,
        languagesSupported: 3,
        translationTime: 0
      }
    };
  },
  methods: {
    loadStats() {
      // 模拟加载统计数据
      console.log(this.$t("正在加载项目统计数据..."));

      const targets = {
        filesProcessed: 42,
        textsExtracted: 156,
        translationTime: 250
      };

      Object.keys(targets).forEach((key) => {
        this.animateNumber(key, targets[key]);
      });
    },
    animateNumber(key, target) {
      const duration = 2000;
      const start = 0;
      const startTime = performance.now();

      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        this.stats[key] = Math.floor(start + (target - start) * progress);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    },
    showTechDetails() {
      alert(this.$t("技术详情：基于Babel AST解析，支持Vue SFC和JavaScript文件处理"));
    }
  },
  mounted() {
    console.log(this.$t("关于页面已加载"));
    this.loadStats();
  }
};</script>

<style scoped>
.about {
  max-width: 1000px;
  margin: 0 auto;
  line-height: 1.6;
}

.about-header {
  text-align: center;
  padding: 2rem 0;
  border-bottom: 2px solid #eee;
  margin-bottom: 2rem;
}

.about-header h1 {
  font-size: 2.5rem;
  color: #2c3e50;
  margin-bottom: 1rem;
}

.about-subtitle {
  font-size: 1.2rem;
  color: #666;
  max-width: 600px;
  margin: 0 auto;
}

.about-content section {
  margin-bottom: 3rem;
}

.about-content h2 {
  font-size: 1.8rem;
  color: #3498db;
  margin-bottom: 1.5rem;
  border-left: 4px solid #3498db;
  padding-left: 1rem;
}

.intro-section p {
  font-size: 1.1rem;
  color: #555;
  text-align: justify;
}

.features-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.feature-item {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  border-left: 4px solid #e74c3c;
}

.feature-item h3 {
  color: #e74c3c;
  margin-bottom: 0.5rem;
}

.usage-steps {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.step {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.step-number {
  background: #27ae60;
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 1.2rem;
  flex-shrink: 0;
}

.step-content h3 {
  color: #2c3e50;
  margin-bottom: 0.5rem;
}

.step-content code {
  background: #2c3e50;
  color: #ecf0f1;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  display: inline-block;
  font-family: 'Courier New', monospace;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.stat-item {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem;
  border-radius: 10px;
  text-align: center;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
}

.stat-number {
  font-size: 2.5rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.stat-label {
  font-size: 0.9rem;
  opacity: 0.9;
}

@media (max-width: 768px) {
  .about-header h1 {
    font-size: 2rem;
  }
  
  .about-subtitle {
    font-size: 1rem;
  }
  
  .features-list {
    grid-template-columns: 1fr;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .stat-number {
    font-size: 2rem;
  }
}
</style>