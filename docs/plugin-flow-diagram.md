```mermaid
flowchart TD
    %% Webpack钩子流程
    webpack[Webpack Compilation]
    webpack --> |1. hooks.compilation| plugin[AutoI18nPlugin]
    
    %% 插件主要处理流程
    plugin --> |2. 检查模式| check{开发模式?}
    check -->|是| dev[设置isDevMode=true]
    check -->|否| prod[设置isDevMode=false]
    
    dev --> |3. 选择处理方式| mtCheck{memoryTransform?}
    prod --> |3. 选择处理方式| mtCheck
    mtCheck -->|true| addLoader[addTransformLoader]
    mtCheck -->|false| skipLoader[不添加Loader]
    
    %% NormalModuleFactory钩子
    addLoader --> |4. 注册| nmf[hooks.normalModuleFactory]
    nmf --> |5. hooks.afterResolve| resolve{文件类型判断}
    resolve -->|.vue/.js/.ts| inject[添加auto-i18n-loader]
    resolve -->|其他| skip[跳过处理]
    
    %% 构建模块钩子
    plugin --> |6. hooks.buildModule| bm[处理每个模块]
    bm --> |7. 判断资源类型| resourceCheck{是否目标文件?}
    resourceCheck -->|是| processFile[processSourceFile]
    resourceCheck -->|否| skipFile[跳过处理]
    
    %% 提取中文文本
    processFile --> |8. 读取源代码| read[读取文件内容]
    read --> |9. 提取中文| extract[ChineseExtractor]
    extract --> |10. 根据文件类型| fileType{文件类型}
    fileType -->|.vue| extractVue[extractFromVueFile]
    fileType -->|.js/.ts| extractJs[extractFromJsFile]
    
    extractVue --> |11. 提取模板中文本| templateExtract[extractFromTemplate]
    extractVue --> |12. 提取脚本中文本| scriptExtract[extract]
    extractJs --> |13. 分析AST| astExtract[使用Babel解析提取]
    
    templateExtract --> |14. 收集中文| collect[添加到processedTexts]
    scriptExtract --> |14. 收集中文| collect
    astExtract --> |14. 收集中文| collect
    
    %% 完成模块钩子
    plugin --> |15. hooks.finishModules| fm[处理收集的文本]
    fm --> |16. 处理收集的文本| processTxt[processCollectedTexts]
    
    %% 翻译和保存流程
    processTxt --> |17. 检查收集状态| countCheck{有中文文本?}
    countCheck -->|否| logNone[记录无中文]
    countCheck -->|是| loadExist[加载现有翻译]
    
    loadExist --> |18. 过滤新文本| filter[过滤未翻译文本]
    filter --> |19. 批量翻译| translate[TranslationService.translateBatch]
    translate --> |20. 添加翻译| add[LocaleFileManager.addTranslations]
    
    add --> |21. 检查开发模式| devCheck{isDevMode且首次编译?}
    devCheck -->|是| cache[缓存翻译但不保存]
    devCheck -->|否| save[LocaleFileManager.saveTranslations]
    
    %% Loader处理流程
    subgraph "auto-i18n-loader处理流程"
        loader[auto-i18n-loader]
        loader --> |1. 获取选项| getOpt[获取loader选项]
        getOpt --> |2. 检查memoryTransform| optCheck{memoryTransform?}
        optCheck -->|否| returnSrc[返回原始源码]
        optCheck -->|是| fileCheck{文件类型检查}
        
        fileCheck -->|不支持的文件| returnSrc
        fileCheck -->|支持的文件| loadTrans[加载翻译]
        loadTrans --> |3. 创建转换器| createTransformer[new Transformer]
        createTransformer --> |4. 转换代码| transform[transformer.transform]
        transform --> |5. 检查是否转换| changed{代码变化?}
        changed -->|是| logSuccess[记录成功]
        changed -->|否| logNoChange[记录无变化]
        logSuccess --> returnTrans[返回转换后代码]
        logNoChange --> returnTrans
    end
    
    %% 代码转换流程
    subgraph "代码转换流程"
        trans[transform方法]
        trans --> |1. 检查文件类型| transCheck{是Vue文件?}
        transCheck -->|是| transVue[transformVueFile]
        transCheck -->|否| transJs[transformJavaScript]
        
        transVue --> |2. 分离文件部分| separate[分离template和script]
        separate --> |3. 处理template| templateTrans[transformVueTemplate]
        separate --> |4. 处理script| scriptTrans[transformJavaScript]
        
        %% Vue模板转换细节
        templateTrans --> |5. 检查已有$t| tCheck{包含$t调用?}
        tCheck -->|是| skipTrans[特殊处理或跳过]
        tCheck -->|否| processText[处理文本]
        
        processText --> |6. 文本节点替换| textReplace[替换文本节点]
        processText --> |7. 属性值替换| attrReplace[替换属性值]
        
        %% JavaScript转换细节
        transJs --> |8. 解析AST| parseAST[使用@babel/parser]
        parseAST --> |9. 遍历AST| traverseAST[使用@babel/traverse]
        traverseAST --> |10. 替换字符串字面量| replaceString[将中文替换为$t调用]
        replaceString --> |11. 生成代码| genCode[使用@babel/generator]
    end
    
    %% 完成编译钩子
    plugin --> |最终| done[hooks.done]
    done --> |仅开发模式| logDev[记录开发模式状态]
```