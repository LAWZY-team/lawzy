import {
  cleanPlaceholderLabel,
  extractPlaceholders,
  guessCanonicalMapping,
} from './lawfirm-placeholder-detector';

describe('lawfirm-placeholder-detector', () => {
  it('extracts bracket and curly placeholders', () => {
    const text = 'Công ty [TÊN DOANH NGHIỆP] có MST {{mst}}';
    expect(extractPlaceholders(text)).toEqual(
      expect.arrayContaining(['[TÊN DOANH NGHIỆP]', '{{mst}}']),
    );
  });

  it('cleans placeholder labels', () => {
    expect(cleanPlaceholderLabel('[TÊN DOANH NGHIỆP]')).toBe('TÊN DOANH NGHIỆP');
  });

  it('maps common placeholders to canonical keys', () => {
    const mapped = guessCanonicalMapping('[MÃ SỐ THUẾ]');
    expect(['f_to_mst', 'tax_id']).toContain(mapped);
  });
});
