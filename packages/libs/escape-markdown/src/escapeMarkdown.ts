// Markdown characters escaped in values, the backslash included.
// `.`, `@`, `-` and `&` are left as is, so emails and links keep working.
const escapeRegexp = /[\\*#/()[\]_<>`]/g;
const unescapeRegexp = /\\([\\*#/()[\]_<>`])/g;

export const escapeMarkdown = (s: string) => {
  if (typeof s !== 'string') return s;
  return s.replace(escapeRegexp, '\\$&');
};

export const unescapeMarkdown = (s: string) => {
  if (typeof s !== 'string') return s;
  return s.replace(unescapeRegexp, '$1');
};
