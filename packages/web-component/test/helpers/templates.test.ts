import { waitFor } from '@testing-library/dom';
import { screen } from 'shadow-dom-testing-library';
import {
  setNOTPVariable,
  updateScreenFromScreenState,
} from '../../src/lib/helpers/templates';

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
