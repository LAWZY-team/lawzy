import { validateLawfirmFillPreflight } from './lawfirm-fill-preflight';

describe('lawfirm fill preflight', () => {
  it('detects conflicting legacy and current tax values', () => {
    const issues = validateLawfirmFillPreflight({
      profileFields: [
        { fieldKey: 'tax_id', value: '0123456789' },
        { fieldKey: 'f_to_mst', value: '987654321' },
      ],
      documents: [],
    });

    expect(issues).toEqual([
      expect.objectContaining({
        code: 'PROFILE_CANONICAL_VALUE_CONFLICT',
        fieldKey: 'f_to_mst',
        values: ['0123456789', '987654321'],
      }),
    ]);
  });

  it('allows repeated aliases with the same tax value', () => {
    const issues = validateLawfirmFillPreflight({
      profileFields: [
        { fieldKey: 'tax_id', value: '0123456789' },
        { fieldKey: 'f_to_mst', value: '0123456789' },
      ],
      documents: [],
    });

    expect(issues).toEqual([]);
  });

  it('blocks a registered-address placeholder mapped to company name', () => {
    const issues = validateLawfirmFillPreflight({
      profileFields: [],
      documents: [
        {
          id: 'doc-1',
          fields: [
            {
              id: 'field-1',
              placeholder: '[ĐỊA CHỈ TRỤ SỞ CHÍNH CỦA CÔNG TY]',
              mappedKey: 'company_name',
              source: 'ai',
            },
          ],
        },
      ],
    });

    expect(issues).toEqual([
      expect.objectContaining({
        code: 'PLACEHOLDER_MAPPING_CONFLICT',
        fieldKey: 'f_to_ten',
        placeholder: '[ĐỊA CHỈ TRỤ SỞ CHÍNH CỦA CÔNG TY]',
      }),
    ]);
  });

  it('blocks unknown AI mappings', () => {
    const issues = validateLawfirmFillPreflight({
      profileFields: [],
      documents: [
        {
          id: 'doc-1',
          fields: [
            {
              id: 'field-1',
              placeholder: '[FIELD LẠ]',
              mappedKey: 'made_up_key',
              source: 'ai',
            },
          ],
        },
      ],
    });

    expect(issues).toEqual([
      expect.objectContaining({
        code: 'UNKNOWN_AUTOMATIC_MAPPING',
        fieldKey: 'made_up_key',
      }),
    ]);
  });
});
