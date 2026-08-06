import { escapeXml } from './utils/lawfirm-docx-filler';

describe('lawfirm-docx-filler', () => {
  it('escapes xml entities', () => {
    expect(escapeXml('A & B <C>')).toBe('A &amp; B &lt;C&gt;');
  });
});
