import JSZip from 'jszip';
import { discoverDocxSlots } from './lawfirm-docx-slot-discovery';
import { analyzeDocxPlaceholders } from './lawfirm-placeholder-detector';

const buildDocx = async (documentXml: string): Promise<Buffer> => {
  const zip = new JSZip();
  zip.file('word/document.xml', documentXml);
  return zip.generateAsync({ type: 'nodebuffer' });
};

describe('discoverDocxSlots', () => {
  it('reconstructs runs and detects structured OOXML slots without brackets', async () => {
    const buffer = await buildDocx(`
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p><w:r><w:t>[TÊN </w:t></w:r><w:r><w:t>CÔNG TY]</w:t></w:r></w:p>
          <w:sdt><w:sdtPr><w:tag w:val="f_to_mst"/></w:sdtPr><w:sdtContent><w:p><w:r><w:t>Nhập MST</w:t></w:r></w:p></w:sdtContent></w:sdt>
          <w:p><w:r><w:instrText> MERGEFIELD f_to_diachi \\* MERGEFORMAT </w:instrText></w:r></w:p>
          <w:p><w:bookmarkStart w:id="1" w:name="f_dd_hoten"/><w:r><w:t>Người đại diện</w:t></w:r><w:bookmarkEnd w:id="1"/></w:p>
          <w:p><w:r><w:t>Ngày sinh: ....................</w:t></w:r></w:p>
          <w:p><w:r><w:t>Tên công ty: CÔNG TY ABC</w:t></w:r></w:p>
          <w:tbl><w:tr>
            <w:tc><w:p><w:r><w:t>Địa chỉ trụ sở</w:t></w:r></w:p></w:tc>
            <w:tc><w:p/></w:tc>
          </w:tr></w:tbl>
        </w:body>
      </w:document>
    `);

    const slots = await discoverDocxSlots(buffer);
    const sourceKinds = slots.map((slot) => slot.sourceKind);

    expect(sourceKinds).toEqual(
      expect.arrayContaining([
        'explicit_placeholder',
        'content_control',
        'merge_field',
        'bookmark',
        'dotted_blank',
        'empty_table_cell',
        'literal_value',
      ]),
    );
    expect(
      slots.find((slot) => slot.sourceKind === 'explicit_placeholder'),
    ).toMatchObject({
      rawText: '[TÊN CÔNG TY]',
      mappedKey: 'f_to_ten',
    });
    expect(
      slots.find((slot) => slot.sourceKind === 'content_control'),
    ).toMatchObject({ mappedKey: 'f_to_mst' });
    expect(
      slots.find((slot) => slot.sourceKind === 'literal_value'),
    ).toMatchObject({
      currentValue: 'CÔNG TY ABC',
      confidence: 0.6,
    });
    expect(
      slots.find((slot) => slot.sourceKind === 'empty_table_cell')?.anchor,
    ).toMatchObject({ tableIndex: 0, rowIndex: 0, cellIndex: 1 });
  });

  it('groups repeated occurrences into one legacy field with durable discovery', async () => {
    const buffer = await buildDocx(`
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p><w:r><w:t>[TÊN CÔNG TY]</w:t></w:r></w:p>
          <w:p><w:r><w:t>[Tên công ty]</w:t></w:r></w:p>
        </w:body>
      </w:document>
    `);

    const fields = await analyzeDocxPlaceholders(buffer);

    expect(fields).toHaveLength(1);
    expect(fields[0].mappedKey).toBe('f_to_ten');
    expect(fields[0].count).toBe(2);
    expect(fields[0].discovery?.occurrences).toHaveLength(2);
  });

  it('recognizes full-width punctuation and does not leak detector-only hints', async () => {
    const buffer = await buildDocx(`
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p><w:r><w:t>Mã số thuế&#xFF1A;&#x2026;&#x2026;&#x2026;</w:t></w:r></w:p>
        </w:body>
      </w:document>
    `);

    const slots = await discoverDocxSlots(buffer);

    expect(slots).toHaveLength(1);
    expect(slots[0]).toMatchObject({
      sourceKind: 'dotted_blank',
      mappedKey: 'f_to_mst',
    });
    expect(slots[0]).not.toHaveProperty('normalizedValue');
    expect(slots[0]).not.toHaveProperty('mappingValue');
  });
});
