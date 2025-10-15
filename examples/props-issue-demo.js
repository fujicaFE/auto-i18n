// 创建一个测试组件来演示 props 中的中文值问题
const testComponent = `
<template>
  <div>
    <child-component 
      :title="默认标题"
      :message="欢迎使用"
      :placeholder="请输入内容"
    />
  </div>
</template>

<script>
export default {
  name: 'TestComponent',
  props: {
    defaultTitle: {
      type: String,
      default: '默认标题'
    },
    welcomeMessage: {
      type: String,
      default: '欢迎使用系统'
    }
  },
  data() {
    return {
      formData: {
        name: '张三',
        status: '正常'
      }
    }
  }
}
</script>
`;

console.log('Props 中的中文值问题示例:');
console.log(testComponent);