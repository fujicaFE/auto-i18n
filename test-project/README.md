# 自动国际化插件测试项目

这是一个用于测试 `@fujica/auto-i18n` webpack插件的Vue.js项目。该项目包含了丰富的中文文本内容，用于演示插件的自动提取、翻译和代码转换功能。

## 项目结构

```
test-project/
├── public/
│   └── index.html              # 主HTML模板
├── src/
│   ├── components/
│   │   └── DemoComponent.vue   # 演示组件
│   ├── views/
│   │   ├── Home.vue           # 首页
│   │   ├── About.vue          # 关于页面
│   │   └── Contact.vue        # 联系页面
│   ├── router/
│   │   └── index.js           # 路由配置
│   ├── utils/
│   │   └── common.js          # 通用工具函数
│   ├── App.vue                # 根组件
│   ├── main.js                # 入口文件
│   └── i18n.js                # 国际化配置
├── package.json               # 项目依赖
└── vue.config.js             # webpack配置（包含插件配置）
```

## 特色功能

### 1. 丰富的中文内容
- **Vue模板中的中文**: 包含文本节点、属性值、v-指令等
- **JavaScript代码中的中文**: 变量赋值、函数调用、对象属性等
- **用户交互中的中文**: 按钮文本、提示信息、表单标签等

### 2. 多种Vue特性演示
- **组件通信**: 父子组件数据传递
- **事件处理**: 按钮点击、表单提交等
- **条件渲染**: v-if、v-show指令
- **列表渲染**: v-for循环
- **表单绑定**: v-model双向绑定

### 3. 复杂业务场景
- **用户注册/登录流程**
- **表单验证和提交**
- **数据展示和统计**
- **消息提示和状态管理**

## 如何使用

### 1. 安装依赖

首先确保你已经构建了auto-i18n插件：

```bash
# 在auto-i18n根目录
npm run build
npm link
```

然后在测试项目中安装依赖：

```bash
# 进入测试项目目录
cd test-project

# 安装依赖
npm install

# 链接本地插件
npm link @fujica/auto-i18n
```

### 2. 运行开发服务器

```bash
npm run serve
```

访问 `http://localhost:8080` 查看项目运行效果。

### 3. 测试插件功能

执行构建命令来测试插件：

```bash
npm run build
```

构建过程中，插件会：
1. **提取中文文本**: 从所有Vue和JS文件中自动识别中文
2. **生成翻译文件**: 在 `src/locales/` 目录下创建多语言JSON文件
3. **转换代码**: 将中文字符串替换为 `$t()` 函数调用

### 4. 查看结果

构建完成后，检查以下文件：
- `src/locales/en.json` - 英文翻译文件
- `src/locales/zh-TW.json` - 繁体中文翻译文件
- `src/locales/ja.json` - 日文翻译文件
- `dist/` 目录下的转换后的代码文件

## 插件配置

在 `vue.config.js` 中的插件配置：

```javascript
new AutoI18nPlugin({
  outputPath: './src/locales',
  apiProvider: 'preset',
  targetLanguages: ['en', 'zh-TW', 'ja'],
  presets: {
    // 预设翻译词汇
    '你好': { en: 'Hello', 'zh-TW': '你好', ja: 'こんにちは' },
    // ... 更多预设
  },
  transformCode: true,
  ignoreComments: true,
  exclude: ['/node_modules/', /\.min\.js$/]
})
```

## 测试内容

### 页面测试点
1. **首页 (/)**: 
   - 英雄区块文本
   - 功能特性列表
   - 表单交互
   - 状态消息

2. **关于页面 (/about)**:
   - 项目介绍文本
   - 统计数据动画
   - 技术特性描述

3. **联系页面 (/contact)**:
   - 联系表单
   - 验证消息
   - 提交反馈

### 组件测试点
- **DemoComponent**: 演示基础组件的文本处理
- **App.vue**: 导航菜单和全局布局文本

### JavaScript测试点
- **utils/common.js**: 工具函数中的错误消息、常量定义
- **router/index.js**: 路由配置
- **main.js**: 应用初始化

## 预期结果

插件正确运行后，你应该看到：

1. **翻译文件生成**: 在 `src/locales/` 目录下生成对应语言的JSON文件
2. **代码转换**: 中文字符串被替换为 `$t('中文内容')` 调用
3. **预设翻译优先**: 配置的预设翻译会优先使用
4. **文件排除**: node_modules等被正确排除

## 常见问题

### Q: 构建失败怎么办？
A: 检查插件是否正确构建和链接，确保所有依赖都已安装。

### Q: 翻译文件没有生成？
A: 检查 `outputPath` 配置是否正确，确保目录有写入权限。

### Q: 某些文本没有被转换？
A: 检查 `exclude` 配置，确认文件没有被排除。检查文本是否符合中文正则表达式。

### Q: 如何添加更多预设翻译？
A: 在 `vue.config.js` 的 `presets` 配置中添加更多词汇对照。

## 自定义测试

你可以通过以下方式自定义测试内容：

1. **添加新页面**: 在 `src/views/` 下创建新的Vue文件
2. **修改组件**: 编辑现有组件以测试特定场景
3. **调整配置**: 修改 `vue.config.js` 中的插件参数
4. **添加工具函数**: 在 `src/utils/` 下添加更多JavaScript文件

## 贡献

如果你在测试过程中发现问题或有改进建议，欢迎：
1. 提交Issue描述问题
2. 提供Pull Request改进测试项目
3. 分享你的测试结果和使用经验