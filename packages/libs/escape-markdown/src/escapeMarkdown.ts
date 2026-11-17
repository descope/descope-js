// Every ASCII punctuation character. Markdown lets a backslash escape any of them.
const punctuation = '[!-/:-@[-`{-~]';
const escapeRegexp = new RegExp(punctuation, 'g');
const unescapeRegexp = new RegExp(`\\\\(${punctuation})`, 'g');

export const escapeMarkdown = (s: string) => {
  if (typeof s !== 'string') return s;
  return s.replace(escapeRegexp, '\\$&');
};

export const unescapeMarkdown = (s: string) => {
  if (typeof s !== 'string') return s;
  return s.replace(unescapeRegexp, '$1');
};
