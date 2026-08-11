import { auditLawfirmLegacyFields } from './lawfirm-legacy-audit';

describe('auditLawfirmLegacyFields', () => {
  it('reports legacy keys, value conflicts, unknown keys and wrong mappings', () => {
    const report = auditLawfirmLegacyFields({
      profileFields: [
        {
          id: 'profile-field-1',
          profileId: 'profile-1',
          fieldKey: 'tax_id',
          value: '0101',
        },
        {
          id: 'profile-field-2',
          profileId: 'profile-1',
          fieldKey: 'f_to_mst',
          value: '0202',
        },
        {
          id: 'profile-field-3',
          profileId: 'profile-1',
          fieldKey: 'invented_key',
          value: 'x',
        },
      ],
      templateFields: [
        {
          id: 'template-field-1',
          documentId: 'document-1',
          placeholder: '[ĐỊA CHỈ TRỤ SỞ CHÍNH CỦA CÔNG TY]',
          mappedKey: 'company_name',
        },
      ],
    });

    expect(report.summary).toMatchObject({
      legacyKeys: 2,
      unknownKeys: 1,
      profileValueConflicts: 1,
      templateMappingConflicts: 1,
    });
    expect(report.profileValueConflicts[0]).toMatchObject({
      canonicalKey: 'f_to_mst',
      values: ['0101', '0202'],
    });
    expect(report.templateMappingConflicts[0]).toMatchObject({
      mappedKey: 'f_to_ten',
      expectedKey: 'f_to_diachi',
    });
  });
});
