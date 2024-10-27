import { escapeMarkdown } from '../src';

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
