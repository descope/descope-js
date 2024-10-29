const mdChars = ['*', '#', '/', '(', ')', '[', ']', '_', '<', '>', '`'];

export const escapeMarkdown = (s: string) => {
  if (typeof s !== 'string') return s;
  const escapedTextRegexp = mdChars.map((char) => `\\${char}`).join('|');
  const regexp = new RegExp(`(${escapedTextRegexp})`, 'g');
  return s.replace(regexp, '\\$1');
};

export const unescapeMarkdown = (s: string) => {
  if (typeof s !== 'string') return s;
  const escapedTextRegexp = mdChars.map((char) => `\\\\${char}`).join('|');
  const regexp = new RegExp(`(${escapedTextRegexp})`, 'g');
  return s.replace(regexp, (match) => match.slice(1));
};
