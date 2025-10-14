/**
 * Vue Memory Resolver
 * 通过虚拟文件系统为Vue文件提供预处理的内容
 */
export declare class VueMemoryResolver {
    private memoryStore;
    private originalReadFileSync;
    constructor(memoryStore: Map<string, string>);
    /**
     * 注册虚拟文件系统解析器
     */
    apply(compiler: any): void;
    /**
     * 解析绝对路径
     */
    private resolveAbsolutePath;
}
