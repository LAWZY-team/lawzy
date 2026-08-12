import {
  compareLawfirmFieldsBySourceOrder,
  compareLawfirmSourceAnchors,
  lawfirmPartRank,
} from './lawfirm-source-order';

describe('lawfirm source order', () => {
  it('uses a stable document-part order', () => {
    expect(lawfirmPartRank('word/document.xml')).toBeLessThan(
      lawfirmPartRank('word/header1.xml'),
    );
    expect(lawfirmPartRank('word/header1.xml')).toBeLessThan(
      lawfirmPartRank('word/footer1.xml'),
    );
  });

  it('prefers the exact OOXML offset over detector traversal order', () => {
    expect(
      compareLawfirmSourceAnchors(
        { part: 'word/document.xml', xmlOffset: 20, paragraphIndex: 8 },
        { part: 'word/document.xml', xmlOffset: 80, paragraphIndex: 1 },
      ),
    ).toBeLessThan(0);
  });

  it('puts anchored fields before manual fields and keeps a deterministic tie', () => {
    const fields = [
      { id: 'manual', sortOrder: 0 },
      {
        id: 'later',
        sortOrder: 1,
        discovery: { occurrences: [{ anchor: { xmlOffset: 90 } }] },
      },
      {
        id: 'earlier',
        sortOrder: 2,
        discovery: { occurrences: [{ anchor: { xmlOffset: 10 } }] },
      },
    ];

    expect(
      fields.sort(compareLawfirmFieldsBySourceOrder).map(({ id }) => id),
    ).toEqual(['earlier', 'later', 'manual']);
  });
});
