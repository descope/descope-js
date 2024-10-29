import { escapeMarkdown, unescapeMarkdown } from '../src';

describe('escape markdown', () => {
  it('should escape markdown chars', () => {
    const source = '*#/()[]_<>`';
    expect(escapeMarkdown(source)).toEqual('\\*\\#\\/\\(\\)\\[\\]\\_\\<\\>\\`');
  });

  it('ignore non-strings', () => {
    const source = 1234;
    expect(escapeMarkdown(source as any)).toEqual(source);
  });
});

describe('unescape markdown', () => {
  it('should unescape markdown chars', () => {
    const source =
      '\\*asterisk\\* \\_underscore\\_ \\(brackets1\\) \\[brackets2\\] \\`backtick\\`';
    expect(unescapeMarkdown(source)).toEqual(
      '*asterisk* _underscore_ (brackets1) [brackets2] `backtick`',
    );
  });

  it('ignore non-strings', () => {
    const source = 1234;
    expect(unescapeMarkdown(source as any)).toEqual(source);
  });
});
