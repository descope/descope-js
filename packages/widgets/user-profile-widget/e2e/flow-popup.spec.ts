import { test, expect, Page } from '@playwright/test';
import { listenForWidgetReady, waitForWidgetReady } from '@descope/e2e-helpers';
import { componentsPort, widgetPort } from '../playwright.config';
import { mockUser } from '../test/mocks/mockUser';
import mockTheme from '../test/mocks/mockTheme';
import rootMock from '../test/mocks/rootMock';

// The e2e app is built with DESCOPE_WIDGET_ID=wid / DESCOPE_PROJECT_ID=pid.
const WIDGET_ID = 'wid';
const PROJECT_ID = 'pid';

const ORIGIN = `http://localhost:${widgetPort}`;
// stands in for the customer's own auth domain. Same origin as the app here,
// which is all the popup bridge needs - it checks the origin it was given.
const HOSTED_BASE = `${ORIGIN}/hosted`;

const baseConfig = {
  flows: { flow1: { version: 1 } },
  componentsVersion: '1.2.3',
};

const popupConfig = {
  ...baseConfig,
  hostedPageBaseUrl: HOSTED_BASE,
  widgets: { [WIDGET_ID]: { flowTarget: 'popup' } },
};

// what the backend publishes for a project that asked for popups but has no
// custom domain: the flag, and deliberately no url
const popupWithoutDomainConfig = {
  ...baseConfig,
  widgets: { [WIDGET_ID]: { flowTarget: 'popup' } },
};

// a project that HAS a custom domain but never turned popups on. This is the
// upgrade case: having somewhere to open a popup must not start opening them.
const domainButNotOptedInConfig = {
  ...baseConfig,
  hostedPageBaseUrl: HOSTED_BASE,
};

// the same, said out loud
const explicitModalConfig = {
  ...baseConfig,
  hostedPageBaseUrl: HOSTED_BASE,
  widgets: { [WIDGET_ID]: { flowTarget: 'modal' } },
};

/**
 * Stands in for auth-hosting's page. Reports back the way the real one does -
 * to the origin named in `window.name`, and only ever an action, never tokens.
 */
const HOSTED_PAGE = `<!doctype html><html><body><p>flow</p><script>
  const [, openerOrigin] = (window.name || '').split('|');
  window.report = (action) => window.opener.postMessage({ action }, openerOrigin);
</script></body></html>`;

const FLOW_ID = 'my-test-flow';
const genericFlowButtonRoot = `<descope-button data-generic-flow-button-id="test-btn" flow-id="${FLOW_ID}">Run Flow</descope-button>`;

const setup = async (page: Page, config: unknown, root = rootMock) => {
  await listenForWidgetReady(page);

  await page.addInitScript((port) => {
    window.localStorage.setItem(
      'base.ui.components.url',
      `http://localhost:${port}/umd/index.js`,
    );

    window.customElements.define(
      'descope-wc',
      class extends HTMLElement {
        connectedCallback() {
          this.innerHTML = '<button>Finish Flow</button>';
          this.querySelector('button').onclick = () => {
            this.dispatchEvent(new CustomEvent('success'));
          };
        }
      },
    );
  }, componentsPort);

  // on the context, not the page: the popup is a page of its own
  await page
    .context()
    .route('**/hosted/**', async (route) =>
      route.fulfill({ contentType: 'text/html', body: HOSTED_PAGE }),
    );
  await page.route('*/**/config.json', async (route) =>
    route.fulfill({ json: config }),
  );
  await page.route('*/**/theme.json', async (route) =>
    route.fulfill({ json: mockTheme }),
  );
  await page.route('*/**/root.html', async (route) =>
    route.fulfill({ body: root }),
  );
  await page.route('**/auth/me', async (route) =>
    route.fulfill({ json: mockUser }),
  );
  await page.route('**/auth/refresh', async (route) =>
    route.fulfill({ json: { sessionJwt: 'mock' } }),
  );
  await page.route('**/auth/logout', async (route) =>
    route.fulfill({ json: {} }),
  );
  // see "does not re-check again on every alt-tab"
  await page.route('**/alt-tab-sentinel', async (route) =>
    route.fulfill({ json: {} }),
  );
  await page.route('**/v1/mgmt/user/passkeys/list', async (route) =>
    route.fulfill({ json: { passkeys: [] } }),
  );
  await page.route('**/v1/mgmt/widget/components-state', async (route) =>
    route.fulfill({ json: { componentsState: {} } }),
  );

  await page.goto(ORIGIN);
  await waitForWidgetReady(page);
};

