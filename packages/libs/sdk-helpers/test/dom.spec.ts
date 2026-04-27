import { createTemplate } from '../src';

describe('dom helpers', () => {
  describe('createTemplate', () => {
    it('should create a template element with innerHTML set', () => {
      const templateString = '<div class="test">Content</div>';
      const template = createTemplate(templateString);

      expect(template).toBeInstanceOf(HTMLTemplateElement);
      expect(template.innerHTML).toBe(templateString);
    });

    it('should handle empty string', () => {
      const template = createTemplate('');

      expect(template).toBeInstanceOf(HTMLTemplateElement);
      expect(template.innerHTML).toBe('');
    });
  });
});
