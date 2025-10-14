"use strict";
/**
 * 代码分析器
 * 负责分析代码中的i18n模式和验证转换质量
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeAnalyzer = void 0;
class CodeAnalyzer {
    /**
     * 分析代码中的i18n函数调用模式
     */
    analyzeI18nPatterns(source) {
        console.log(`🔍 AutoI18nPlugin: 开始分析$t函数调用模式...`);
        // 搜索各种可能的$t调用模式
        const i18nPatterns = [
            /\$t\(/g,
            /\._t\(/g,
            /t\(/g,
            /this\.\$t\(/g,
            /\.locale/g,
            /"联系我们"/g,
            /'联系我们'/g, // 单引号版本
        ];
        i18nPatterns.forEach((pattern, index) => {
            const matches = source.match(pattern);
            if (matches) {
                console.log(`📝 AutoI18nPlugin: 模式 ${index + 1} (${pattern.source}) 找到 ${matches.length} 个匹配`);
                // 如果找到联系我们，显示上下文
                if (pattern.source.includes('联系我们')) {
                    this.extractContextAroundMatch(source, pattern, '联系我们相关代码');
                }
                // 如果找到$t调用，显示上下文
                if (pattern.source.includes('\\$t') || pattern.source.includes('_t')) {
                    this.extractContextAroundMatch(source, pattern, '$t函数调用');
                }
            }
        });
        // 分析Vue template编译后的特征
        this.analyzeVueTemplatePatterns(source);
    }
    /**
     * 分析Vue template编译模式
     */
    analyzeVueTemplatePatterns(source) {
        console.log(`🔍 AutoI18nPlugin: 分析Vue template编译模式...`);
        // Vue template编译后的模式
        const templatePatterns = [
            // Vue 2模式
            { pattern: /_s\(([^)]+)\)/g, name: '_s() toString函数' },
            { pattern: /_v\(([^)]+)\)/g, name: '_v() createTextVNode函数' },
            { pattern: /t\._t\(/g, name: 'this._t调用' },
            { pattern: /\$t\(/g, name: '$t调用' },
            // Vue 3模式
            { pattern: /_toDisplayString\(([^)]+)\)/g, name: '_toDisplayString' },
            { pattern: /_createTextVNode\(([^)]+)\)/g, name: '_createTextVNode' },
        ];
        templatePatterns.forEach((item, index) => {
            const matches = [];
            let match;
            item.pattern.lastIndex = 0;
            while ((match = item.pattern.exec(source)) !== null) {
                matches.push(match);
                if (matches.length >= 5)
                    break; // 限制匹配数量
                if (!item.pattern.global)
                    break;
            }
            if (matches.length > 0) {
                console.log(`📋 AutoI18nPlugin: Vue模式 ${index + 1} (${item.name}) 找到 ${matches.length} 个匹配`);
            }
        });
    }
    /**
     * 提取匹配项周围的上下文
     */
    extractContextAroundMatch(source, pattern, description) {
        let match;
        let matchIndex = 0;
        pattern.lastIndex = 0; // 重置正则表达式的lastIndex
        while ((match = pattern.exec(source)) !== null && matchIndex < 3) {
            const start = Math.max(0, match.index - 100);
            const end = Math.min(source.length, match.index + match[0].length + 100);
            const context = source.substring(start, end);
            matchIndex++;
            // 防止无限循环
            if (!pattern.global)
                break;
        }
    }
    /**
     * 验证i18n转换是否成功
     */
    validateI18nTransformation(code) {
        const result = {
            hasI18nCalls: false,
            i18nCallCount: 0,
            patterns: {
                _s_$t: 0,
                _v_$t: 0,
                direct_$t: 0,
                vm_$t: 0 // _vm.$t("...") - Vue实例调用
            },
            samples: []
        };
        // 模式1: _s(e.$t("...")) 或 _s(_vm.$t("..."))
        const _s_$t_regex = /_s\([^)]*\$t\([^)]+\)\)/g;
        const _s_matches = code.match(_s_$t_regex) || [];
        result.patterns._s_$t = _s_matches.length;
        // 模式2: _v(e.$t("...")) 或 _v(_s(e.$t("...")))
        const _v_$t_regex = /_v\([^)]*\$t\([^)]+\)[^)]*\)/g;
        const _v_matches = code.match(_v_$t_regex) || [];
        result.patterns._v_$t = _v_matches.length;
        // 模式3: 直接的$t调用
        const direct_$t_regex = /(?<!_s\(|_v\()[^.]*\$t\([^)]+\)/g;
        const direct_matches = code.match(direct_$t_regex) || [];
        result.patterns.direct_$t = direct_matches.length;
        // 模式4: _vm.$t调用
        const vm_$t_regex = /_vm\.\$t\([^)]+\)/g;
        const vm_matches = code.match(vm_$t_regex) || [];
        result.patterns.vm_$t = vm_matches.length;
        // 计算总数
        result.i18nCallCount = result.patterns._s_$t + result.patterns._v_$t +
            result.patterns.direct_$t + result.patterns.vm_$t;
        result.hasI18nCalls = result.i18nCallCount > 0;
        // 收集样本
        result.samples = [
            ..._s_matches.slice(0, 2),
            ..._v_matches.slice(0, 2),
            ...direct_matches.slice(0, 2)
        ];
        return result;
    }
    /**
     * 检查未转换的中文字符串
     */
    checkRemainingChineseText(code) {
        // 检查未转换的中文字符串（排除已经在$t调用中的）
        const chineseRegex = /["']([^"']*[\u4e00-\u9fff][^"']*)["']/g;
        const allChinese = [];
        let match;
        while ((match = chineseRegex.exec(code)) !== null) {
            const chineseText = match[1];
            const context = code.substring(Math.max(0, match.index - 50), match.index + match[0].length + 50);
            // 检查是否已经在$t调用中
            if (!context.includes('$t(')) {
                allChinese.push(chineseText);
            }
        }
        return {
            count: allChinese.length,
            samples: allChinese.slice(0, 5) // 只显示前5个样本
        };
    }
    /**
     * 输出转换质量报告
     */
    outputTransformationQualityReport(filename, validationResult) {
        const total = validationResult.i18nCallCount;
        const coverage = total > 0 ? "高" : "无";
        console.log(`📋 AutoI18nPlugin: ${filename} 转换质量报告:`);
        console.log(`   📊 总$t调用数: ${total}`);
        console.log(`   🎯 转换覆盖率: ${coverage}`);
        console.log(`   🔧 主要模式: ${this.getMainPattern(validationResult.patterns)}`);
        if (validationResult.samples.length > 0) {
            console.log(`   📝 转换样本:`);
            validationResult.samples.slice(0, 3).forEach((sample, index) => {
                console.log(`      ${index + 1}. ${sample.substring(0, 60)}...`);
            });
        }
    }
    /**
     * 获取主要的转换模式
     */
    getMainPattern(patterns) {
        const entries = Object.entries(patterns);
        const sorted = entries.sort(([, a], [, b]) => b - a);
        if (sorted[0][1] === 0)
            return "无转换";
        const patternNames = {
            '_s_$t': 'Vue插值',
            '_v_$t': 'Vue文本节点',
            'direct_$t': '直接调用',
            'vm_$t': 'Vue实例调用'
        };
        return patternNames[sorted[0][0]] || sorted[0][0];
    }
    /**
     * 处理render函数在emit阶段的分析
     */
    processRenderFunctionInEmit(source, filename, translations) {
        console.log(`🔧 AutoI18nPlugin: 验证emit阶段的render函数转换结果 - ${filename}`);
        try {
            // 检测$t调用模式来验证转换是否成功
            const i18nValidationResult = this.validateI18nTransformation(source);
            if (i18nValidationResult.hasI18nCalls) {
                console.log(`✅ AutoI18nPlugin: ${filename} 中发现了 ${i18nValidationResult.i18nCallCount} 个$t调用`);
                console.log(`📊 AutoI18nPlugin: 转换模式分析:`);
                // 分析不同的转换模式
                if (i18nValidationResult.patterns._s_$t > 0) {
                    console.log(`  🎯 _s($t()) 模式: ${i18nValidationResult.patterns._s_$t} 个 (Vue template插值转换)`);
                }
                if (i18nValidationResult.patterns._v_$t > 0) {
                    console.log(`  🎯 _v($t()) 模式: ${i18nValidationResult.patterns._v_$t} 个 (Vue文本节点转换)`);
                }
                if (i18nValidationResult.patterns.direct_$t > 0) {
                    console.log(`  🎯 直接$t() 模式: ${i18nValidationResult.patterns.direct_$t} 个 (JavaScript代码转换)`);
                }
                // 检查是否还有未转换的中文
                const remainingChinese = this.checkRemainingChineseText(source);
                if (remainingChinese.count > 0) {
                    console.log(`⚠️ AutoI18nPlugin: ${filename} 中还有 ${remainingChinese.count} 个未转换的中文字符串`);
                    remainingChinese.samples.forEach((sample, index) => {
                        console.log(`    ${index + 1}. "${sample}"`);
                    });
                }
                else {
                    console.log(`🎉 AutoI18nPlugin: ${filename} 中的所有中文字符串都已成功转换！`);
                }
            }
            else {
                console.log(`ℹ️ AutoI18nPlugin: ${filename} 中未发现$t调用，可能无需国际化处理`);
            }
            // 输出转换质量报告
            this.outputTransformationQualityReport(filename, i18nValidationResult);
        }
        catch (error) {
            console.error(`❌ AutoI18nPlugin: 验证 ${filename} 时出错:`, error);
        }
    }
}
exports.CodeAnalyzer = CodeAnalyzer;
