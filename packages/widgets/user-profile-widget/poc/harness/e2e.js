// Drives the whole POC in a real browser: sign in on the app domain, add a
// passkey through the popup on the auth domain, and report what happened.
//
// Uses the installed Chrome (not Playwright's bundled Chromium) so that
// certificate checks go through the macOS keychain, where the mkcert root is
// trusted. A browser that is merely ignoring certificate errors refuses
// WebAuthn outright.
//
// The passkey itself is created by a virtual authenticator over CDP, so no
// Touch ID prompt is needed and the run is repeatable.

const { chromium } = require('playwright');
const fs = require('fs');

const APP = 'https://app.localtest.me:3101/';
const EMAIL = process.env.POC_EMAIL;
const MAILTM = JSON.parse(fs.readFileSync('/tmp/mailtm.json', 'utf8'));

const log = (...a) => console.log('[e2e]', ...a);

const seen = new Set();

const latestLink = async (hostMatch) => {
  for (let i = 0; i < 40; i++) {
    const res = await fetch('https://api.mail.tm/messages', {
      headers: { Authorization: `Bearer ${MAILTM.token}` },
    });
    const list = (await res.json())['hydra:member'] || [];
    for (const m of list) {
      if (seen.has(m.id)) continue;
      const full = await (
        await fetch(`https://api.mail.tm/messages/${m.id}`, {
          headers: { Authorization: `Bearer ${MAILTM.token}` },
        })
      ).json();
      const body = (full.html && full.html[0]) || full.text || '';
      const link = (body.match(/https:\/\/[^"'<> ]+/g) || [])
        .map((u) => u.replace(/&amp;/g, '&'))
        .find((u) => u.includes(hostMatch) && u.includes('descope-login-flow'));
      if (link) {
        seen.add(m.id);
        return link;
      }
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error(`no magic link for ${hostMatch}`);
};

// marks every message currently in the inbox as already handled, so a later
// wait picks up the next one rather than an old one
const drainInbox = async () => {
  const res = await fetch('https://api.mail.tm/messages', {
    headers: { Authorization: `Bearer ${MAILTM.token}` },
  });
  ((await res.json())['hydra:member'] || []).forEach((m) => seen.add(m.id));
};

const signInOn = async (page, hostMatch) => {
  await drainInbox();
  const box = page.getByRole('textbox').first();
  await box.waitFor({ state: 'visible', timeout: 25000 });
  await box.fill(EMAIL);
  // "Continue with Google" also starts with Continue, so anchor the end
  await page
    .getByRole('button', { name: /Continue$/ })
    .first()
    .click();
  const link = await latestLink(hostMatch);
  log('magic link ->', link.slice(0, 90) + '...');
  await page.goto(link, { waitUntil: 'domcontentloaded' });
};

(async () => {
  // With POC_PROFILE the browser keeps its cookies between runs, so a second
  // run still has the session on the auth domain. That is the steady state in
  // production: the user signed in through the auth domain, so a session is
  // already sitting there and the popup has no reason to ask again.
  // deliberately NOT ignoreHTTPSErrors - that is what breaks WebAuthn
  let browser = null;
  let context;
  if (process.env.POC_PROFILE) {
    context = await chromium.launchPersistentContext(process.env.POC_PROFILE, {
      channel: 'chrome',
      headless: false,
    });
  } else {
    browser = await chromium.launch({ channel: 'chrome', headless: false });
    context = await browser.newContext();
  }
  const page = context.pages()[0] || (await context.newPage());

  const result = { steps: [] };
  const step = (s) => {
    log(s);
    result.steps.push(s);
  };

  try {
    await page.goto(APP, { waitUntil: 'domcontentloaded' });

    step('1. app loaded on ' + new URL(APP).host);
    await page.waitForTimeout(3000);

    if (await page.getByText('Welcome!').count()) {
      await signInOn(page, 'app.localtest.me');
      step('2. signed in on the app domain');
    } else {
      step('2. already signed in on the app domain');
    }

    await page
      .getByText('Passkey', { exact: false })
      .first()
      .waitFor({ timeout: 20000 });
    step('3. user profile widget rendered');

    const popupPromise = context.waitForEvent('page', { timeout: 20000 });
    await page.getByText('Add', { exact: true }).first().click();
    const popup = await popupPromise;
    await popup.waitForLoadState('domcontentloaded');
    step('4. popup opened on ' + new URL(popup.url()).host);

    // the authenticator has to exist before the page calls credentials.create
    const cdp = await context.newCDPSession(popup);
    await cdp.send('WebAuthn.enable');
    const { authenticatorId } = await cdp.send(
      'WebAuthn.addVirtualAuthenticator',
      {
        options: {
          protocol: 'ctap2',
          transport: 'internal',
          hasResidentKey: true,
          hasUserVerification: true,
          isUserVerified: true,
          automaticPresenceSimulation: true,
        },
      },
    );
    step('5. virtual authenticator attached');

    await popup.waitForTimeout(4000);

    if (await popup.getByText('Welcome!').count()) {
      step('6. popup had no session on the auth domain, signing in there');
      await signInOn(popup, 'descope.internal');
    } else {
      step('6. popup was already signed in on the auth domain');
    }

    await popup
      .getByText('Add passkey', { exact: false })
      .first()
      .waitFor({ timeout: 25000 });
    step('7. passkey screen shown in the popup');

    // Subscribed before the click. Reading the authenticator afterwards races
    // the popup closing itself, and once it closes the CDP session goes with
    // it and every read comes back empty - which looks exactly like a ceremony
    // that never happened.
    const added = [];
    cdp.on('WebAuthn.credentialAdded', (e) => added.push(e));

    await popup.getByText('Add passkey', { exact: false }).first().click();

    // the popup closes itself once the flow reports success
    await popup.waitForEvent('close', { timeout: 30000 });
    step('8. popup closed itself');

    result.credentialsCreated = added.length;
    result.rpIdsSeenByBrowser = [
      ...new Set(added.map((e) => e.credential && e.credential.rpId)),
    ];
    step(
      '9. browser recorded rp id ' + JSON.stringify(result.rpIdsSeenByBrowser),
    );

    await page.waitForTimeout(4000);
    result.parentStillShowsWidget = !!(await page
      .getByText('Passkey', { exact: false })
      .count());
    step('10. parent refreshed without a reload');

    result.ok = true;
  } catch (e) {
    result.ok = false;
    result.error = String(e).split('\n')[0];
    for (const p of context.pages()) {
      const name = new URL(p.url()).host.replace(/[:.]/g, '_');
      await p
        .screenshot({ path: `${__dirname}/fail-${name}.png` })
        .catch(() => {});
      result.openPages = (result.openPages || []).concat(p.url());
    }
  }

  console.log('\n=== RESULT ===');
  console.log(JSON.stringify(result, null, 2));
  await (browser ? browser.close() : context.close());
  process.exit(result.ok ? 0 : 1);
})();
