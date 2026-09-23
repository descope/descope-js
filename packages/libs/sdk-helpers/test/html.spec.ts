import { createTemplate, escapeHtml } from '../src';

const XSS_PAYLOAD = '<img src=x onerror=alert(1)>';

describe('html helpers', () => {
  describe('escapeHtml', () => {
    it('should escape the five markup-significant characters', () => {
      expect(escapeHtml('&')).toBe('&amp;');
      expect(escapeHtml('<')).toBe('&lt;');
      expect(escapeHtml('>')).toBe('&gt;');
      expect(escapeHtml('"')).toBe('&quot;');
      expect(escapeHtml("'")).toBe('&#39;');
    });

    it('should escape & first so entities are not double-escaped', () => {
      // If < were replaced before &, this would come out as '&lt;' and the
      // original text would be lost.
      expect(escapeHtml('&lt;')).toBe('&amp;lt;');
    });

    it('should return an empty string for null and undefined', () => {
      expect(escapeHtml(undefined)).toBe('');
      expect(escapeHtml(null)).toBe('');
    });

    it('should leave text without markup untouched', () => {
      expect(escapeHtml('Failed to create user')).toBe('Failed to create user');
    });
  });

  // The real proof: run the escaped value through the same sink the widgets
  // use, and check what the HTML parser actually built.
  describe('through createTemplate', () => {
    it('should not create an element from a markup payload', () => {
      const template = createTemplate(escapeHtml(XSS_PAYLOAD));

      expect(template.content.querySelector('img')).toBeNull();
      expect(template.content.querySelector('script')).toBeNull();
    });

    it('should keep the payload readable as text', () => {
      const { textContent } = createTemplate(escapeHtml(XSS_PAYLOAD)).content;

      expect(textContent).toBe(XSS_PAYLOAD);
    });

    it('should round-trip an apostrophe back to a real apostrophe', () => {
      // escapeHtml turns ' into &#39; in the string; the parser turns it back.
      // This is why assertions must read parsed text, not the raw string.
      const { textContent } = createTemplate(
        escapeHtml("Can't create user"),
      ).content;

      expect(textContent).toBe("Can't create user");
    });
  });
});
