import { waitFor } from '@testing-library/dom';
import { screen } from 'shadow-dom-testing-library';
import {
  setNOTPVariable,
  updateScreenFromScreenState,
  updateTemplateFromScreenState,
} from '../../src/lib/helpers/templates';

const renderTemplate = (html: string, user: Record<string, unknown>) => {
  const template = document.createElement('template');
  template.innerHTML = html;
  updateTemplateFromScreenState(template.content, { user }, {});
  return template.content.firstElementChild.textContent;
};

describe('templates', () => {
  afterEach(() => {
    document.getElementsByTagName('html')[0].innerHTML = '';
    jest.resetAllMocks();
    window.location.search = '';
  });

  it('should handle descope inputs', async () => {
    document.body.innerHTML = `<div>
			<input class="descope-input" name="email">
		</div>`;

    updateScreenFromScreenState(document.body, {
      inputs: { email: 'email1', description: 'description1' },
    });
    await waitFor(() => screen.getByShadowDisplayValue('email1'));
  });

  it('should handle descope form', async () => {
    document.body.innerHTML = `<div>
			<input class="descope-input" name="email"></input>
		</div>`;

    updateScreenFromScreenState(document.body, {
      form: { email: 'email2' },
    });
    await waitFor(() => screen.getByShadowDisplayValue('email2'));
  });

  describe('enriched text templates', () => {
    const enriched = (value: unknown) =>
      renderTemplate(
        '<descope-enriched-text>Hi {{user.value}}!</descope-enriched-text>',
        { value },
      );

    it('should escape a string value', () => {
      expect(enriched('a\\b *x*')).toEqual('Hi a\\\\b \\*x\\*!');
    });

    it('should escape an array value', () => {
      expect(enriched(['a_b', '*c*'])).toEqual('Hi a\\_b\\,\\*c\\*!');
    });

    it('should replace newlines with spaces', () => {
      expect(enriched('a\nb\r\nc\rd')).toEqual('Hi a b c d!');
    });

    it('should escape a value that starts like a list item', () => {
      expect(
        renderTemplate(
          '<descope-enriched-text>{{user.value}}</descope-enriched-text>',
          { value: '- x' },
        ),
      ).toEqual('\\- x');
    });

    it('should keep the value as is in plain text', () => {
      expect(
        renderTemplate('<descope-text>Hi {{user.value}}</descope-text>', {
          value: 'a\\b\n*c*',
        }),
      ).toEqual('Hi a\\b\n*c*');
    });
  });

  it('should set NOTP variable', async () => {
    document.body.innerHTML = `<div> </div>`;
    const image = 'image';
    const urlVar = 'url-var';

    // Mock customElements.get
    const originalGet = customElements.get;
    customElements.get = jest.fn().mockReturnValue({
      cssVarList: {
        url: urlVar,
      },
    });

    // Mock HTMLElement.style.setProperty
    const setPropertySpy = jest.spyOn(
      CSSStyleDeclaration.prototype,
      'setProperty',
    );

    setNOTPVariable(document.body, image);

    expect(customElements.get).toHaveBeenCalledWith('descope-notp-image');
    expect(setPropertySpy).toHaveBeenCalledWith(
      urlVar,
      `url(data:image/jpg;base64,${image})`,
    );

    // Restore original functions
    customElements.get = originalGet;
    setPropertySpy.mockRestore();
  });
});
