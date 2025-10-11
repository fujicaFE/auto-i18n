# 测试文档

本项目为 AutoI18nPlugin webpack 插件提供了全面的单元测试和集成测试。

## 测试结构

```
__tests__/
├── setup.ts                    # Jest 测试设置文件
├── auto-i18n-plugin.test.ts   # AutoI18nPlugin 主类测试
├── transformer.test.ts        # Transformer 类测试（主要转换逻辑）
├── chinese-extractor.test.ts  # ChineseExtractor 类测试（已存在）
├── locale-file-manager.test.ts # LocaleFileManager 类测试
├── translation-service.test.ts # TranslationService 类测试
├── utils-transformer.test.ts  # Utils Transformer 类测试
└── integration.test.ts         # 集成测试
```

## 测试覆盖范围

### 1. AutoI18nPlugin 主类测试 (`auto-i18n-plugin.test.ts`)
- 插件初始化和配置选项
- Webpack 钩子注册和兼容性（webpack 4.x 和 5.x）
- 资源文件处理和过滤
- 错误处理和异常情况
- RawSource 降级方案

### 2. Transformer 类测试 (`transformer.test.ts`)
- JavaScript 文件中文字符串转换
- Vue 文件模板和脚本转换
- JSX 属性和文本节点转换
- 自定义函数名支持
- 边界情况和错误处理

### 3. Utils Transformer 类测试 (`utils-transformer.test.ts`)
- 基于翻译映射的代码转换
- import 语句自动添加
- 复杂代码结构处理
- 配置选项支持

### 4. LocaleFileManager 类测试 (`locale-file-manager.test.ts`)
- 翻译文件读取和写入
- 多语言文件管理
- 翻译合并和去重
- 文件系统错误处理

### 5. TranslationService 类测试 (`translation-service.test.ts`)
- 多种翻译服务提供商支持
- 缓存机制
- 批量翻译处理
- API 错误处理
- 预设翻译支持

### 6. 集成测试 (`integration.test.ts`)
- 完整工作流程测试
- Webpack 版本兼容性
- 性能测试
- 错误容错机制
- 配置选项综合测试

## 运行测试

### 运行所有测试
```bash
npm test
```

### 运行测试并监听文件变化
```bash
npm run test:watch
```

### 运行测试并生成覆盖率报告
```bash
npm run test:coverage
```

### 只运行单元测试
```bash
npm run test:unit
```

### 只运行集成测试
```bash
npm run test:integration
```

### 详细输出模式
```bash
npm run test:verbose
```

## 测试覆盖率目标

- **语句覆盖率**: > 90%
- **分支覆盖率**: > 85%
- **函数覆盖率**: > 90%
- **行覆盖率**: > 90%

## Mock 策略

### 外部依赖 Mock
- `fs`: 文件系统操作
- `axios`: HTTP 请求
- `chinese-conv`: 繁体中文转换
- `crypto-js`: 加密功能
- `webpack-sources`: Webpack 资源处理

### Webpack Mock
- 模拟 webpack 编译器和编译对象
- 模拟不同版本的 webpack API
- 模拟资源处理钩子

## 测试最佳实践

1. **隔离性**: 每个测试用例都是独立的，不依赖其他测试的状态
2. **可重复性**: 测试结果应该是一致和可预测的
3. **错误覆盖**: 测试包含正常流程和异常情况
4. **性能考虑**: 集成测试包含性能基准测试
5. **真实场景**: 测试用例基于实际使用场景

## 调试测试

如果测试失败，可以：

1. 运行单个测试文件：
   ```bash
   npx jest __tests__/auto-i18n-plugin.test.ts
   ```

2. 运行特定测试用例：
   ```bash
   npx jest -t "should transform Chinese strings"
   ```

3. 启用详细输出：
   ```bash
   npx jest --verbose
   ```

4. 查看覆盖率详情：
   ```bash
   npm run test:coverage
   open coverage/lcov-report/index.html
   ```

## 贡献测试

添加新功能时，请确保：

1. 为新功能添加相应的单元测试
2. 更新集成测试以覆盖新的工作流程
3. 保持测试覆盖率不低于现有标准
4. 遵循现有的测试模式和命名约定