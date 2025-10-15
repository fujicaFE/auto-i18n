# 代码风格配置指南

## 问题描述

在使用 auto-i18n 插件时，您可能会发现转换后的代码自动添加了分号，这是因为 Babel 生成器的默认行为。

## 解决方案

通过配置 `codeStyle` 选项来控制代码风格：

```javascript
new AutoI18nPlugin({
  // ... 其他配置
  codeStyle: {
    semicolons: false,  // 不添加分号
    quotes: 'single'    // 使用单引号
  }
})
```

## 配置选项

### `semicolons: boolean`
- `false`: 不自动添加分号（推荐用于Vue CLI项目）
- `true`: 自动添加分号（推荐用于标准JS/TS项目）
- 未配置: 自动检测原代码风格

### `quotes: 'single' | 'double'`
- `'single'`: 使用单引号（Vue推荐风格）
- `'double'`: 使用双引号
- 未配置: 自动检测原代码风格

## 常见项目配置

### Vue CLI 项目（ESLint Standard）
```javascript
codeStyle: {
  semicolons: false,
  quotes: 'single'
}
```

### React/Next.js 项目
```javascript
codeStyle: {
  semicolons: true,
  quotes: 'single'
}
```

### Angular 项目
```javascript
codeStyle: {
  semicolons: true,
  quotes: 'single'
}
```

### TypeScript 项目
```javascript
codeStyle: {
  semicolons: true,
  quotes: 'single'
}
```

## 转换示例

### 原始代码
```javascript
const message = '欢迎使用'
const title = '首页'
```

### 配置 `semicolons: false`
```javascript
const message = $t('欢迎使用')
const title = $t('首页')
```

### 配置 `semicolons: true`
```javascript
const message = $t('欢迎使用');
const title = $t('首页');
```

### 配置 `quotes: 'double'`
```javascript
const message = $t("欢迎使用")
const title = $t("首页")
```

## 自动检测

如果不配置 `codeStyle`，插件会尝试自动检测原代码的风格：
- 分析代码中分号的使用比例
- 分析代码中引号的使用偏好
- 保持与原代码一致的风格