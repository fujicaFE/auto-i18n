<template>
  <div class="demo-component">
    <h3>{{ $t('演示组件') }}</h3>
    <p>{{ $t('这是一个包含中文文本的演示组件，用于测试自动国际化功能。') }}</p>
    
    <div class="demo-content">
      <div class="text-examples">
        <h4>{{ $t('文本示例') }}</h4>
        <p>{{ message }}</p>
        <p>{{ $t('当前时间:') }}{{ currentTime }}</p>
        <p>{{ getGreeting() }}</p>
      </div>
      
      <div class="button-examples">
        <h4>{{ $t('按钮示例') }}</h4>
        <button @click="handleClick('保存')">{{ $t('保存') }}</button>
        <button @click="handleClick('删除')">{{ $t('删除') }}</button>
        <button @click="handleClick('取消')">{{ $t('取消') }}</button>
      </div>
      
      <div class="input-examples">
        <h4>{{ $t('输入框示例') }}</h4>
        <input v-model="inputValue" :placeholder="$t('请输入内容')" />
        <p v-if="inputValue">{{ $t('您输入的内容:') }}{{ inputValue }}</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DemoComponent',
  data() {
    return {
      message: this.$t("这是一个测试消息"),
      currentTime: '',
      inputValue: ''
    };
  },
  methods: {
    handleClick(action) {
      alert(`您点击了: ${action}`);
      console.log(this.$t("按钮操作:"), action);
    },
    getGreeting() {
      const hour = new Date().getHours();
      if (hour < 12) {
        return this.$t("早上好！");
      } else if (hour < 18) {
        return this.$t("下午好！");
      } else {
        return this.$t("晚上好！");
      }
    },
    updateTime() {
      this.currentTime = new Date().toLocaleString('zh-CN');
    }
  },
  mounted() {
    console.log(this.$t("演示组件已挂载"));
    this.updateTime();
    setInterval(this.updateTime, 1000);
  },
  beforeDestroy() {
    console.log(this.$t("演示组件即将销毁"));
  }
};</script>

<style scoped>
.demo-component {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
  margin: 1rem 0;
}

.demo-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-top: 1rem;
}

.text-examples,
.button-examples,
.input-examples {
  background: white;
  padding: 1rem;
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.text-examples h4,
.button-examples h4,
.input-examples h4 {
  color: #2c3e50;
  margin-bottom: 1rem;
  font-size: 1.1rem;
}

.button-examples button {
  margin: 0.25rem;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  background-color: #3498db;
  color: white;
  cursor: pointer;
  transition: background-color 0.3s;
}

.button-examples button:hover {
  background-color: #2980b9;
}

.input-examples input {
  width: 100%;
  padding: 0.5rem;
  border: 2px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.input-examples input:focus {
  outline: none;
  border-color: #3498db;
}
</style>