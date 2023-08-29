import { waitFor } from '@testing-library/dom';
import { screen } from 'shadow-dom-testing-library';
import { replaceWithScreenState } from '../../src/lib/helpers/templates';

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

    replaceWithScreenState(document, {
      inputs: { email: 'email1', description: 'description1' },
    });
    await waitFor(() => screen.getByShadowDisplayValue('email1'));
  });

  it('should handle descope form', async () => {
    document.body.innerHTML = `<div>
			<input class="descope-input" name="email"></input>
		</div>`;

    replaceWithScreenState(document, {
      form: { email: 'email2' },
    });
    await waitFor(() => screen.getByShadowDisplayValue('email2'));
  });
});
