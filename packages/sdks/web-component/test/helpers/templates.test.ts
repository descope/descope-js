import '@testing-library/jest-dom';
import { fireEvent, waitFor } from '@testing-library/dom';
import { screen } from 'shadow-dom-testing-library';
import {
  setNOTPVariable,
  syncPasswordPolicyEmail,
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

  describe('syncPasswordPolicyEmail', () => {
    const emailAttr = 'data-password-policy-value-email';

    it('should follow the email input on the same screen', () => {
      document.body.innerHTML = `<div>
        <input name="email" value="first@example.com">
        <descope-new-password name="newPassword"></descope-new-password>
      </div>`;
      const email = document.querySelector('input');
      const newPassword = document.querySelector('descope-new-password');

      syncPasswordPolicyEmail(document.body);
      expect(newPassword).toHaveAttribute(emailAttr, 'first@example.com');

      fireEvent.input(email, { target: { value: 'second@example.com' } });
      expect(newPassword).toHaveAttribute(emailAttr, 'second@example.com');
    });

    it('should fall back to the rendered email when the input is empty', () => {
      document.body.innerHTML = `<div>
        <input name="email">
        <descope-new-password ${emailAttr}="known@example.com"></descope-new-password>
        <descope-new-password></descope-new-password>
      </div>`;
      const email = document.querySelector('input');
      const [withEmail, withoutEmail] = Array.from(
        document.querySelectorAll('descope-new-password'),
      );

      syncPasswordPolicyEmail(document.body);
      expect(withEmail).toHaveAttribute(emailAttr, 'known@example.com');
      expect(withoutEmail).not.toHaveAttribute(emailAttr);

      fireEvent.input(email, { target: { value: 'typed@example.com' } });
      expect(withEmail).toHaveAttribute(emailAttr, 'typed@example.com');
      expect(withoutEmail).toHaveAttribute(emailAttr, 'typed@example.com');

      fireEvent.input(email, { target: { value: '' } });
      expect(withEmail).toHaveAttribute(emailAttr, 'known@example.com');
      expect(withoutEmail).not.toHaveAttribute(emailAttr);
    });

    it('should leave the new password untouched without an email input', () => {
      document.body.innerHTML = `<div>
        <input name="phone" value="+15555555555">
        <descope-new-password ${emailAttr}="known@example.com"></descope-new-password>
      </div>`;
      const newPassword = document.querySelector('descope-new-password');

      syncPasswordPolicyEmail(document.body);
      expect(newPassword).toHaveAttribute(emailAttr, 'known@example.com');
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
