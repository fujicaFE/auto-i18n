import { Transformer } from '../src/utils/transformer'

describe('comparison skip transformation', () => {
  it('should not transform chinese literal used in binary equality', () => {
    const source = "const url = getUrl(); if (url !== '查询视频播放地址失败') { console.log('ok'); }";
    const translations = { '查询视频播放地址失败': { en: 'Failed to get video play url' } } as any;
    const transformer = new Transformer({ globalFunctionName: 'i18n.t' });
    const output = transformer.transform(source, translations);
    expect(output).toContain("url !== '查询视频播放地址失败'");
    expect(output).not.toContain("$t('查询视频播放地址失败')");
    expect(output).not.toContain("i18n.t('查询视频播放地址失败')");
  });
});
