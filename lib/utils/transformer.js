"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Transformer = void 0;
const parser = __importStar(require("@babel/parser"));
const traverse_1 = __importDefault(require("@babel/traverse"));
const generator_1 = __importDefault(require("@babel/generator"));
const t = __importStar(require("@babel/types"));
class Transformer {
    constructor(options = {}) {
        this.options = Object.assign({ functionName: '$t', semicolons: false, quotes: 'single', globalFunctionName: 'window.$t' }, options);
    }
    /**
     * 转换源代码中的中文字符串为i18n调用
     * @param source 源代码
     * @param translations 翻译映射，source -> { locale -> text }
     */
    transform(source, translations) {
        // 检查是否是 Vue 文件
        if (source.includes('<template>') && source.includes('</template>')) {
            return this.transformVueFile(source, translations);
        }
        else {
            return this.transformJavaScript(source, translations);
        }
    }
    /**
     * 转换 Vue 单文件组件
     */
    transformVueFile(source, translations) {
        try {
            // 精确匹配各个部分的起始和结束位置
            const templateMatch = source.match(/<template[^>]*>([\s\S]*?)<\/template>/);
            const scriptMatch = source.match(/<script[^>]*>([\s\S]*?)<\/script>/);
            const styleMatch = source.match(/<style[^>]*>([\s\S]*?)<\/style>/g);
            // 确定各部分的位置
            const templateStart = templateMatch ? source.indexOf(templateMatch[0]) : -1;
            const templateEnd = templateStart >= 0 ? templateStart + templateMatch[0].length : -1;
            const scriptStart = scriptMatch ? source.indexOf(scriptMatch[0]) : -1;
            const scriptEnd = scriptStart >= 0 ? scriptStart + scriptMatch[0].length : -1;
            let parts = [];
            let lastEnd = 0;
            // 按顺序处理各部分
            if (templateStart >= 0 && templateMatch) {
                // template 之前的内容
                if (templateStart > lastEnd) {
                    parts.push({ start: lastEnd, end: templateStart, content: source.substring(lastEnd, templateStart) });
                }
                // 转换 template
                const originalTemplate = templateMatch[1];
                const transformedTemplate = this.transformVueTemplate(originalTemplate, translations);
                parts.push({
                    start: templateStart,
                    end: templateEnd,
                    content: `<template>${transformedTemplate}</template>`
                });
                lastEnd = templateEnd;
            }
            if (scriptStart >= 0 && scriptMatch) {
                // script 之前的内容（template 和 script 之间）
                if (scriptStart > lastEnd) {
                    parts.push({ start: lastEnd, end: scriptStart, content: source.substring(lastEnd, scriptStart) });
                }
                // 转换 script
                const originalScript = scriptMatch[1];
                const transformedScript = this.transformJavaScript(originalScript, translations);
                parts.push({
                    start: scriptStart,
                    end: scriptEnd,
                    content: `<script>${transformedScript}</script>`
                });
                lastEnd = scriptEnd;
            }
            // script 之后的内容（包括 style 等）
            if (lastEnd < source.length) {
                parts.push({ start: lastEnd, end: source.length, content: source.substring(lastEnd) });
            }
            // 重组文件
            return parts.map(p => p.content).join('');
        }
        catch (error) {
            console.error('转换Vue文件失败:', error);
            return source;
        }
    }
    /**
     * 转换 Vue 模板中的中文文本
     */
    transformVueTemplate(template, translations) {
        let transformedTemplate = template;
        // 1. 处理Vue插值表达式中的字符串 {{ '中文' }} -> {{ $t('中文') }}
        const interpolationRegex = /\{\{\s*'([^']*[\u4e00-\u9fff][^']*)'\s*\}\}/g;
        transformedTemplate = transformedTemplate.replace(interpolationRegex, (match, chineseText) => {
            if (translations[chineseText]) {
                return `{{ $t('${chineseText}') }}`;
            }
            return match;
        });
        // 2. 处理Vue插值表达式中的双引号字符串 {{ "中文" }} -> {{ $t("中文") }}
        const doubleQuoteInterpolationRegex = /\{\{\s*"([^"]*[\u4e00-\u9fff][^"]*)"\s*\}\}/g;
        transformedTemplate = transformedTemplate.replace(doubleQuoteInterpolationRegex, (match, chineseText) => {
            if (translations[chineseText]) {
                return `{{ $t("${chineseText}") }}`;
            }
            return match;
        });
        // 3. 处理HTML标签间的直接中文文本，包括与Vue表达式混合的情况
        // 处理 >中文{{ expr }}< 和 >中文< 的情况
        const mixedTextRegex = />([^<]*[\u4e00-\u9fff][^<]*?)(\{\{[^}]*\}\}|<)/g;
        transformedTemplate = transformedTemplate.replace(mixedTextRegex, (match, chineseText, following) => {
            const trimmedText = chineseText.trim();
            if (trimmedText && translations[trimmedText] && !trimmedText.includes('{{')) {
                return `>{{ $t('${trimmedText}') }}${following}`;
            }
            return match;
        });
        // 处理纯文本情况 >中文<
        const directTextRegex = />([^<]*[\u4e00-\u9fff][^<]*)</g;
        // 处理形如 {{ expr }} 中文  (插值表达式后紧跟纯中文) 的场景
        const interpolationThenChineseRegex = />\s*((?:\{\{[^}]+\}\}\s*)+)([\u4e00-\u9fff][^<]*)</g;
        transformedTemplate = transformedTemplate.replace(interpolationThenChineseRegex, (match, interpPart, chinesePart) => {
            const pureChinese = chinesePart.trim();
            if (!pureChinese || pureChinese.includes('{{') || pureChinese.includes('$t(')) {
                return match; // 已处理或包含再次插值，跳过
            }
            // 保留原有插值尾部空白（interpPart 已含结尾空白），若无空白则补一个
            const needsSpace = !/\s$/.test(interpPart);
            const space = needsSpace ? ' ' : '';
            console.log(`Vue Template: 转换插值后中文 ${pureChinese} -> {{ $t('${pureChinese}') }}`);
            // 重要：补回匹配中被消耗的 < 以保持后续关闭标签，如 </p>
            return `>${interpPart}${space}{{ $t('${pureChinese}') }}<`;
        });
        transformedTemplate = transformedTemplate.replace(directTextRegex, (match, chineseText) => {
            const trimmedText = chineseText.trim();
            if (trimmedText && translations[trimmedText] && !trimmedText.includes('{{') && !trimmedText.includes('$t(')) {
                return `>{{ $t('${trimmedText}') }}<`;
            }
            return match;
        });
        // 4. 处理属性中的中文字符串：静态属性值含中文，转换为绑定并包裹 $t()
        // 允许 label / title / placeholder / alt / aria-label 等
        // 4. 属性中文包裹：仅处理纯文本（不含引号嵌套/JS操作符/?:等表达式）
        const attributeRegex = /([:@]?[A-Za-z_:][-A-Za-z0-9_:.]*)=("|')([^"'\n\r{}<>]*?[\u4e00-\u9fff][^"'\n\r{}<>]*?)(\2)/g; // 仅匹配不含花括号/插值的纯文本属性
        transformedTemplate = transformedTemplate.replace(attributeRegex, (match, attrName, quote, rawText) => {
            if (match.includes('$t('))
                return match;
            const pureName = attrName.replace(/^[:@]/, '');
            if (['class', 'id', 'style'].includes(pureName))
                return match;
            // 跳过包含 JS 表达式片段的静态值（防止 shouldpaymoney>0?'免费放行':'紧急放行' 被整体当成纯文本）
            if (/[?:]/.test(rawText) || /['"].+['"].+['"]/.test(rawText))
                return match; // 含三目或多引号串跳过
            if (/\b(if|return|function|=>)\b/.test(rawText))
                return match;
            const safeText = rawText.trim();
            // 已经是绑定：:attr="..." => 保留冒号，只替换内容为 $t('...')
            if (attrName.startsWith(':')) {
                return `${attrName}="$t('${safeText}')"`;
            }
            // 避免错误处理事件监听（@click等），只处理非事件（不以 @ 开头）
            if (attrName.startsWith('@'))
                return match;
            return `:${attrName}="$t('${safeText}')"`;
        });
        return transformedTemplate;
    }
    /**
     * 转义正则表达式特殊字符
     */
    escapeRegex(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    /**
     * 检测源代码的代码风格
     */
    detectCodeStyle(source) {
        // 检测分号使用情况 - 更准确的检测
        const semicolonRegex = /[;}]\s*$/gm;
        const statementRegex = /^[\s]*(?:var|let|const|function|import|export|return)\s+.+$/gm;
        const semicolonMatches = source.match(semicolonRegex) || [];
        const statementMatches = source.match(statementRegex) || [];
        // 检测引号使用情况 - 排除模板字符串和注释
        const stringRegex = /(['"])[^'"]*\1/g;
        const stringMatches = source.match(stringRegex) || [];
        let singleQuoteCount = 0;
        let doubleQuoteCount = 0;
        for (const match of stringMatches) {
            if (match.startsWith("'")) {
                singleQuoteCount++;
            }
            else if (match.startsWith('"')) {
                doubleQuoteCount++;
            }
        }
        return {
            semicolons: statementMatches.length > 0 ? (semicolonMatches.length / statementMatches.length) > 0.3 : true,
            quotes: singleQuoteCount >= doubleQuoteCount ? 'single' : 'double'
        };
    }
    /**
     * 转换 JavaScript 代码
     */
    transformJavaScript(source, translations) {
        var _a, _b;
        try {
            // 使用用户配置的代码风格，如果没有配置则检测（分号始终禁用）
            const detected = this.detectCodeStyle(source);
            const codeStyle = {
                semicolons: false,
                quotes: this.options.quotes || detected.quotes
            };
            // 预判是否是 Vue 组件：简单启发式，包含 export default 且对象内有 data/methods/computed/mounted 等键
            const looksLikeVueComponent = /export\s+default\s+\{[\s\S]*?(data\s*\(|methods\s*:|computed\s*:|mounted\s*\()/m.test(source);
            // 解析阶段加入保护：调试模式下若解析失败直接跳过转换，返回原始源码以避免大量报错循环
            let ast;
            try {
                ast = parser.parse(source, {
                    sourceType: 'module',
                    plugins: ['jsx', 'typescript', 'decorators-legacy', 'classProperties', 'dynamicImport']
                });
            }
            catch (parseErr) {
                // 在 debugExtraction 或 debugHMR 模式下输出精简的跳过日志
                const debugEnabled = ((_a = this.options) === null || _a === void 0 ? void 0 : _a.debugHMR) || ((_b = this.options) === null || _b === void 0 ? void 0 : _b.debugExtraction);
                if (debugEnabled) {
                    console.log('[auto-i18n:parse] skip parse failure, return original source:', parseErr.message);
                }
                return source; // 直接返回原始代码，不再尝试转换
            }
            const self = this;
            (0, traverse_1.default)(ast, {
                CallExpression(path) {
                    const n = path.node;
                    if (t.isIdentifier(n.callee) && n.callee.name === '$t')
                        return;
                    if (t.isMemberExpression(n.callee) && t.isIdentifier(n.callee.property) && n.callee.property.name === '$t')
                        return;
                },
                StringLiteral(path) {
                    var _a;
                    const { node, parent } = path;
                    if (!translations[node.value])
                        return; // 必须在翻译Map中才包裹
                    // skip object property keys
                    if (t.isObjectProperty(parent) && parent.key === node)
                        return;
                    if (t.isObjectMethod(parent) && parent.key === node)
                        return;
                    if (t.isImportDeclaration(parent) || ((_a = path.parentPath) === null || _a === void 0 ? void 0 : _a.isImportDeclaration()))
                        return;
                    if (self.isInI18nCall(path, self.options.functionName || '$t'))
                        return;
                    // 跳过作为比较判定值的中文字符串：避免改变业务逻辑 (例如 url !== '查询视频播放地址失败')
                    if (parent && t.isBinaryExpression(parent) && ['==', '===', '!=', '!=='].includes(parent.operator)) {
                        // 如果当前字面量是比较两侧之一，保持原样
                        return;
                    }
                    // 跳过 Vue 组件的 name 属性值（export default { name: '组件名' }）
                    if (t.isObjectProperty(parent) && t.isIdentifier(parent.key, { name: 'name' })) {
                        // 检查是否在 export default 中
                        let current = path.parentPath;
                        while (current) {
                            if (current.isExportDefaultDeclaration()) {
                                return; // 跳过组件名
                            }
                            current = current.parentPath;
                        }
                    }
                    // 跳过看起来像正则表达式的字符串
                    if (self.looksLikeRegexString(node.value)) {
                        return;
                    }
                    // 重新使用已计算的 inData/inProps
                    const inData = self.isInDataFunction(path);
                    const inProps = self.isInPropsDefault(path);
                    const inVueMethod = self.isInVueComponentContext(path) && !inData && !inProps;
                    let callExpr;
                    if (inProps || inData) {
                        const callee = self.buildCalleeFromDotted(self.options.globalFunctionName || 'i18n.t');
                        callExpr = t.callExpression(callee, [t.stringLiteral(node.value)]);
                    }
                    else if (inVueMethod) {
                        callExpr = t.callExpression(t.memberExpression(t.thisExpression(), t.identifier(self.options.functionName || '$t')), [t.stringLiteral(node.value)]);
                    }
                    else if (!looksLikeVueComponent) {
                        // 纯 JS 文件或非 Vue 组件上下文：统一使用全局 i18n.t
                        const callee = self.buildCalleeFromDotted(self.options.globalFunctionName || 'i18n.t');
                        callExpr = t.callExpression(callee, [t.stringLiteral(node.value)]);
                    }
                    else {
                        // Vue 但不在 methods/data/props default 中的普通脚本片段：使用 $t
                        callExpr = t.callExpression(t.identifier(self.options.functionName || '$t'), [t.stringLiteral(node.value)]);
                    }
                    path.replaceWith(callExpr);
                },
                JSXAttribute(path) {
                    const { node } = path;
                    if (!t.isStringLiteral(node.value))
                        return;
                    const raw = node.value.value;
                    if (!translations[raw])
                        return;
                    // 属性值若处于比较中几乎不会出现，这里不特殊处理；如未来出现可按需扩展
                    const inData = self.isInDataFunction(path);
                    const inProps = self.isInPropsDefault(path);
                    const inVueMethod = self.isInVueComponentContext(path) && !inData && !inProps;
                    let callExpr;
                    if (inProps || inData) {
                        const callee = self.buildCalleeFromDotted(self.options.globalFunctionName || 'i18n.t');
                        callExpr = t.callExpression(callee, [t.stringLiteral(raw)]);
                    }
                    else if (inVueMethod) {
                        callExpr = t.callExpression(t.memberExpression(t.thisExpression(), t.identifier(self.options.functionName || '$t')), [t.stringLiteral(raw)]);
                    }
                    else if (!looksLikeVueComponent) {
                        const callee = self.buildCalleeFromDotted(self.options.globalFunctionName || 'i18n.t');
                        callExpr = t.callExpression(callee, [t.stringLiteral(raw)]);
                    }
                    else {
                        callExpr = t.callExpression(t.identifier(self.options.functionName || '$t'), [t.stringLiteral(raw)]);
                    }
                    node.value = t.jSXExpressionContainer(callExpr);
                },
                JSXText(path) {
                    const text = path.node.value.trim();
                    if (!text || !translations[text])
                        return;
                    const inData = self.isInDataFunction(path);
                    const inProps = self.isInPropsDefault(path);
                    const inVueMethod = self.isInVueComponentContext(path) && !inData && !inProps;
                    let callExpr;
                    if (inProps || inData) {
                        const callee = self.buildCalleeFromDotted(self.options.globalFunctionName || 'i18n.t');
                        callExpr = t.callExpression(callee, [t.stringLiteral(text)]);
                    }
                    else if (inVueMethod) {
                        callExpr = t.callExpression(t.memberExpression(t.thisExpression(), t.identifier(self.options.functionName || '$t')), [t.stringLiteral(text)]);
                    }
                    else if (!looksLikeVueComponent) {
                        const callee = self.buildCalleeFromDotted(self.options.globalFunctionName || 'i18n.t');
                        callExpr = t.callExpression(callee, [t.stringLiteral(text)]);
                    }
                    else {
                        callExpr = t.callExpression(t.identifier(self.options.functionName || '$t'), [t.stringLiteral(text)]);
                    }
                    path.replaceWith(t.jSXExpressionContainer(callExpr));
                }
            });
            const output = (0, generator_1.default)(ast, {
                retainLines: true,
                compact: false,
                semicolons: false,
                quotes: codeStyle.quotes,
                jsescOption: { minimal: true, quotes: codeStyle.quotes }
            }, source);
            // 保留原文件末尾换行（若存在）
            const endsWithNewline = /\n$/.test(source);
            let result = output.code;
            if (endsWithNewline && !/\n$/.test(result)) {
                result += '\n';
            }
            return result;
        }
        catch (error) {
            console.error('转换代码失败:', error);
            return source; // 发生错误时返回原始代码
        }
    }
    /**
     * 检查字符串是否看起来像正则表达式
     * 用于避免转换正则表达式字符串中的中文
     */
    looksLikeRegexString(str) {
        // 1. 以 / 开头和结尾，明显是正则字面量字符串形式
        if (/^\/.*\/[gimsuvy]*$/.test(str)) {
            return true;
        }
        // 2. 包含正则特殊字符和模式
        const regexPatterns = [
            /\[.*\]/,
            /\{\d+,?\d*\}/,
            /\\[dDwWsS]/,
            /\(\?:/,
            /\^|\$/, // 锚点
        ];
        let regexFeatureCount = 0;
        for (const pattern of regexPatterns) {
            if (pattern.test(str)) {
                regexFeatureCount++;
            }
        }
        // 如果包含 2 个或以上正则特征，认为是正则表达式
        if (regexFeatureCount >= 2) {
            return true;
        }
        // 3. 包含大量转义字符（超过3个 \）
        const escapeCount = (str.match(/\\/g) || []).length;
        if (escapeCount > 3) {
            return true;
        }
        return false;
    }
    /**
     * 检查节点是否在Vue组件上下文中（需要使用this.$t）
     */
    isInVueComponentContext(path) {
        let parent = path.parentPath;
        while (parent) {
            // 检查是否在 props 定义中，props 中不能使用 this.$t
            if (parent.isObjectProperty() && t.isIdentifier(parent.node.key) && parent.node.key.name === 'props') {
                return false;
            }
            // 检查是否在 props 的 default 值中
            if (this.isInPropsDefault(parent)) {
                return false;
            }
            // 检查是否在对象方法中（Vue组件的methods、computed等）
            if (parent.isObjectMethod() || parent.isFunctionExpression() || parent.isArrowFunctionExpression()) {
                // 检查是否在Vue组件的选项对象中
                let objectParent = parent.parentPath;
                while (objectParent) {
                    if (objectParent.isObjectExpression()) {
                        // 查找可能的Vue组件特征
                        const properties = objectParent.node.properties;
                        const hasVueProperties = properties.some((prop) => {
                            if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
                                const keyName = prop.key.name;
                                return ['data', 'methods', 'computed', 'watch', 'mounted', 'created', 'beforeMount', 'beforeDestroy', 'destroyed'].includes(keyName);
                            }
                            return false;
                        });
                        if (hasVueProperties) {
                            return true;
                        }
                    }
                    objectParent = objectParent.parentPath;
                }
            }
            // 检查是否在Vue组件的export default中
            if (parent.isExportDefaultDeclaration()) {
                return true;
            }
            parent = parent.parentPath;
        }
        return false;
    }
    /**
     * 检查是否位于 data() 方法返回对象的上下文（此处需使用全局 i18n.t）
     */
    isInDataFunction(path) {
        let parent = path.parentPath;
        while (parent) {
            if (parent.isObjectMethod && parent.isObjectMethod()) {
                const m = parent.node;
                if (t.isIdentifier(m.key) && m.key.name === 'data') {
                    return true;
                }
            }
            parent = parent.parentPath;
        }
        return false;
    }
    /**
     * 检查是否在 props 的 default 值中
     */
    isInPropsDefault(path) {
        // 向上找最近的 default ObjectProperty
        let current = path;
        let defaultProp = null;
        while (current) {
            if (current.isObjectProperty && current.isObjectProperty() && t.isIdentifier(current.node.key) && current.node.key.name === 'default') {
                defaultProp = current;
                break;
            }
            current = current.parentPath;
        }
        if (!defaultProp)
            return false;
        // 确认当前节点位于 default 的 value 子树中
        // （已通过向上链找到 default，视为成立）
        // 继续向上查找 props 属性
        let scan = defaultProp.parentPath; // ObjectExpression (prop define body)
        while (scan) {
            if (scan.isObjectProperty && scan.isObjectProperty() && t.isIdentifier(scan.node.key) && scan.node.key.name === 'props') {
                return true;
            }
            scan = scan.parentPath;
        }
        return false;
    }
    /**
     * 检查节点是否已经在i18n函数调用中
     */
    isInI18nCall(path, functionName) {
        let parent = path.parentPath;
        while (parent) {
            if (parent.isCallExpression()) {
                const callee = parent.node.callee;
                if (t.isIdentifier(callee) && callee.name === functionName)
                    return true;
                if (t.isMemberExpression(callee) && t.isIdentifier(callee.property) && callee.property.name === functionName)
                    return true;
                if (this.options.globalFunctionName && this.matchesGlobalFunctionChain(callee, this.options.globalFunctionName))
                    return true;
            }
            parent = parent.parentPath;
        }
        return false;
    }
    buildCalleeFromDotted(dotted) {
        const parts = dotted.split('.');
        let expr = t.identifier(parts[0]);
        for (let i = 1; i < parts.length; i++) {
            expr = t.memberExpression(expr, t.identifier(parts[i]));
        }
        return expr;
    }
    matchesGlobalFunctionChain(callee, dotted) {
        const parts = dotted.split('.');
        const collected = [];
        let cur = callee;
        // 向内剥离 memberExpression，逆向收集
        while (t.isMemberExpression(cur)) {
            if (t.isIdentifier(cur.property)) {
                collected.unshift(cur.property.name);
            }
            else {
                return false;
            }
            if (t.isIdentifier(cur.object)) {
                collected.unshift(cur.object.name);
                break;
            }
            else {
                cur = cur.object;
            }
        }
        return collected.join('.') === parts.join('.');
    }
}
exports.Transformer = Transformer;
