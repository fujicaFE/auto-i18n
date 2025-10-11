<template>
  <div class="example-component">
    <h1>国际化示例</h1>
    <p>这是一个简单的示例组件，用于展示自动国际化功能。</p>

    <div class="user-greeting">
      <span>你好，{{ username }}！欢迎回来。</span>
    </div>

    <div class="action-buttons">
      <button @click="handleClick('保存')" title="点击保存数据">保存</button>
      <button @click="handleClick('取消')" title="点击取消操作">取消</button>
    </div>

    <div class="status-message" :class="messageType">
      {{ statusMessage }}
    </div>
  </div>
</template>

<script>
export default {
  name: 'ExampleComponent',

  data() {
    return {
      username: '用户',
      statusMessage: '请点击按钮执行操作',
      messageType: 'info'
    };
  },

  methods: {
    handleClick(action) {
      if (action === '保存') {
        this.statusMessage = '数据保存成功！';
        this.messageType = 'success';
      } else if (action === '取消') {
        this.statusMessage = '操作已取消';
        this.messageType = 'warning';
      }

      console.log(`用户点击了${action}按钮`);
    }
  },

  mounted() {
    console.log('组件已加载');

    // 模拟异步操作
    setTimeout(() => {
      this.statusMessage = '系统已准备就绪';
    }, 1000);
  }
};
</script>

<style scoped>
.example-component {
  padding: 20px;
  border: 1px solid #eee;
  border-radius: 8px;
}

.user-greeting {
  margin: 15px 0;
  font-weight: bold;
}

.action-buttons {
  margin: 15px 0;
}

.action-buttons button {
  margin-right: 10px;
  padding: 5px 15px;
}

.status-message {
  margin-top: 15px;
  padding: 10px;
  border-radius: 4px;
}

.info {
  background-color: #e8f4f8;
  color: #0077b6;
}

.success {
  background-color: #d8f3dc;
  color: #2d6a4f;
}

.warning {
  background-color: #fff1d0;
  color: #bb9457;
}
</style>
