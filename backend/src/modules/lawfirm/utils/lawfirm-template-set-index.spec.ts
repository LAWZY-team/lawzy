import { buildTemplateSetIndex } from './lawfirm-template-set-index';

const registry = [
  {
    id: 'company-name',
    canonicalKey: 'organization.legal_name',
    currentProfileKey: 'f_to_ten',
    aliases: [{ normalizedAlias: 'TÊN CÔNG TY' }],
  },
  {
    id: 'registered-address',
    canonicalKey: 'organization.registered_address',
    currentProfileKey: 'f_to_diachi',
    aliases: [{ normalizedAlias: 'ĐỊA CHỈ TRỤ SỞ' }],
  },
];

describe('buildTemplateSetIndex', () => {
  it('deduplicates the same semantic slot across documents', () => {
    const result = buildTemplateSetIndex(
      [
        {
          id: 'doc-1',
          fields: [
            {
              id: 'field-1',
              label: 'Tên công ty',
              placeholder: '[TÊN CÔNG TY]',
              mappedKey: 'f_to_ten',
              source: 'auto',
              count: 2,
              sortOrder: 0,
            },
          ],
        },
        {
          id: 'doc-2',
          fields: [
            {
              id: 'field-2',
              label: 'Tên công ty',
              placeholder: '[Tên công ty]',
              mappedKey: 'organization.legal_name',
              source: 'auto',
              count: 1,
              sortOrder: 0,
            },
          ],
        },
      ],
      registry,
    );

    expect(result.fields).toHaveLength(1);
    expect(result.fields[0]).toMatchObject({
      defaultFieldDefinitionId: 'company-name',
      mappingStatus: 'mapped',
    });
    expect(result.slots).toHaveLength(2);
    expect(
      result.slots.reduce((total, slot) => total + slot.occurrenceCount, 0),
    ).toBe(3);
  });

  it('blocks a normalized slot that maps to different definitions', () => {
    const result = buildTemplateSetIndex(
      [
        {
          id: 'doc-1',
          fields: [
            {
              id: 'field-1',
              label: 'Thông tin công ty',
              placeholder: '[THÔNG TIN CÔNG TY]',
              mappedKey: 'f_to_ten',
              source: 'auto',
              count: 1,
              sortOrder: 0,
            },
            {
              id: 'field-2',
              label: 'Thông tin công ty',
              placeholder: '[THÔNG TIN CÔNG TY]',
              mappedKey: 'f_to_diachi',
              source: 'auto',
              count: 1,
              sortOrder: 1,
            },
          ],
        },
      ],
      registry,
    );

    expect(result.fields).toEqual([
      expect.objectContaining({
        defaultFieldDefinitionId: null,
        mappingStatus: 'conflict',
      }),
    ]);
  });

  it('keeps unknown custom mappings for review instead of inventing a key', () => {
    const result = buildTemplateSetIndex(
      [
        {
          id: 'doc-1',
          fields: [
            {
              id: 'field-1',
              label: 'Mã nghiệp vụ riêng',
              placeholder: 'Mã nghiệp vụ riêng',
              mappedKey: 'f_unknown_runtime_key',
              source: 'ai',
              count: 1,
              sortOrder: 0,
            },
          ],
        },
      ],
      registry,
    );

    expect(result.fields[0]).toMatchObject({
      defaultFieldDefinitionId: null,
      mappingStatus: 'needs_review',
    });
    expect(result.slots[0].sourceKind).toBe('ai_detected_span');
  });
});
