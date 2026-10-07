// The customer's experience, end to end: sign in ONCE through the auth domain
// (OIDC), then add a passkey from the widget without being asked to sign in
// again. Counts every login screen it sees, because that is the whole point.

const { chromium } = require('playwright');
const fs = require('fs');

const APP = 'https://app.localtest.me:3101/oidc.html';
const EMAIL = process.env.POC_EMAIL;
const MAILTM = JSON.parse(fs.readFileSync('/tmp/mailtm.json', 'utf8'));

const log = (...a) => console.log('[oidc-e2e]', ...a);
const seen = new Set();

const drain = async () => {
  const r = await fetch('https://api.mail.tm/messages', {
    headers: { Authorization: `Bearer ${MAILTM.token}` },
  });
  ((await r.json())['hydra:member'] || []).forEach((m) => seen.add(m.id));
};

const magicLink = async () => {
  for (let i = 0; i < 40; i++) {
    const r = await fetch('https://api.mail.tm/messages', {
      headers: { Authorization: `Bearer ${MAILTM.token}` },
    });
    for (const m of (await r.json())['hydra:member'] || []) {
      if (seen.has(m.id)) continue;
      const full = await (
        await fetch(`https://api.mail.tm/messages/${m.id}`, {
          headers: { Authorization: `Bearer ${MAILTM.token}` },
        })
      ).json();
      const body = (full.html && full.html[0]) || full.text || '';
      const link = (body.match(/https:\/\/[^"'<> ]+/g) || [])
        .map((u) => u.replace(/&amp;/g, '&'))
        .find((u) => u.includes('descope-login-flow'));
      if (link) {
        seen.add(m.id);
        return link;
      }
    }
    await new Promise((r2) => setTimeout(r2, 1500));
  }
  throw new Error('no magic link');
};

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: false });
  const ctx = await browser.newContext();
  const wirePageLogging = (p) => {
    p.on('console', (m) => {
      const t = m.text();
      if (/\[poc\]/.test(t)) console.log('   [page]', t.slice(0, 220));
    });
    p.on('response', async (r) => {
      if (!/\/v1\/auth\/|\/v1\/mgmt\/|\/oauth2\/|passkey/i.test(r.url()))
        return;
      const body =
        r.status() >= 400 ? (await r.text().catch(() => '')).slice(0, 160) : '';
      const line = `   [net] ${r.status()} ${r
        .url()
        .replace(/^https:\/\/[^/]+/, '')
        .slice(0, 60)} ${body}`;
      console.log(line);
      parentCalls.push(line.trim());
    });
  };

  const parentCalls = [];
  let page = await ctx.newPage();
  wirePageLogging(page);
  const result = { steps: [], loginScreensShown: 0 };
  const step = (s) => {
    log(s);
    result.steps.push(s);
  };

  try {
    await drain();
    await page.goto(APP, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(5000);
    step('1. app redirected to the auth domain: ' + new URL(page.url()).host);

    // --- the one and only login -------------------------------------
    const box = page.getByRole('textbox').first();
    await box.waitFor({ state: 'visible', timeout: 25000 });
    result.loginScreensShown++;
    await box.fill(EMAIL);
    await page
      .getByRole('button', { name: /Continue$/ })
      .first()
      .click();
    const link = await magicLink();
    // Opened in a NEW tab on purpose. That is what happens when a real person
    // clicks the link in their mail client, and it is a different situation
    // from navigating the same tab: anything the first tab kept in
    // sessionStorage is not there any more.
    await page.close();
    page = await ctx.newPage();
    wirePageLogging(page);
    await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(9000);
    step(
      '2. signed in ONCE on the auth domain (link opened in a new tab), back at: ' +
        new URL(page.url()).host,
    );

    await page
      .getByText('Passkey', { exact: false })
      .first()
      .waitFor({ timeout: 25000 });
    step('3. widget rendered on the app, no second login');

    // Snapshot of what the parent shows BEFORE the popup runs, so the refresh
    // afterwards is visible rather than claimed.
    // The widget renders inside shadow roots. Playwright's role locators see
    // through them, so the button labels are the honest read of what the user
    // is actually looking at.
    const authSection = async () => {
      const names = await page
        .getByRole('button')
        .evaluateAll((els) =>
          els
            .map((e) => (e.textContent || '').replace(/\s+/g, ' ').trim())
            .filter(Boolean),
        );
      return [...new Set(names)].join(' | ');
    };
    result.parentBeforePopup = await authSection();
    console.log('   [parent before]', result.parentBeforePopup);
    parentCalls.length = 0; // only care about what the parent does from here on

    const popupPromise = ctx.waitForEvent('page', { timeout: 20000 });
    await page.getByText('Add', { exact: true }).first().click();
    const popup = await popupPromise;
    await popup.waitForLoadState('domcontentloaded');
    step('4. popup opened on ' + new URL(popup.url()).host);

    const cdp = await ctx.newCDPSession(popup);
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
    const added = [];
    cdp.on('WebAuthn.credentialAdded', (e) => added.push(e));

    await popup.waitForTimeout(5000);

    // the thing we are actually testing
    const askedAgain = await popup.getByText('Welcome!').count();
    result.popupAskedForLogin = !!askedAgain;
    if (askedAgain) result.loginScreensShown++;
    step('5. did the popup ask for login? ' + (askedAgain ? 'YES' : 'NO'));

    await popup
      .getByText('Add passkey', { exact: false })
      .first()
      .waitFor({ timeout: 25000 });
    await popup.getByText('Add passkey', { exact: false }).first().click();
    await popup.waitForEvent('close', { timeout: 30000 });
    step('6. passkey created, popup closed itself');

    result.rpIdsSeenByBrowser = [
      ...new Set(added.map((e) => e.credential && e.credential.rpId)),
    ];
    step(
      '7. browser recorded rp id ' + JSON.stringify(result.rpIdsSeenByBrowser),
    );

    // No reload anywhere in this script - if the text changed, the parent
    // re-read the user by itself after the popup closed.
    await page.waitForTimeout(5000);
    result.parentAfterPopup = await authSection();
    console.log('   [parent after ]', result.parentAfterPopup);
    // The buttons stay the same ("Add" is still offered, you can have more
    // than one passkey), so the honest signal is whether the PARENT page went
    // back to the server by itself after the popup closed. No reload happened.
    result.parentCallsAfterPopup = parentCalls;
    result.parentRefreshedSession = parentCalls.some((c) =>
      c.includes('/v1/auth/refresh'),
    );
    result.parentReReadUser = parentCalls.some((c) =>
      c.includes('/v1/auth/me'),
    );
    step(
      '8. after the popup closed, parent called: ' +
        (parentCalls.length
          ? parentCalls.map((c) => c.split(' ')[2]).join(', ')
          : 'nothing'),
    );

    result.ok = true;
  } catch (e) {
    result.ok = false;
    result.error = String(e).split('\n')[0].slice(0, 160);
    for (const p of ctx.pages())
      result.openPages = (result.openPages || []).concat(p.url().slice(0, 110));
  }

  console.log('\n=== RESULT ===');
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
  process.exit(result.ok ? 0 : 1);
})();
