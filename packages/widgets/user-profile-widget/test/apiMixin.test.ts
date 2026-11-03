import createWebSdk from '@descope/web-js-sdk';
import { apiMixin } from '../src/lib/widget/mixins/apiMixin';

jest.mock('@descope/web-js-sdk', () => ({
  __esModule: true,
  default: jest.fn(() => ({ httpClient: {}, logout: jest.fn() })),
}));

describe('apiMixin', () => {
  const ApiElement = apiMixin(HTMLElement);
  if (!customElements.get('test-api-element')) {
    customElements.define('test-api-element', ApiElement);
  }

  let element: any;

  beforeEach(() => {
    element = document.createElement('test-api-element');
    element.setAttribute('project-id', 'mockProjectId');
  });

  it('passes session/refresh cookie configs from attributes to the web sdk', () => {
    element.setAttribute(
      'session-token-via-cookie',
      JSON.stringify({ domain: 'localhost', cookieName: 'my_ds' }),
    );
    element.setAttribute('refresh-token-via-cookie', 'true');

    expect(element.api).toBeDefined();
    expect(createWebSdk).toHaveBeenLastCalledWith(
      expect.objectContaining({
        projectId: 'mockProjectId',
        sessionTokenViaCookie: { domain: 'localhost', cookieName: 'my_ds' },
        refreshTokenViaCookie: true,
        persistTokens: true,
      }),
    );
  });

  it('ignores missing or invalid cookie config attributes', () => {
    element.setAttribute('session-token-via-cookie', '{not-json');

    expect(element.sessionTokenViaCookie).toBeUndefined();
    expect(element.refreshTokenViaCookie).toBeUndefined();
  });
});
