// Escape a value so it renders as text when interpolated into an HTML string.
// Use it on anything that came from the network (API error text, flow error
// text) before it reaches `createTemplate` or an `innerHTML` assignment.
export const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    // & must be replaced first, otherwise it would double-escape the entities
    // introduced by the replacements below.
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
