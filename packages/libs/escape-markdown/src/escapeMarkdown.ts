const mdChars = ['*', '#', '/', '(', ')', '[', ']', '_', '<', '>', '`'];

const createRegexp = (prefix: string) => {
  const regex = mdChars.map((char) => `${prefix}${char}`).join('|')
  return new RegExp(`(${regex})`, 'g');
};

export const escapeMarkdown = (s: string) => {
  if (typeof s !== 'string') return s;
  return s.replace(createRegexp('\\'), '\\$1');
};

export const unescapeMarkdown = (s: string) => {
  if (typeof s !== 'string') return s;
  return s.replace(createRegexp('\\\\'), (match) => match.slice(1));
};
