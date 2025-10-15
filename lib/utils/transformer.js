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
        this.options = Object.assign({ functionName: '$t', semicolons: false, quotes: 'single', globalFunctionName: 'i18n.global.t' }, options);
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
            // 简单的正则匹配来分离 template 和 script 部分
            const templateMatch = source.match(/<template[^>]*>([\s\S]*?)<\/template>/);
            const scriptMatch = source.match(/<script[^>]*>([\s\S]*?)<\/script>/);
            const styleMatch = source.match(/<style[^>]*>([\s\S]*?)<\/style>/g);
            let transformedSource = source;
            // 处理 template 部分
            if (templateMatch) {
                const originalTemplate = templateMatch[1];
                const transformedTemplate = this.transformVueTemplate(originalTemplate, translations);
                if (transformedTemplate !== originalTemplate) {
                    transformedSource = transformedSource.replace(templateMatch[0], `<template>${transformedTemplate}</template>`);
                }
            }
            // 处理 script 部分
            if (scriptMatch) {
                const originalScript = scriptMatch[1];
                const transformedScript = this.transformJavaScript(originalScript, translations);
                if (transformedScript !== originalScript) {
                    transformedSource = transformedSource.replace(scriptMatch[0], `<script>${transformedScript}</script>`);
                }
            }
            return transformedSource;
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
                console.log(`Vue Template: 转换插值表达式 {{ '${chineseText}' }} -> {{ $t('${chineseText}') }}`);
                return `{{ $t('${chineseText}') }}`;
            }
            return match;
        });
        // 2. 处理Vue插值表达式中的双引号字符串 {{ "中文" }} -> {{ $t("中文") }}
        const doubleQuoteInterpolationRegex = /\{\{\s*"([^"]*[\u4e00-\u9fff][^"]*)"\s*\}\}/g;
        transformedTemplate = transformedTemplate.replace(doubleQuoteInterpolationRegex, (match, chineseText) => {
            if (translations[chineseText]) {
                console.log(`Vue Template: 转换插值表达式 {{ "${chineseText}" }} -> {{ $t("${chineseText}") }}`);
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
                console.log(`Vue Template: 转换混合文本 >${trimmedText}... -> >{{ $t('${trimmedText}') }}...`);
                return `>{{ $t('${trimmedText}') }}${following}`;
            }
            return match;
        });
        // 处理纯文本情况 >中文<
        const directTextRegex = />([^<]*[\u4e00-\u9fff][^<]*)</g;
        transformedTemplate = transformedTemplate.replace(directTextRegex, (match, chineseText) => {
            const trimmedText = chineseText.trim();
            if (trimmedText && translations[trimmedText] && !trimmedText.includes('{{') && !trimmedText.includes('$t(')) {
                console.log(`Vue Template: 转换直接文本 >${trimmedText}< -> >{{ $t('${trimmedText}') }}<`);
                return `>{{ $t('${trimmedText}') }}<`;
            }
            return match;
        });
        // 4. 处理属性中的中文字符串
        const attributeRegex = /(\w+)=["']([^"']*[\u4e00-\u9fff][^"']*)["']/g;
        transformedTemplate = transformedTemplate.replace(attributeRegex, (match, attrName, chineseText) => {
            // 跳过一些特殊属性
            if (['class', 'id', 'style'].includes(attrName)) {
                return match;
            }
            if (translations[chineseText]) {
                console.log(`Vue Template: 转换属性 ${attrName}="${chineseText}" -> :${attrName}="$t('${chineseText}')"`);
                return `:${attrName}="$t('${chineseText}')"`;
            }
            return match;
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
        try {
            // 使用用户配置的代码风格，如果没有配置则检测
            const codeStyle = {
                semicolons: this.options.semicolons !== undefined ? this.options.semicolons : this.detectCodeStyle(source).semicolons,
                quotes: this.options.quotes || this.detectCodeStyle(source).quotes
            };
            // 解析源代码为AST
            const ast = parser.parse(source, {
                sourceType: 'module',
                plugins: [
                    'jsx',
                    'typescript',
                    'decorators-legacy',
                    'classProperties',
                    'dynamicImport',
                ],
            });
            // 检查是否需要转换
            let hasI18nUsage = false;
            // 遍历AST寻找中文字符串并替换
            const self = this; // 保存this上下文以避免在traverse回调中丢失
            (0, traverse_1.default)(ast, {
                // 检查是否已有$t函数的使用
                CallExpression(path) {
                    const { node } = path;
                    if (t.isMemberExpression(node.callee) &&
                        t.isThisExpression(node.callee.object) &&
                        t.isIdentifier(node.callee.property) &&
                        node.callee.property.name === '$t') {
                        hasI18nUsage = true;
                    }
                    else if (t.isIdentifier(node.callee) &&
                        node.callee.name === '$t') {
                        hasI18nUsage = true;
                    }
                },
                // 替换字符串字面量
                StringLiteral(path) {
                    const { node, parent } = path;
                    // 检查是否是已知的中文字符串
                    if (translations[node.value]) {
                        // 不处理import语句中的字符串
                        if (t.isImportDeclaration(parent) || path.parentPath && path.parentPath.isImportDeclaration()) {
                            return;
                        }
                        // 不处理已经在i18n调用中的字符串
                        if (self.isInI18nCall(path, self.options.functionName || '$t')) {
                            return;
                        }
                        // 检查是否在Vue组件上下文中（方法、计算属性等）
                        const shouldUseThis = self.isInVueComponentContext(path);
                        const isInProps = self.isInPropsDefault(path);
                        let i18nCall;
                        if (isInProps) {
                            const callee = self.buildCalleeFromDotted(self.options.globalFunctionName || 'i18n.global.t');
                            i18nCall = t.callExpression(callee, [t.stringLiteral(node.value)]);
                        }
                        else if (shouldUseThis) {
                            i18nCall = t.callExpression(t.memberExpression(t.thisExpression(), t.identifier(self.options.functionName || '$t')), [t.stringLiteral(node.value)]);
                        }
                        else {
                            // 普通上下文：优先使用全局函数（如果配置了），否则使用本地函数名
                            if (self.options.globalFunctionName) {
                                const callee = self.buildCalleeFromDotted(self.options.globalFunctionName);
                                i18nCall = t.callExpression(callee, [t.stringLiteral(node.value)]);
                            }
                            else {
                                i18nCall = t.callExpression(t.identifier(self.options.functionName || '$t'), [t.stringLiteral(node.value)]);
                            }
                        }
                        path.replaceWith(i18nCall);
                        hasI18nUsage = true;
                    }
                },
                // 处理JSX属性中的中文字符串
                JSXAttribute(path) {
                    const { node } = path;
                    if (t.isStringLiteral(node.value) && translations[node.value.value]) {
                        // 检查是否需要使用this
                        const shouldUseThis = self.isInVueComponentContext(path);
                        // 创建合适的函数调用
                        const i18nCall = shouldUseThis
                            ? t.callExpression(t.memberExpression(t.thisExpression(), t.identifier(self.options.functionName || '$t')), [t.stringLiteral(node.value.value)])
                            : t.callExpression(t.identifier(self.options.functionName || '$t'), [t.stringLiteral(node.value.value)]);
                        // 用JSXExpressionContainer包装
                        const jsxExpr = t.jSXExpressionContainer(i18nCall);
                        // 替换属性值
                        node.value = jsxExpr;
                        hasI18nUsage = true;
                    }
                },
                // 处理JSX文本中的中文
                JSXText(path) {
                    const { node } = path;
                    const text = node.value.trim();
                    if (text && translations[text]) {
                        // 检查是否需要使用this
                        const shouldUseThis = self.isInVueComponentContext(path);
                        // 创建合适的函数调用
                        const i18nCall = shouldUseThis
                            ? t.callExpression(t.memberExpression(t.thisExpression(), t.identifier(self.options.functionName || '$t')), [t.stringLiteral(text)])
                            : t.callExpression(t.identifier(self.options.functionName || '$t'), [t.stringLiteral(text)]);
                        // 用JSXExpressionContainer包装
                        const jsxExpr = t.jSXExpressionContainer(i18nCall);
                        // 替换JSX文本
                        path.replaceWith(jsxExpr);
                        hasI18nUsage = true;
                    }
                }
            });
            // 生成代码，保持原始代码风格
            const output = (0, generator_1.default)(ast, {
                retainLines: true,
                compact: false,
                semicolons: codeStyle.semicolons,
                quotes: codeStyle.quotes,
                jsescOption: {
                    minimal: true,
                    quotes: codeStyle.quotes
                }
            }, source);
            return output.code;
        }
        catch (error) {
            console.error('转换代码失败:', error);
            return source; // 发生错误时返回原始代码
        }
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
