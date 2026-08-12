import {
  chunkMappingSlots,
  constrainMappingCandidates,
  mappingCacheKey,
  type MappingRegistryCandidate,
} from './lawfirm-mapping-candidates';

const registry: MappingRegistryCandidate[] = [
  {
    id: 'company-name',
    canonicalKey: 'organization.legal_name',
    currentProfileKey: 'f_to_ten',
    group: 'organization',
    labelVi: 'Tên công ty',
    labelEn: 'Company name',
    taxonomyVersion: 1,
    aliases: [{ normalizedAlias: 'ten doanh nghiep' }],
  },
  {
    id: 'tax-id',
    canonicalKey: 'organization.tax_id',
    currentProfileKey: 'f_to_mst',
    group: 'organization',
    labelVi: 'Mã số thuế',
    labelEn: 'Tax ID',
    taxonomyVersion: 1,
    aliases: [{ normalizedAlias: 'mst' }],
  },
];

describe('lawfirm mapping candidates', () => {
  it('ranks semantic candidates and creates a stable fingerprint', () => {
    const slot = {
      id: 'slot-1',
      label: 'Mã số thuế doanh nghiệp',
      normalizedSlot: 'ma so thue doanh nghiep',
      contexts: ['Giấy chứng nhận đăng ký doanh nghiệp'],
      documentRefs: ['doc-1'],
    };
    const first = constrainMappingCandidates(slot, registry, 2);
    const second = constrainMappingCandidates(slot, registry, 2);
    expect(first.candidateCanonicalKeys[0]).toBe('organization.tax_id');
    expect(first.semanticFingerprint).toBe(second.semanticFingerprint);
  });

  it('chunks by item and token budgets without splitting a slot', () => {
    const slots = Array.from({ length: 5 }, (_, index) =>
      constrainMappingCandidates(
        {
          id: `slot-${index}`,
          label: `Field ${index}`,
          normalizedSlot: `field ${index}`,
          contexts: [],
          documentRefs: ['doc-1'],
        },
        registry,
      ),
    );
    expect(
      chunkMappingSlots(slots, 2, 10_000).map((item) => item.length),
    ).toEqual([2, 2, 1]);
    expect(
      mappingCacheKey({
        semanticFingerprint: slots[0].semanticFingerprint,
        taxonomyVersion: 1,
        promptVersion: 'v1',
        modelName: 'flash',
      }),
    ).toHaveLength(64);
  });
});
