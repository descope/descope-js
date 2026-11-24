import { getSuccessRedirectUrl } from '../src/lib/widget/mixins/initMixin/initComponentsMixins/initGenericFlowButtonMixin';

const successEvent = (flowOutput?: Record<string, unknown>) =>
  ({ detail: { flowOutput } }) as unknown as CustomEvent;

describe('getSuccessRedirectUrl', () => {
  it('returns an https onSuccessRedirectUrl', () => {
    expect(
      getSuccessRedirectUrl(
        successEvent({ onSuccessRedirectUrl: 'https://app.example/home' }),
      ),
    ).toBe('https://app.example/home');
  });

  it('allows http', () => {
    expect(
      getSuccessRedirectUrl(
        successEvent({ onSuccessRedirectUrl: 'http://localhost:3000/' }),
      ),
    ).toBe('http://localhost:3000/');
  });

  it.each([
    // the payloads under test - nothing is navigated or evaluated
    // eslint-disable-next-line no-script-url
    'javascript:alert(1)',
    // eslint-disable-next-line no-script-url
    'JaVaScRiPt:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
  ])('rejects the non-http(s) url %s', (url) => {
    expect(
      getSuccessRedirectUrl(successEvent({ onSuccessRedirectUrl: url })),
    ).toBeNull();
  });

  it.each([
    ['no detail', {} as unknown as CustomEvent],
    ['no flow output', successEvent()],
    ['no redirect key', successEvent({ other: 'x' })],
    ['empty string', successEvent({ onSuccessRedirectUrl: '' })],
    ['non-string', successEvent({ onSuccessRedirectUrl: 42 })],
  ])('returns null for %s', (_, e) => {
    expect(getSuccessRedirectUrl(e)).toBeNull();
  });
});
