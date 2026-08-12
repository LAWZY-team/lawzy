import {
  cleanPlaceholderLabel,
  extractPlaceholders,
  guessCanonicalMapping,
} from './lawfirm-placeholder-detector';
import {
  findLawfirmFieldCandidatesByAlias,
  normalizeLawfirmFieldAlias,
  normalizeTemplateMappedKey,
  toCanonicalLawfirmFieldKey,
  toCurrentLawfirmProfileFieldKey,
} from '../lawfirm-field-taxonomy';

describe('lawfirm-placeholder-detector', () => {
  it('extracts bracket and curly placeholders', () => {
    const text = 'Công ty [TÊN DOANH NGHIỆP] có MST {{mst}}';
    expect(extractPlaceholders(text)).toEqual(
      expect.arrayContaining(['[TÊN DOANH NGHIỆP]', '{{mst}}']),
    );
  });

  it('cleans placeholder labels', () => {
    expect(cleanPlaceholderLabel('[TÊN DOANH NGHIỆP]')).toBe(
      'TÊN DOANH NGHIỆP',
    );
  });

  it('maps common placeholders to canonical keys', () => {
    expect(guessCanonicalMapping('[MÃ SỐ THUẾ]')).toBe('f_to_mst');
  });

  it('maps company-name aliases to one current profile key', () => {
    expect(guessCanonicalMapping('[TÊN CÔNG TY]')).toBe('f_to_ten');
    expect(guessCanonicalMapping('[Tên công ty]')).toBe('f_to_ten');
    expect(guessCanonicalMapping('{{ten_doanh_nghiep}}')).toBe('f_to_ten');
  });

  it('does not confuse registered address containing company with company name', () => {
    const placeholder = '[ĐỊA CHỈ TRỤ SỞ CHÍNH CỦA CÔNG TY]';
    expect(guessCanonicalMapping(placeholder)).toBe('f_to_diachi');
    expect(guessCanonicalMapping(placeholder)).not.toBe('f_to_ten');
  });

  it('maps all tax-id aliases to one current profile key', () => {
    expect(guessCanonicalMapping('[MÃ SỐ DOANH NGHIỆP]')).toBe('f_to_mst');
    expect(guessCanonicalMapping('[MST]')).toBe('f_to_mst');
    expect(guessCanonicalMapping('{{mst}}')).toBe('f_to_mst');
  });

  it('keeps ambiguous aliases unresolved without entity context', () => {
    const candidates = findLawfirmFieldCandidatesByAlias('[EMAIL]');
    expect(candidates.map((candidate) => candidate.canonicalKey)).toEqual([
      'person.email',
      'organization.email',
    ]);
    expect(guessCanonicalMapping('[EMAIL]')).toBe('');
  });

  it('normalizes wrappers, spacing, underscores, and casing', () => {
    expect(normalizeLawfirmFieldAlias(' {{  TEN_CONG_TY  }} ')).toBe(
      'TEN CONG TY',
    );
    expect(guessCanonicalMapping(' [  tên công ty  ] ')).toBe('f_to_ten');
  });

  it('canonicalizes generic and f_* legacy keys to one semantic identity', () => {
    expect(toCanonicalLawfirmFieldKey('company_name')).toBe(
      'organization.legal_name',
    );
    expect(toCanonicalLawfirmFieldKey('f_to_ten')).toBe(
      'organization.legal_name',
    );
    expect(toCurrentLawfirmProfileFieldKey('tax_id')).toBe('f_to_mst');
    expect(toCurrentLawfirmProfileFieldKey('organization.tax_id')).toBe(
      'f_to_mst',
    );
  });

  it('accepts only canonical/current or durable custom template mappings', () => {
    expect(normalizeTemplateMappedKey('tax_id')).toBe('f_to_mst');
    expect(normalizeTemplateMappedKey('organization.tax_id')).toBe('f_to_mst');
    expect(normalizeTemplateMappedKey('custom-1234_abcd')).toBe(
      'custom-1234_abcd',
    );
    expect(normalizeTemplateMappedKey('')).toBe('');
    expect(normalizeTemplateMappedKey('made_up_key')).toBeUndefined();
  });
});
