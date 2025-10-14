"use strict";
/**
 * Vue Memory Resolver
 * 通过虚拟文件系统为Vue文件提供预处理的内容
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VueMemoryResolver = void 0;
class VueMemoryResolver {
    constructor(memoryStore) {
        this.memoryStore = memoryStore;
    }
    /**
     * 注册虚拟文件系统解析器
     */
    apply(compiler) {
        // 监听normalModuleFactory钩子
        compiler.hooks.normalModuleFactory.tap('VueMemoryResolver', (normalModuleFactory) => {
            console.log('� AutoI18nPlugin: normalModuleFactory 钩子已注册');
            // 拦截模块解析
            normalModuleFactory.hooks.beforeResolve.tapAsync('VueMemoryResolver', (resolveData, callback) => {
                const request = resolveData.request;
                // 只处理.vue文件
                if (request && request.endsWith('.vue')) {
                    const absolutePath = this.resolveAbsolutePath(request, resolveData.context);
                    if (absolutePath && this.memoryStore.has(absolutePath)) {
                        console.log(`🎯 AutoI18nPlugin: 发现内存中的Vue文件 - ${request}`);
                        // 修改解析结果，使用我们的虚拟loader
                        resolveData.request = `vue-memory-loader!${request}`;
                    }
                }
                callback();
            });
        });
    }
    /**
     * 解析绝对路径
     */
    resolveAbsolutePath(request, context) {
        const path = require('path');
        try {
            if (path.isAbsolute(request)) {
                return path.resolve(request);
            }
            else {
                return path.resolve(context, request);
            }
        }
        catch (error) {
            return null;
        }
    }
}
exports.VueMemoryResolver = VueMemoryResolver;
