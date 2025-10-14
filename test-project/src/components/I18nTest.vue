<template>
  <div class="i18n-test">
    <h2>{{ $t('国际化测试组件') }}</h2>
    <p>{{ $t('硬编码文本: 这段文字不会改变') }}</p>
    <p>i18n文本: {{ $t('首页') }}</p>
    <p>当前语言: {{ $i18n.locale }}</p>
    <button @click="testTranslation">{{ $t('测试翻译') }}</button>
  </div>
</template>

<script>import { useI18n } from 'vue-i18n';
export default {
  name: 'I18nTest',
  methods: {
    testTranslation() {
      console.log($t("测试翻译:"));
      console.log($t("首页 =>"), this.$t('首页'));
      console.log($t("关于 =>"), this.$t('关于'));
      console.log($t("联系我们 =>"), this.$t('联系我们'));
      alert(`当前语言: ${this.$i18n.locale}\n首页翻译: ${this.$t('首页')}`);
    }
  }
};</script>

<style scoped>
.i18n-test {
  padding: 20px;
  border: 2px solid #007cba;
  margin: 20px;
  background-color: #f0f8ff;
}
</style>