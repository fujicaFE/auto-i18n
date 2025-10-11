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
        this.options = Object.assign({ importStatement: "import { useI18n } from 'vue-i18n'", functionName: '$t' }, options);
    }
    /**
     * 转换源代码中的中文字符串为i18n调用
     * @param source 源代码
     * @param translations 翻译映射，source -> { locale -> text }
     */
    transform(source, translations) {
        try {
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
            // 检查是否需要添加import语句
            let hasI18nImport = false;
            let hasI18nUsage = false;
            // 遍历AST寻找中文字符串并替换
            (0, traverse_1.default)(ast, {
                // 检查是否已有i18n的import
                ImportDeclaration(path) {
                    const { node } = path;
                    if (node.source.value === 'vue-i18n') {
                        hasI18nImport = true;
                    }
                },
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
                        if (this.isInI18nCall(path, this.options.functionName || '$t')) {
                            return;
                        }
                        // 替换为$t函数调用
                        const i18nCall = t.callExpression(t.identifier(this.options.functionName || '$t'), [t.stringLiteral(node.value)]);
                        // 添加原文注释 - 由于TypeScript类型问题，暂时注释掉
                        // i18nCall.leadingComments = [{
                        //   type: 'CommentLine',
                        //   value: ` ${node.value}`
                        // }];
                        path.replaceWith(i18nCall);
                        hasI18nUsage = true;
                    }
                },
                // 处理JSX属性中的中文字符串
                JSXAttribute(path) {
                    const { node } = path;
                    if (t.isStringLiteral(node.value) && translations[node.value.value]) {
                        // 替换为JSX表达式，内部是$t函数调用
                        const i18nCall = t.callExpression(t.identifier(this.options.functionName || '$t'), [t.stringLiteral(node.value.value)]);
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
                        // 创建i18n函数调用
                        const i18nCall = t.callExpression(t.identifier(this.options.functionName || '$t'), [t.stringLiteral(text)]);
                        // 用JSXExpressionContainer包装
                        const jsxExpr = t.jSXExpressionContainer(i18nCall);
                        // 替换JSX文本
                        path.replaceWith(jsxExpr);
                        hasI18nUsage = true;
                    }
                }
            });
            // 如果有$t函数的使用但没有对应的import，添加import语句
            if (hasI18nUsage && !hasI18nImport && this.options.importStatement) {
                const importAst = parser.parse(this.options.importStatement, {
                    sourceType: 'module',
                });
                if (importAst.program.body.length > 0 && t.isImportDeclaration(importAst.program.body[0])) {
                    // 在文件开头插入import语句
                    ast.program.body.unshift(importAst.program.body[0]);
                }
            }
            // 生成代码
            const output = (0, generator_1.default)(ast, {
                retainLines: true,
                compact: false,
                jsescOption: {
                    minimal: true
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
     * 检查节点是否已经在i18n函数调用中
     */
    isInI18nCall(path, functionName) {
        let parent = path.parentPath;
        while (parent) {
            if (parent.isCallExpression() &&
                ((t.isIdentifier(parent.node.callee) && parent.node.callee.name === functionName) ||
                    (t.isMemberExpression(parent.node.callee) &&
                        t.isIdentifier(parent.node.callee.property) &&
                        parent.node.callee.property.name === functionName))) {
                return true;
            }
            parent = parent.parentPath;
        }
        return false;
    }
}
exports.Transformer = Transformer;
