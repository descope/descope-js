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
			<textarea class="descope-input" name="description">
		</div>`;

    replaceWithScreenState(document, {
      inputs: { email: 'email1', description: 'description1' },
    });
    await waitFor(() => screen.getByShadowDisplayValue('email1'));
    await waitFor(() => screen.getByShadowDisplayValue('description1'));
  });

  it('should handle descope form', async () => {
    document.body.innerHTML = `<div>
			<input class="descope-input" name="email">
			<textarea class="descope-input" name="description">
		</div>`;

    replaceWithScreenState(document, {
      form: { email: 'email2', description: 'description2' },
    });
    await waitFor(() => screen.getByShadowDisplayValue('email2'));
    await waitFor(() => screen.getByShadowDisplayValue('description2'));
  });
});
