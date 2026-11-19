import { escapeMarkdown, unescapeMarkdown } from '../src';

const cases: [string, string][] = [
  ['\\', String.raw`\\`],
  [String.raw`\*`, String.raw`\\\*`],
  [String.raw`a\b`, String.raw`a\\b`],
  ['a\\', String.raw`a\\`],
  ['# x', String.raw`\# x`],
  ['a_b@c-d.com', String.raw`a\_b@c-d.com`],
];

describe('escape markdown', () => {
  it('should escape markdown chars', () => {
    const source = '*#/()[]_<>`';
    expect(escapeMarkdown(source)).toEqual('\\*\\#\\/\\(\\)\\[\\]\\_\\<\\>\\`');
  });

  it('should leave other characters as is', () => {
    const source = 'Claude Code 2 שלום é .@-+:&!?|~=';
    expect(escapeMarkdown(source)).toEqual(source);
  });

  it.each(cases)('should escape %s', (source, expected) => {
    expect(escapeMarkdown(source)).toEqual(expected);
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

  it('should keep a backslash before a char that is not escaped', () => {
    expect(unescapeMarkdown(String.raw`a\b`)).toEqual(String.raw`a\b`);
  });

  it.each(cases)('should round trip %s', (source) => {
    expect(unescapeMarkdown(escapeMarkdown(source))).toEqual(source);
  });

  it('ignore non-strings', () => {
    const source = 1234;
    expect(unescapeMarkdown(source as any)).toEqual(source);
  });
});
