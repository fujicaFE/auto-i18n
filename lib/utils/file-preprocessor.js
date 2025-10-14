"use strict";
/**
 * 文件预处理器
 * 负责Vue文件的直接预处理，直接修改源文件
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilePreprocessor = void 0;
const path_1 = __importDefault(require("path"));
class FilePreprocessor {
    constructor(chineseExtractor) {
        this.chineseExtractor = chineseExtractor;
    }
    /**
     * 直接处理Vue文件，修改源文件
     */
    async processVueFilesDirectly(outputPath) {
        try {
            const glob = require('glob');
            const fs = require('fs');
            // 查找所有Vue文件
            const vueFiles = glob.sync('src/**/*.vue', {
                cwd: process.cwd(),
                ignore: ['node_modules/**', 'dist/**', 'build/**']
            });
            console.log(`🔍 AutoI18nPlugin: 发现 ${vueFiles.length} 个Vue文件需要处理`);
            // 加载翻译数据
            const translations = this.loadTranslationsFromMemory(outputPath);
            for (const relativeFilePath of vueFiles) {
                const absoluteFilePath = path_1.default.resolve(process.cwd(), relativeFilePath);
                try {
                    // 读取原始文件内容
                    const originalContent = fs.readFileSync(absoluteFilePath, 'utf-8');
                    // 检查是否包含中文
                    const chineseRegex = /[\u4e00-\u9fff]/;
                    if (chineseRegex.test(originalContent)) {
                        console.log(`📝 AutoI18nPlugin: 处理Vue文件 - ${relativeFilePath}`);
                        // 转换内容
                        const transformedContent = this.transformVueFileContent(originalContent, translations);
                        if (transformedContent !== originalContent) {
                            // 直接写入文件
                            fs.writeFileSync(absoluteFilePath, transformedContent, 'utf-8');
                            console.log(`✅ AutoI18nPlugin: 已更新文件 - ${relativeFilePath}`);
                        }
                        else {
                            console.log(`ℹ️ AutoI18nPlugin: 无需转换 - ${relativeFilePath}`);
                        }
                    }
                    else {
                        console.log(`⚪ AutoI18nPlugin: 无中文内容 - ${relativeFilePath}`);
                    }
                }
                catch (error) {
                    console.error(`❌ AutoI18nPlugin: 处理文件失败 ${relativeFilePath}:`, error);
                }
            }
            console.log(`🎯 AutoI18nPlugin: 文件处理完成`);
        }
        catch (error) {
            console.error('❌ AutoI18nPlugin: processVueFilesDirectly 失败:', error);
        }
    }
    /**
     * 转换Vue文件内容，将中文文本替换为$t()调用
     * 使用专业的Transformer来处理JavaScript和模板部分
     */
    transformVueFileContent(content, translations) {
        try {
            // 使用我们现有的chineseExtractor来提取中文文本
            const chineseTexts = this.chineseExtractor.extractFromVueFile(content);
            if (chineseTexts.length === 0) {
                return content; // 如果没有中文文本，直接返回原内容
            }
            console.log(`   发现 ${chineseTexts.length} 个中文文本`);
            // 使用专业的Transformer来处理Vue文件
            const { Transformer } = require('./transformer');
            const transformer = new Transformer({
                functionName: '$t'
            });
            // 转换整个Vue文件（包括模板和脚本部分）
            const transformedContent = transformer.transform(content, translations);
            // 如果转换后有变化，记录转换的文本
            if (transformedContent !== content) {
                for (const text of chineseTexts) {
                    console.log(`   替换: "${text}" -> $t('${text}')`);
                }
            }
            return transformedContent;
        }
        catch (error) {
            console.error('transformVueFileContent error:', error);
            return content; // 出错时返回原内容
        }
    }
    /**
     * 处理render函数
     */
    processRenderFunction(source, resourcePath, translations) {
        console.log(`🔄 AutoI18nPlugin: 开始处理render函数中的中文文本`);
        try {
            const { Transformer } = require('./transformer');
            const transformer = new Transformer({
                functionName: '$t'
            });
            // 检查render函数中是否包含中文
            const chineseRegex = /[\u4e00-\u9fff]/;
            if (chineseRegex.test(source)) {
                console.log(`🎨 AutoI18nPlugin: render函数中发现中文文本，开始转换...`);
                // 调用transformer处理
                const transformedCode = transformer.transform(source, translations);
                if (transformedCode !== source) {
                    console.log(`✅ AutoI18nPlugin: render函数转换完成！`);
                }
                else {
                    console.log(`ℹ️ AutoI18nPlugin: render函数无需转换`);
                }
            }
            else {
                console.log(`ℹ️ AutoI18nPlugin: render函数中未发现中文文本`);
            }
        }
        catch (error) {
            console.error(`❌ AutoI18nPlugin: 处理render函数时出错:`, error);
        }
    }
    /**
     * 从文件系统加载翻译数据
     */
    loadTranslationsFromMemory(outputPath) {
        const translations = {};
        try {
            const fs = require('fs');
            const localesDir = path_1.default.resolve(outputPath);
            if (!fs.existsSync(localesDir)) {
                return translations;
            }
            const files = fs.readdirSync(localesDir).filter((file) => file.endsWith('.json'));
            for (const file of files) {
                const locale = path_1.default.basename(file, '.json');
                const filePath = path_1.default.join(localesDir, file);
                try {
                    const content = fs.readFileSync(filePath, 'utf-8');
                    const localeTranslations = JSON.parse(content);
                    for (const [key, translation] of Object.entries(localeTranslations)) {
                        if (!translations[key]) {
                            translations[key] = {};
                        }
                        translations[key][locale] = translation;
                    }
                }
                catch (error) {
                    console.warn('AutoI18nPlugin: Failed to load', filePath);
                }
            }
        }
        catch (error) {
            console.warn('AutoI18nPlugin: Failed to load translations:', error.message);
        }
        return translations;
    }
}
exports.FilePreprocessor = FilePreprocessor;
