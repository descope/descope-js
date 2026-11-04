import { openCenteredPopup } from '../src';

const URL = 'https://auth.example.com/login/P2Test?flow=add-passkey';
const TITLE = 'descope-widget-flow|https://app.example.com';

const fakePopup = () => ({ location: { href: '' }, focus: jest.fn() });

const setUserAgent = (ua: string) =>
  Object.defineProperty(window.navigator, 'userAgent', {
    value: ua,
    configurable: true,
  });

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const IPHONE_CHROME =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/118.0 Mobile/15E148 Safari/604.1';
const DESKTOP_CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0 Safari/537.36';

describe('openCenteredPopup', () => {
  let open: jest.Mock;

  beforeEach(() => {
    open = jest.fn();
    window.open = open as any;
    setUserAgent(DESKTOP_CHROME);
  });

  it('returns null when the browser blocks the popup', () => {
    open.mockReturnValue(null);

    // a blocked popup is a real case on iOS Safari, so this must not throw on
    // a property of null - the caller needs to be able to report it
    expect(() => openCenteredPopup(URL, TITLE, 480, 650)).not.toThrow();
    expect(openCenteredPopup(URL, TITLE, 480, 650)).toBeNull();
  });

  it('names the window at creation, because a later assignment is refused', () => {
    open.mockReturnValue(fakePopup());

    openCenteredPopup(URL, TITLE, 480, 650);

    expect(open.mock.calls[0][1]).toBe(TITLE);
  });

  it('navigates to the url after opening, and focuses the window', () => {
    const popup = fakePopup();
    open.mockReturnValue(popup);

    const returned = openCenteredPopup(URL, TITLE, 480, 650);

    expect(returned).toBe(popup);
    expect(popup.location.href).toBe(URL);
    expect(popup.focus).toHaveBeenCalled();
  });

  it('opens on a blank page first, so Safari cannot swap in its native dialog', () => {
    open.mockReturnValue(fakePopup());
    setUserAgent(IPHONE_SAFARI);

    openCenteredPopup(URL, TITLE, 480, 650);

    expect(open.mock.calls[0][0]).toBe('about:blank');
  });

  it('opens with no url elsewhere, including other browsers on an iPhone', () => {
    open.mockReturnValue(fakePopup());
    setUserAgent(IPHONE_CHROME);

    openCenteredPopup(URL, TITLE, 480, 650);

    expect(open.mock.calls[0][0]).toBe('');
  });

  it('centres on the screen the browser window is actually on', () => {
    open.mockReturnValue(fakePopup());
    Object.defineProperty(window, 'screenLeft', {
      value: 1000,
      configurable: true,
    });
    Object.defineProperty(window, 'screenTop', {
      value: 50,
      configurable: true,
    });
    Object.defineProperty(window, 'innerWidth', {
      value: 1200,
      configurable: true,
    });
    Object.defineProperty(window, 'innerHeight', {
      value: 900,
      configurable: true,
    });

    openCenteredPopup(URL, TITLE, 400, 300);

    // (1200 - 400) / 2 + 1000, and (900 - 300) / 2 + 50
    const features = open.mock.calls[0][2];
    expect(features).toContain('width=400');
    expect(features).toContain('height=300');
    expect(features).toContain('left=1400');
    expect(features).toContain('top=350');
  });
});
