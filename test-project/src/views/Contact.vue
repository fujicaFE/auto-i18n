<template>
  <div class="contact">
    <div class="contact-header">
      <h1>{{ $t('联系我们') }}</h1>
      <p>{{ $t('如果您有任何问题或建议，请随时与我们联系') }}</p>
    </div>

    <div class="contact-content">
      <div class="contact-form">
        <h2>{{ $t('发送消息') }}</h2>
        <form @submit.prevent="handleSubmit">
          <div class="form-group">
            <label for="name">{{ $t('姓名 *') }}</label>
            <input
              type="text"
              id="name"
              v-model="form.name"
              required
              :placeholder="$t('请输入您的姓名')"
            >
          </div>
          
          <div class="form-group">
            <label for="email">{{ $t('邮箱 *') }}</label>
            <input
              type="email"
              id="email"
              v-model="form.email"
              required
              :placeholder="$t('请输入您的邮箱地址')"
            >
          </div>
          
          <div class="form-group">
            <label for="subject">{{ $t('主题') }}</label>
            <select id="subject" v-model="form.subject">
              <option value="">{{ $t('请选择主题') }}</option>
              <option value="bug">{{ $t('错误报告') }}</option>
              <option value="feature">{{ $t('功能建议') }}</option>
              <option value="question">{{ $t('使用问题') }}</option>
              <option value="other">{{ $t('其他') }}</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="message">{{ $t('消息内容 *') }}</label>
            <textarea
              id="message"
              v-model="form.message"
              rows="5"
              required
              :placeholder="$t('请详细描述您的问题或建议...')"
            ></textarea>
          </div>
          
          <div class="form-actions">
            <button type="submit" class="submit-btn" :disabled="isSubmitting">
              {{  isSubmitting ? $t('发送中...') : '发送消息'  }}
            </button>
            <button type="button" @click="resetForm" class="reset-btn">{{ $t('重置表单') }}</button>
          </div>
        </form>
      </div>

      <div class="contact-info">
        <h2>{{ $t('联系信息') }}</h2>
        
        <div class="info-section">
          <h3>{{ $t('开发者信息') }}</h3>
          <div class="info-item">
            <strong>{{ $t('项目名称:') }}</strong>{{ $t('自动国际化插件') }}</div>
          <div class="info-item">
            <strong>{{ $t('开发者:') }}</strong> Fujica
          </div>
          <div class="info-item">
            <strong>{{ $t('版本:') }}</strong> v1.0.0
          </div>
        </div>

        <div class="info-section">
          <h3>{{ $t('技术支持') }}</h3>
          <div class="info-item">
            <strong>{{ $t('文档:') }}</strong> <a href="#" @click="openDocs">{{ $t('查看文档') }}</a>
          </div>
          <div class="info-item">
            <strong>GitHub:</strong> <a href="#" @click="openGithub">{{ $t('访问仓库') }}</a>
          </div>
          <div class="info-item">
            <strong>{{ $t('问题反馈:') }}</strong> <a href="#" @click="openIssues">{{ $t('提交Issue') }}</a>
          </div>
        </div>

        <div class="info-section">
          <h3>{{ $t('快速链接') }}</h3>
          <div class="quick-links">
            <button @click="showFAQ" class="link-btn">{{ $t('常见问题') }}</button>
            <button @click="showTutorial" class="link-btn">{{ $t('使用教程') }}</button>
            <button @click="showExamples" class="link-btn">{{ $t('示例代码') }}</button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 成功提示 -->
    <div v-if="showSuccess" class="success-message">
      <h3>{{ $t('消息发送成功！') }}</h3>
      <p>{{ $t('感谢您的反馈，我们会尽快回复您。') }}</p>
      <button @click="showSuccess = false">{{ $t('关闭') }}</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Contact',
  data() {
    return {
      form: {
        name: '',
        email: '',
        subject: '',
        message: ''
      },
      isSubmitting: false,
      showSuccess: false
    };
  },
  methods: {
    async handleSubmit() {
      if (!this.validateForm()) {
        return;
      }

      this.isSubmitting = true;
      console.log(this.$t("正在发送消息..."), this.form);

      try {
        // 模拟发送消息
        await this.simulateSubmission();
        this.showSuccess = true;
        this.resetForm();
        alert(this.$t("消息发送成功！谢谢您的反馈。"));
      } catch (error) {
        alert(this.$t("发送失败，请稍后重试。"));
        console.error(this.$t("发送错误:"), error);
      } finally {
        this.isSubmitting = false;
      }
    },

    validateForm() {
      if (!this.form.name.trim()) {
        alert(this.$t("请输入您的姓名"));
        return false;
      }

      if (!this.form.email.trim()) {
        alert(this.$t("请输入您的邮箱地址"));
        return false;
      }

      if (!this.isValidEmail(this.form.email)) {
        alert(this.$t("请输入有效的邮箱地址"));
        return false;
      }

      if (!this.form.message.trim()) {
        alert(this.$t("请输入消息内容"));
        return false;
      }

      return true;
    },

    isValidEmail(email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    },

    resetForm() {
      this.form = {
        name: '',
        email: '',
        subject: '',
        message: ''
      };
      console.log(this.$t("表单已重置"));
    },

    simulateSubmission() {
      return new Promise((resolve) => {
        setTimeout(() => {
          console.log(this.$t("消息发送模拟完成"));
          resolve();
        }, 2000);
      });
    },

    openDocs() {
      alert(this.$t("即将跳转到文档页面..."));
      console.log(this.$t("打开文档"));
    },

    openGithub() {
      alert(this.$t("即将跳转到GitHub仓库..."));
      console.log(this.$t("打开GitHub"));
    },

    openIssues() {
      alert(this.$t("即将跳转到Issues页面..."));
      console.log(this.$t("打开Issues"));
    },

    showFAQ() {
      alert(this.$t("常见问题页面开发中..."));
    },

    showTutorial() {
      alert(this.$t("使用教程页面开发中..."));
    },

    showExamples() {
      alert(this.$t("示例代码页面开发中..."));
    }
  },

  mounted() {
    console.log(this.$t("联系页面已加载"));
  }
};</script>

