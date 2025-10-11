import { TranslationServiceOptions, Translation } from '../types';
export declare class TranslationService {
    private options;
    private cache;
    constructor(options: TranslationServiceOptions);
    translateBatch(texts: string[]): Promise<Translation[]>;
    private translateWithBaidu;
}