/**
 * Firefox and WebKit hand back the popup while it is still on about:blank, so
 * reading `url()` straight away sees nothing. Chromium happens to be further
 * along, which is why this is easy to miss.
 */
const settledPopup = async (popup: Page) => {
  await popup.waitForURL(/\/hosted\//);
  await popup.waitForLoadState();
  return popup;
};

const editEmailButton = (page: Page) =>
  page
    .locator('descope-user-attribute[data-id="email"]')
    .first()
    .locator('descope-button[data-id="edit-btn"]')
    .first();

test.describe('flows in a popup', () => {
  test.describe('when the project published a hosted page url', () => {
    test.beforeEach(async ({ page }) => {
      await setup(page, popupConfig);
    });

    test('opens the flow on the auth domain instead of in a modal', async ({
      page,
    }) => {
      const popupPromise = page.waitForEvent('popup');
      await editEmailButton(page).click();
      const popup = await settledPopup(await popupPromise);

      // the project goes in the path, which is where auth-hosting reads it
      expect(popup.url()).toContain(`${HOSTED_BASE}/${PROJECT_ID}`);
      expect(new URL(popup.url()).searchParams.get('flow')).toBeTruthy();

      // a passkey belongs to the domain that created it, so the whole point is
      // that no modal runs this flow on the app's own origin
      await expect(
        page.locator('descope-modal[data-id="edit-email"]'),
      ).toHaveCount(0);
    });

    test('never hands the popup an api base url or a cookie name', async ({
      page,
    }) => {
      const popupPromise = page.waitForEvent('popup');
      await editEmailButton(page).click();
      const params = new URL((await settledPopup(await popupPromise)).url())
        .searchParams;

      // the page in the popup resolves these from its own environment, so an
      // opener cannot tell it where to send credentials
      expect(params.get('base-url')).toBeNull();
      expect(params.get('baseUrl')).toBeNull();
      expect(params.get('refresh-cookie-name')).toBeNull();
    });

    test('refreshes the widget when the popup reports it finished', async ({
      page,
    }) => {
      const popupPromise = page.waitForEvent('popup');
      await editEmailButton(page).click();
      const popup = await settledPopup(await popupPromise);

      // the popup never sends tokens - the opener refreshes with its own
      const refreshRequest = page.waitForRequest((req) =>
        req.url().includes('/auth/refresh'),
      );

      await popup.evaluate(() => (window as any).report('widget-flow-done'));

      await refreshRequest;
    });

    test('asks the app to sign in again when the auth domain does not know the user', async ({
      page,
    }) => {
      // a binding rather than a flag on window: the app navigates away to its
      // login page when it hears `logout`, which would wipe any page state
      let sawLogout: () => void;
      const logoutHeard = new Promise<void>((resolve) => {
        sawLogout = resolve;
      });
      await page.exposeFunction('reportLogout', () => sawLogout());
      await page.evaluate(() => {
        document
          .querySelector('descope-user-profile-widget')
          .addEventListener('logout', () => (window as any).reportLogout());
      });

      const popupPromise = page.waitForEvent('popup');
      await editEmailButton(page).click();
      const popup = await settledPopup(await popupPromise);

      // the popup cannot sign anyone in: it runs the project's own sign-in
      // flow, which may send a link and strand the user in another tab
      await popup.evaluate(() =>
        (window as any).report('widget-flow-unauthenticated'),
      );

      await logoutHeard;
    });
  });

  test.describe('coming back to the app', () => {
    test.beforeEach(async ({ page }) => {
      await setup(page, popupConfig);
    });

    test('re-checks the user, because the flow may have finished out of reach', async ({
      page,
    }) => {
      const popupPromise = page.waitForEvent('popup');
      await editEmailButton(page).click();
      await settledPopup(await popupPromise);

      // the flow could have been finished in the tab an emailed link opened,
      // or on a phone - nothing can report back from there
      const refreshed = page.waitForRequest(
        (req) => req.url().includes('/auth/refresh'),
        { timeout: 15000 },
      );
      await page.bringToFront();
      await page.evaluate(() => window.dispatchEvent(new Event('focus')));

      await refreshed;
    });

    test('does not re-check again on every alt-tab', async ({ page }) => {
      const popupPromise = page.waitForEvent('popup');
      await editEmailButton(page).click();
      await settledPopup(await popupPromise);

      let refreshes = 0;
      page.on('request', (req) => {
        if (req.url().includes('/auth/refresh')) refreshes += 1;
      });

      await page.bringToFront();
      for (let i = 0; i < 4; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await page.evaluate(() => window.dispatchEvent(new Event('focus')));
      }

      // Something concrete to wait for instead of a sleep. The focus handler
      // starts its request before it yields, so a request this test asks for
      // afterwards - a whole round trip later - cannot overtake one the widget
      // was going to make.
      const sentinel = page.waitForRequest((req) =>
        req.url().includes('/alt-tab-sentinel'),
      );
      await page.evaluate(() => fetch('/alt-tab-sentinel').catch(() => {}));
      await sentinel;

      expect(refreshes).toBe(1);
    });
  });

  test.describe('generic flow button', () => {
    test.beforeEach(async ({ page }) => {
      await setup(page, popupConfig, genericFlowButtonRoot);
    });

    test('sends its own flow and the user id to the auth domain', async ({
      page,
    }) => {
      const popupPromise = page.waitForEvent('popup');
      await page.locator('[data-generic-flow-button-id]').first().click();
      const params = new URL((await settledPopup(await popupPromise)).url())
        .searchParams;

      // every button shares one runner, so the flow has to come from the click
      expect(params.get('flow')).toBe(FLOW_ID);
      expect(params.get('client.userId')).toBe(mockUser.userId);
    });
  });

  test.describe('when the project has no custom domain', () => {
    test.beforeEach(async ({ page }) => {
      await setup(page, popupWithoutDomainConfig);
    });

    test('falls back to a modal rather than leaving the button dead', async ({
      page,
    }) => {
      await editEmailButton(page).click();

      await expect(
        page.locator('descope-modal[data-id="edit-email"]'),
      ).toHaveAttribute('opened');
    });
  });

  test.describe('when the project has a custom domain but never opted in', () => {
    test.beforeEach(async ({ page }) => {
      await setup(page, domainButNotOptedInConfig);
    });

    test('keeps using a modal - a domain alone must not change anything', async ({
      page,
    }) => {
      const sawPopup = page
        .context()
        .waitForEvent('page', { timeout: 4000 })
        .then(() => true)
        .catch(() => false);

      await editEmailButton(page).click();

      await expect(
        page.locator('descope-modal[data-id="edit-email"]'),
      ).toHaveAttribute('opened');
      expect(await sawPopup).toBe(false);
    });
  });

  test.describe('when the project asked for a modal in so many words', () => {
    test.beforeEach(async ({ page }) => {
      await setup(page, explicitModalConfig);
    });

    test('runs the flow in a modal even though a url is published', async ({
      page,
    }) => {
      await editEmailButton(page).click();

      await expect(
        page.locator('descope-modal[data-id="edit-email"]'),
      ).toHaveAttribute('opened');
    });
  });

  test.describe('when the project did not ask for popups', () => {
    test.beforeEach(async ({ page }) => {
      await setup(page, baseConfig);
    });

    test('keeps running flows in a modal, exactly as before', async ({
      page,
    }) => {
      await editEmailButton(page).click();

      await expect(
        page.locator('descope-modal[data-id="edit-email"]'),
      ).toHaveAttribute('opened');
    });
  });
});