<style scoped>
.contact {
  max-width: 1200px;
  margin: 0 auto;
}

.contact-header {
  text-align: center;
  padding: 2rem 0;
  margin-bottom: 2rem;
}

.contact-header h1 {
  font-size: 2.5rem;
  color: #2c3e50;
  margin-bottom: 1rem;
}

.contact-header p {
  font-size: 1.2rem;
  color: #666;
}

.contact-content {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 3rem;
  align-items: start;
}

.contact-form {
  background: white;
  padding: 2rem;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.contact-form h2 {
  color: #3498db;
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
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

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #ddd;
  border-radius: 5px;
  font-size: 1rem;
  font-family: inherit;
  transition: border-color 0.3s;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #3498db;
}

.form-group textarea {
  resize: vertical;
  min-height: 120px;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.submit-btn, .reset-btn {
  padding: 0.75rem 2rem;
  border: none;
  border-radius: 5px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s;
}

.submit-btn {
  background-color: #3498db;
  color: white;
}

.submit-btn:hover:not(:disabled) {
  background-color: #2980b9;
}

.submit-btn:disabled {
  background-color: #bdc3c7;
  cursor: not-allowed;
}

.reset-btn {
  background-color: #95a5a6;
  color: white;
}

.reset-btn:hover {
  background-color: #7f8c8d;
}

.contact-info {
  background: white;
  padding: 2rem;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  height: fit-content;
}

.contact-info h2 {
  color: #e74c3c;
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
}

.info-section {
  margin-bottom: 2rem;
}

.info-section h3 {
  color: #2c3e50;
  margin-bottom: 1rem;
  font-size: 1.2rem;
  border-bottom: 2px solid #eee;
  padding-bottom: 0.5rem;
}

.info-item {
  margin-bottom: 0.75rem;
  line-height: 1.5;
}

.info-item strong {
  color: #2c3e50;
}

.info-item a {
  color: #3498db;
  text-decoration: none;
}

.info-item a:hover {
  text-decoration: underline;
}

.quick-links {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.link-btn {
  background: none;
  border: 2px solid #3498db;
  color: #3498db;
  padding: 0.5rem 1rem;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.3s;
  text-align: left;
}

.link-btn:hover {
  background-color: #3498db;
  color: white;
}

.success-message {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  padding: 2rem;
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  text-align: center;
  z-index: 1000;
  min-width: 300px;
}

.success-message h3 {
  color: #27ae60;
  margin-bottom: 1rem;
}

.success-message button {
  background-color: #27ae60;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 5px;
  cursor: pointer;
  margin-top: 1rem;
}

@media (max-width: 768px) {
  .contact-content {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
  
  .form-actions {
    flex-direction: column;
  }
  
  .submit-btn, .reset-btn {
    width: 100%;
  }
}
</style>