// A flow that sends a link finishes in a DIFFERENT window from the one that
// started it, and the user often leaves the first window open. This proves the
// app still gets told.
//
// Scenario: reset-password (one of four stock widget flows that use a link)
// runs in the popup on the auth domain. The user clicks the emailed link, which
// their mail client opens in a NEW TAB, and finishes there. The popup is never
// touched.
//
// What makes it work: both windows are running popup-flow.html on the same
// origin, so the tab that finishes broadcasts "done" and the window holding the
// opener relays it to the app and closes itself.
//
// Limitation this test cannot cover: if the user opens the email on another
// device there is no same-origin tab to receive the broadcast. The popup then
// stays on "you can now close this window" and the app is told when the user
// closes it, via the opener's closed-poll. Degraded, not broken.

const { chromium } = require('playwright');
const fs = require('fs');

const P = process.env.POC_PROJECT_ID || 'P3HmRBOz7fQNZ6Fr4KtdxGeH1Quu';
const AUTH = process.env.POC_AUTH_ORIGIN || 'https://descope.internal:3100';
const APP_ORIGIN =
  process.env.POC_APP_ORIGIN || 'https://app.localtest.me:3101';
const FLOW = 'user-profile-reset-password';
const EMAIL = process.env.POC_EMAIL;
const NEWPASS = 'Str0ng!Passw0rd#2026';
const MAILTM = JSON.parse(fs.readFileSync(process.env.MAILTM_FILE, 'utf8'));

const log = (...a) => console.log('[magiclink-e2e]', ...a);

const seen = new Set();
const drain = async () => {
  const r = await fetch('https://api.mail.tm/messages', {
    headers: { Authorization: `Bearer ${MAILTM.token}` },
  });
  ((await r.json())['hydra:member'] || []).forEach((m) => seen.add(m.id));
};
const linkFor = async () => {
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
  throw new Error('no emailed link arrived');
};

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: false });
  const ctx = await browser.newContext();
  const popup = await ctx.newPage();
  const result = { steps: [] };
  const step = (s) => {
    log(s);
    result.steps.push(s);
  };

  try {
    // sign in on the auth domain so the flow has a user
    await drain();
    await popup.goto(
      `${AUTH}/popup-flow.html?project=${P}&flow=sign-up-or-in`,
      { waitUntil: 'domcontentloaded' },
    );
    await popup
      .getByRole('textbox')
      .first()
      .waitFor({ state: 'visible', timeout: 25000 });
    await popup.getByRole('textbox').first().fill(EMAIL);
    await popup
      .getByRole('button', { name: /Continue$/ })
      .first()
      .click();
    await popup.goto(await linkFor(), { waitUntil: 'domcontentloaded' });
    await popup.waitForTimeout(6000);
    step('1. signed in on the auth domain');

    // run the link-based flow as if the widget had opened this popup
    await drain();
    await popup.goto(`${AUTH}/popup-flow.html?project=${P}&flow=${FLOW}`, {
      waitUntil: 'domcontentloaded',
    });
    await popup.waitForTimeout(6000);
    // Playwright cannot give us a window actually opened by script, so stand in
    // for the opener and record what the page posts to it.
    await popup.evaluate((origin) => {
      window.name = `descope-widget-flow|${origin}`;
      window.__posted = [];
      Object.defineProperty(window, 'opener', {
        value: { postMessage: (m) => window.__posted.push(m) },
        configurable: true,
      });
    }, APP_ORIGIN);
    await popup
      .getByRole('button', { name: /Reset password/i })
      .first()
      .click();
    await popup.waitForTimeout(6000);
    step('2. popup is waiting on the emailed link');

    // the mail client opens the link in a new tab
    const mailTab = await ctx.newPage();
    await mailTab.goto(await linkFor(), { waitUntil: 'domcontentloaded' });
    await mailTab.waitForTimeout(7000);
    const pw = mailTab.locator('input[type=password]');
    await pw.nth(0).fill(NEWPASS);
    if ((await pw.count()) > 1) await pw.nth(1).fill(NEWPASS);
    await mailTab
      .getByRole('button', { name: /Reset password|Submit|Continue/i })
      .last()
      .click();
    await mailTab.waitForTimeout(8000);
    step('3. finished the flow in the email tab');

    // the flow only reaches its End step (and fires success) once this is clicked
    await mailTab
      .getByRole('button', { name: /^\s*Close\s*$/i })
      .last()
      .click()
      .catch(() => {});
    await mailTab.waitForTimeout(6000);
    step('4. clicked Close, which is what completes the flow');

    // THE ASSERTION: the popup told the app, without the user touching it
    await popup.waitForTimeout(6000);
    result.popupPostedToOpener = await popup.evaluate(
      () => window.__posted || [],
    );
    result.appWasNotified = result.popupPostedToOpener.some(
      (m) => m && m.action === 'widget-flow-done',
    );
    step(
      '5. app notified without the user closing the popup? ' +
        (result.appWasNotified ? 'YES' : 'NO'),
    );

    result.ok = result.appWasNotified;
    if (!result.ok)
      result.error = 'the popup never relayed completion to the app';
  } catch (e) {
    result.ok = false;
    result.error = String(e).split('\n')[0].slice(0, 170);
  }

  console.log('\n=== RESULT ===');
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
  process.exit(result.ok ? 0 : 1);
})();
