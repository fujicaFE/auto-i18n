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
exports.ChineseExtractor = void 0;
const parser = __importStar(require("@babel/parser"));
const traverse_1 = __importDefault(require("@babel/traverse"));
const t = __importStar(require("@babel/types"));
const types_1 = require("../types");
class ChineseExtractor {
    constructor(options = {}) {
        this.options = Object.assign({ ignoreComments: true }, options);
    }
    /**
     * 从Vue文件中提取所有中文字符串
     * @param source Vue文件源代码
     */
    extractFromVueFile(source) {
        const templateMatch = source.match(/<template>([\s\S]*?)<\/template>/i);
        const scriptMatch = source.match(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/i);
        const results = [];
        if (templateMatch) {
            // 使用专门的模板解析器处理HTML模板
            const templateTexts = this.extractFromTemplate(templateMatch[1]);
            results.push(...templateTexts);
        }
        if (scriptMatch) {
            // 使用JavaScript AST解析器处理脚本部分
            const scriptTexts = this.extract(scriptMatch[2]);
            results.push(...scriptTexts);
        }
        // 后处理：过滤掉包含HTML标记或过长的文本
        return results.filter(text => this.isValidChineseText(text));
    }
    /**
     * 检查是否为有效的中文文本（排除HTML标记等）
     */
    isValidChineseText(text) {
        // 排除包含HTML标记的文本
        if (/<[^>]+>/.test(text) || /&\w+;/.test(text)) {
            return false;
        }
        // 排除HTML注释
        if (/<!--.*?-->/.test(text)) {
            return false;
        }
        // 注意：不再过滤已被$t()包装的文本，因为可能翻译文件丢失
        // 需要确保这些字符串在翻译文件中存在
        // 排除包含Vue插值表达式的文本（除非是纯中文部分）
        if (/\{\{.*?\}\}/.test(text)) {
            // 检查是否整个都是插值表达式
            if (text.trim().startsWith('{{') && text.trim().endsWith('}}')) {
                return false;
            }
            // 对于包含插值的文本，允许如果中文部分足够多
            const withoutInterpolation = text.replace(/\{\{.*?\}\}/g, '').trim();
            if (withoutInterpolation.length < 2 || !types_1.CHINESE_REGEX.test(withoutInterpolation)) {
                return false;
            }
        }
        // 排除包含大量特殊字符的文本
        if (/[\r\n\t]{2,}/.test(text)) {
            return false;
        }
        // 排除过长的文本（可能是整段HTML）
        if (text.length > 150) {
            return false;
        }
        // 排除主要包含英文字母和符号的文本
        const chineseCharCount = (text.match(/[\u4e00-\u9fff]/g) || []).length;
        const totalLength = text.length;
        if (chineseCharCount / totalLength < 0.1) {
            return false;
        }
        return true;
    }
    /**
     * 从Vue模板中提取中文文本
     * @param template Vue模板HTML代码
     */
    extractFromTemplate(template) {
        const chineseTexts = new Set();
        // 1. 提取标签之间的纯文本内容（包括插值表达式）
        const textContentRegex = />([^<]*[\u4e00-\u9fff][^<]*)</g;
        let match;
        while ((match = textContentRegex.exec(template)) !== null) {
            const text = match[1].trim();
            if (text && types_1.CHINESE_REGEX.test(text) && !text.includes('\r') && !text.includes('\n')) {
                // 跳过已经被$t()包装的文本
                if (/\$t\s*\(/.test(text) || /\{\{\s*\$t\s*\(/.test(text)) {
                    continue;
                }
                // 如果包含插值语法，尝试提取前面的纯中文部分
                const beforeInterpolation = text.split('{{')[0].trim();
                if (beforeInterpolation && types_1.CHINESE_REGEX.test(beforeInterpolation) && beforeInterpolation.length > 0) {
                    chineseTexts.add(beforeInterpolation);
                }
                // 进一步清理：移除Vue插值语法和多余空白
                const cleanText = text.replace(/\{\{.*?\}\}/g, '').replace(/\s+/g, ' ').trim();
                if (cleanText && cleanText.length > 0 && types_1.CHINESE_REGEX.test(cleanText)) {
                    chineseTexts.add(cleanText);
                }
                // 同时提取原始文本（可能包含插值），但排除$t()包装的内容
                if (text !== cleanText && text.length < 100 && !/\$t\s*\(/.test(text)) { // 避免过长的文本和$t()函数
                    chineseTexts.add(text);
                }
            }
        }
        // 2. 提取HTML属性值中的中文
        const attrValueRegex = /(?:title|placeholder|alt|aria-label|data-[\w-]+)\s*=\s*["']([^"']*[\u4e00-\u9fff][^"']*)["']/gi;
        while ((match = attrValueRegex.exec(template)) !== null) {
            const text = match[1].trim();
            if (text && types_1.CHINESE_REGEX.test(text)) {
                chineseTexts.add(text);
            }
        }
        // 3. 提取Vue指令中的字符串字面量
        const vueDirectiveRegex = /(?:v-bind:|\:)(\w+)\s*=\s*["']'([^']*[\u4e00-\u9fff][^']*)'["']/gi;
        while ((match = vueDirectiveRegex.exec(template)) !== null) {
            const text = match[2].trim();
            if (text && types_1.CHINESE_REGEX.test(text)) {
                chineseTexts.add(text);
            }
        }
        // 4. 从字符串字面量中提取中文（只在引号内）
        const stringLiteralRegex = /['"]([^'"]*[\u4e00-\u9fff][^'"]{0,50})['"]/g;
        while ((match = stringLiteralRegex.exec(template)) !== null) {
            const text = match[1].trim();
            if (text && types_1.CHINESE_REGEX.test(text) && !text.includes('<') && !text.includes('>')) {
                chineseTexts.add(text);
            }
        }
        // 5. 从插值表达式中提取字符串字面量（排除$t()函数）
        const interpolationBlocks = template.match(/\{\{[^}]+\}\}/g);
        if (interpolationBlocks) {
            for (const block of interpolationBlocks) {
                // 跳过已经使用$t()的插值表达式
                if (/\$t\s*\(/.test(block)) {
                    continue;
                }
                const stringInInterpolation = /['"]([^'"]*[\u4e00-\u9fff][^'"]*)['"]/g;
                let interpolationMatch;
                while ((interpolationMatch = stringInInterpolation.exec(block)) !== null) {
                    const text = interpolationMatch[1].trim();
                    if (text && types_1.CHINESE_REGEX.test(text)) {
                        chineseTexts.add(text);
                    }
                }
            }
        }
        return Array.from(chineseTexts);
    }
    /**
     * 从JS文件中提取所有中文字符串
     * @param source JS文件源代码
     */
    extractFromJsFile(source) {
        return this.extract(source);
    }
    /**
     * 从源代码中提取所有中文字符串
     * @param source 源代码
     * @param filePath 文件路径（可选，用于日志）
     */
    extract(source, filePath) {
        const chineseTexts = new Set();
        try {
            // 解析源代码为AST
            const ast = parser.parse(source, {
                sourceType: 'unambiguous',
                allowImportExportEverywhere: true,
                allowReturnOutsideFunction: true,
                strictMode: false,
                plugins: [
                    'jsx',
                    'typescript',
                    'decorators-legacy',
                    'classProperties',
                    'objectRestSpread',
                    'asyncGenerators',
                    'functionBind',
                    'exportDefaultFrom',
                    'exportNamespaceFrom',
                    'dynamicImport',
                    'nullishCoalescingOperator',
                    'optionalChaining',
                    'bigInt',
                    'optionalCatchBinding',
                    'numericSeparator',
                    'importMeta',
                    'privateIn',
                    'topLevelAwait',
                    'v8intrinsic'
                ],
            });
            // 遍历AST寻找中文字符串
            (0, traverse_1.default)(ast, {
                // 处理字符串字面量
                StringLiteral: (path) => {
                    const { node, parent } = path;
                    // 忽略注释中的中文
                    if (this.options.ignoreComments && this.isInComment(path)) {
                        return;
                    }
                    // 检查是否含有中文
                    if (types_1.CHINESE_REGEX.test(node.value)) {
                        chineseTexts.add(node.value);
                    }
                },
                // 处理模板字面量
                TemplateLiteral: (path) => {
                    const { node } = path;
                    // 忽略注释中的中文
                    if (this.options.ignoreComments && this.isInComment(path)) {
                        return;
                    }
                    // 检查模板字符串中的静态部分是否含有中文
                    for (const quasi of node.quasis) {
                        if (types_1.CHINESE_REGEX.test(quasi.value.raw)) {
                            // 对于模板字面量，我们只提取其中包含中文的部分
                            const chineseSegments = this.extractChineseSegments(quasi.value.raw);
                            for (const segment of chineseSegments) {
                                if (segment.trim()) {
                                    chineseTexts.add(segment);
                                }
                            }
                        }
                    }
                },
                // 处理JSX文本
                JSXText: (path) => {
                    const { node } = path;
                    // 检查JSX文本是否含有中文
                    if (types_1.CHINESE_REGEX.test(node.value)) {
                        const trimmed = node.value.trim();
                        if (trimmed) {
                            // 对于JSX文本，我们可能需要分割成句子
                            const chineseSegments = this.extractChineseSegments(trimmed);
                            for (const segment of chineseSegments) {
                                if (segment.trim()) {
                                    chineseTexts.add(segment);
                                }
                            }
                        }
                    }
                },
                // 处理JSX属性值
                JSXAttribute: (path) => {
                    const { node } = path;
                    // 检查JSX属性值是否为字符串字面量并且含有中文
                    if (t.isStringLiteral(node.value) && types_1.CHINESE_REGEX.test(node.value.value)) {
                        chineseTexts.add(node.value.value);
                    }
                }
            });
        }
        catch (error) {
            console.error(`解析文件失败 ${filePath || '未知文件'}:`, error);
            // 当AST解析失败时，使用简单的正则表达式方法作为回退
            return this.extractByRegex(source);
        }
        return Array.from(chineseTexts);
    }
    /**
     * 使用正则表达式方法提取中文（回退方案）
     */
    extractByRegex(source) {
        const chineseTexts = new Set();
        // 匹配字符串字面量中的中文
        const stringMatches = source.match(/['"`]([^'"`]*[\u4e00-\u9fff]+[^'"`]*)['"`]/g);
        if (stringMatches) {
            for (const match of stringMatches) {
                const content = match.slice(1, -1); // 去掉引号
                if (types_1.CHINESE_REGEX.test(content)) {
                    chineseTexts.add(content);
                }
            }
        }
        // 匹配模板字符串中的中文
        const templateMatches = source.match(/`([^`]*[\u4e00-\u9fff]+[^`]*)`/g);
        if (templateMatches) {
            for (const match of templateMatches) {
                const content = match.slice(1, -1); // 去掉反引号
                const segments = this.extractChineseSegments(content);
                for (const segment of segments) {
                    if (segment.trim()) {
                        chineseTexts.add(segment);
                    }
                }
            }
        }
        return Array.from(chineseTexts);
    }
    /**
     * 检查节点是否在注释中
     */
    isInComment(path) {
        // 这是一个简化的实现，实际上需要检查AST位置和注释的位置
        // 在实际使用中，可能需要更复杂的算法来准确判断
        // 此处简单返回false，后续可以根据需要完善
        return false;
    }
    /**
     * 从文本中提取中文片段
     */
    extractChineseSegments(text) {
        // 简单实现：将文本按照非中文字符分割
        // 这个实现可能不够精确，实际应用中可能需要更复杂的分词算法
        const segments = [];
        let currentSegment = '';
        let hasChinese = false;
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const isChinese = types_1.CHINESE_REGEX.test(char);
            if (isChinese) {
                hasChinese = true;
                currentSegment += char;
            }
            else {
                // 非中文字符，如果是空格或标点，并且当前片段不为空，则继续添加
                if ((char === ' ' || /[\.,\?!;:，。？！；：]/.test(char)) && currentSegment) {
                    currentSegment += char;
                }
                else {
                    // 如果当前片段不为空且含有中文，保存它
                    if (currentSegment && hasChinese) {
                        segments.push(currentSegment.trim());
                    }
                    // 重置
                    currentSegment = '';
                    hasChinese = false;
                }
            }
        }
        // 处理最后一个片段
        if (currentSegment && hasChinese) {
            segments.push(currentSegment.trim());
        }
        return segments;
    }
}
exports.ChineseExtractor = ChineseExtractor;
