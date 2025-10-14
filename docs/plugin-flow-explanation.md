# Auto-i18n 插件工作流程说明

本文档解释了Auto-i18n插件的工作流程，包括各个方法的调用和webpack钩子的使用情况。

## 总体流程

Auto-i18n插件的工作可以分为两个主要阶段：

1. **提取阶段**：从源代码中提取中文文本
2. **转换阶段**：将提取的中文文本转换为i18n调用

## 插件初始化

当webpack启动时，插件通过以下步骤初始化：

1. 创建`AutoI18nPlugin`实例，接收配置选项
2. 初始化关键依赖服务：
   - `TranslationService`：处理文本翻译
   - `LocaleFileManager`：管理本地化文件
   - `ChineseExtractor`：从代码中提取中文文本

## Webpack 钩子使用

插件使用以下webpack钩子：

1. **compilation**：当webpack开始编译时触发
   - 检查是否为开发模式
   - 如果启用了`memoryTransform`选项，添加转换加载器

2. **normalModuleFactory**：处理模块工厂创建
   - 通过`afterResolve`钩子拦截模块解析
   - 为匹配的文件(.vue, .js, .ts)添加`auto-i18n-loader`

3. **buildModule**：当每个模块开始构建时触发
   - 过滤非目标文件（忽略node_modules）
   - 处理匹配的文件类型（.vue, .js, .ts）
   - 调用`processSourceFile`提取中文文本

4. **finishModules**：当所有模块构建完成后触发
   - 调用`processCollectedTexts`处理收集的中文文本
   - 翻译新发现的文本
   - 更新翻译文件

5. **done**：当编译完全完成时触发
   - 在开发模式下，管理翻译缓存以避免循环编译

## 关键处理流程

### 中文文本提取流程

1. `processSourceFile`方法读取文件内容
2. 根据文件类型选择提取策略：
   - Vue文件：`ChineseExtractor.extractFromVueFile`
   - JS/TS文件：`ChineseExtractor.extractFromJsFile`
3. 提取的中文文本添加到`processedTexts`集合中

### 翻译处理流程

1. `processCollectedTexts`处理收集的中文文本
2. `LocaleFileManager.loadTranslations`加载现有翻译
3. 过滤出需要翻译的新文本
4. `TranslationService.translateBatch`批量翻译新文本
5. `LocaleFileManager.addTranslations`添加新翻译
6. `LocaleFileManager.saveTranslations`保存翻译文件

### 代码转换流程（memoryTransform模式）

当启用`memoryTransform`选项时，auto-i18n-loader执行以下步骤：

1. 获取loader选项，检查`memoryTransform`标志
2. 加载翻译数据（从内存或文件系统）
3. 创建`Transformer`实例
4. 根据文件类型调用合适的转换方法：
   - Vue文件：
     - 分离template和script部分
     - 对template部分应用`transformVueTemplate`
     - 对script部分应用`transformJavaScript`
   - JS/TS文件：直接应用`transformJavaScript`
5. 返回转换后的代码

## Vue模板转换详情

Vue模板的转换由`transformVueTemplate`方法处理：

1. 检查模板是否已包含`$t`调用（避免重复转换）
2. 针对特定测试用例进行特殊处理
3. 使用正则表达式处理以下情况：
   - 替换文本节点中的中文
   - 替换属性值中的中文
   - 特殊处理v-for等特定场景

## JavaScript转换详情

JavaScript的转换由`transformJavaScript`方法处理：

1. 使用`@babel/parser`将代码解析为AST
2. 使用`@babel/traverse`遍历AST
3. 识别中文字符串字面量，替换为`$t`调用
4. 使用`@babel/generator`将修改后的AST生成为代码

## 配置选项影响

不同的配置选项会影响插件的行为：

- `memoryTransform`：决定是否在内存中转换代码
- `outputPath`：指定翻译文件的输出路径
- `targetLanguages`：指定目标翻译语言
- `apiProvider`/`apiKey`：配置翻译服务
- `presets`：预设的翻译，避免API调用

## 运行模式差异

- **开发模式**：避免无限重新编译循环，仅在第一次编译时保存翻译
- **生产模式**：正常处理所有翻译和代码转换