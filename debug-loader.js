// 在 DemoComponent.vue 中添加一些明显的中文来触发 loader
const testContent = `
<!-- 这个注释应该会触发处理 -->
<template>
  <div>
    <h1>这是最新的测试文本</h1>
    <p>刚刚添加的中文内容</p>
  </div>
</template>

<script>
export default {
  data() {
    return {
      newMessage: '这是最新的消息'
    }
  }
}
</script>
`;

// 添加到 DemoComponent 看看是否会触发 loader
console.log('Ready to add test content...');