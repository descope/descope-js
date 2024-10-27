export const escapeMarkdown = (s: string) => {
  const mdChars = ['*', '#', '/', '(', ')', '[', ']', '_', '<', '>', '`'];
  if (typeof s !== 'string') return s;
  const escapedTextRegexp = mdChars.map((char) => `\\${char}`).join('|');
  const regexp = new RegExp(`(${escapedTextRegexp})`, 'g');
  return s.replace(regexp, '\\$1');
};
