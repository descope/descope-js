# Cross-domain passkey POC

Scaffolding for proving that a passkey created in a popup on the auth domain
works across apps on unrelated domains. **Local only. Not part of the package
build**, not deployed, and safe to delete if the POC is dropped.

Phase 2 replaces `popup-flow.html` with `auth-hosting`, which already reads the
same query parameters.

## Why two hostnames

A passkey belongs to one domain. The whole point is to prove that one created on
the **auth** domain works from an app on a **different registrable domain**. Two
ports on `localhost` share the host `localhost`, so that setup would pass
trivially and prove nothing.

```
auth side   descope.internal       already in /etc/hosts from the local stack
app side    app.localtest.me       public DNS, resolves to 127.0.0.1
```

Measured 2026-10-04: Chrome and Safari both treat these as different sites, and
a `SameSite=Strict` cookie is withheld from a cross-site popup's first request
while still being sent on that page's own calls back to its domain. That is
exactly the production behaviour, so this reproduces the real case.

No `/etc/hosts` edit and no sudo needed.

## Setup

**1. Certificates.** One cert covers both names:

```sh
mkcert -install
mkcert descope.internal app.localtest.me
```

The certificate must be genuinely trusted, not clicked through. See
"WebAuthn and certificates" below - this is the single easiest way to lose an
afternoon.

**2. Serve this page on `descope.internal:3100`** over HTTPS with that cert.
Serve the local API from the same origin too, under `/v1/*` and `/v2/*`: the
local backend presents Descope's own CA, which Chrome will not accept for a
cross-origin request, and in production the custom domain serves the page and
the API together anyway.

**3a. For the one-login (OIDC) demo**, serve three files on the app host. Both
bundles register themselves, so the page is plain static html with two script
tags - no build step of its own:

```sh
npm run build                                   # refresh dist, see the note
cp poc/oidc-app.html                 <harness>/app/oidc.html
cp dist/index.js                     <harness>/app/widget.js
cp ../../sdks/web-js-sdk/dist/index.umd.js  <harness>/app/descope-sdk.js
```

Open `https://app.localtest.me:3101/oidc.html`. It has no login form: it sends
you to the auth domain, and after that one login the passkey popup is silent.
Edit the three constants at the top of `oidc-app.html` for your own stack.

**Rebuild `dist` after changing widget source.** It is easy to serve a stale
bundle and spend a while debugging the POC instead of your change. The symptom
that caught me: everything worked up to the ceremony, then the popup never
closed.

`node poc/harness/e2e-oidc.js` runs the whole thing unattended with a virtual
authenticator, so no Touch ID prompt, and asserts the popup never asked for a
second login.

**3b. The two-login variant** is the widget's own demo app, which signs the user
in on the app's domain and then mounts the widget. The popup then has to ask for
a login once, because the auth domain has no session. Useful for showing the
contrast. Build it with a `.env`:

```sh
# packages/widgets/user-profile-widget/.env   (gitignored)
DESCOPE_PROJECT_ID=<your local project>
DESCOPE_BASE_URL=https://descope.internal:3100
DESCOPE_BASE_STATIC_URL=https://static.local.descope.org/pages
DESCOPE_WIDGET_ID=user-profile-widget
DESCOPE_FLOW_TARGET=popup
DESCOPE_FLOW_POPUP_URL=https://descope.internal:3100/popup-flow.html
```

```sh
npm run build:app
```

Serve `build/` on `app.localtest.me:3101` with the same cert. It **must** be a
different host from step 2 or the test is same-site and proves nothing.

The last two variables are the only POC-specific part. Leave them out and the
demo app behaves exactly as it always has, with flows in a modal.

**4. Check `BASE_URL` and `BASE_STATIC_URL` in `popup-flow.html`.** They are
deliberately not query parameters: the opener must not get to say where this
page sends credentials. Without `BASE_STATIC_URL` the component silently falls
back to Descope's production static host and loads someone else's config.

**5. Project settings: none.** Passkeys have to be enabled, and that is it.

Tested on 2026-10-07 by putting every setting back to its default and running
`harness/e2e-oidc.js` again. All of these were changed during development and
all turned out to be unnecessary:

| Setting               | Tried              | Also works at                       |
| --------------------- | ------------------ | ----------------------------------- |
| `relyingPartyId`      | `descope.internal` | **unset**                           |
| `cookiePolicy`        | 4 (None)           | **3 (Strict)**, the console default |
| `tokenResponseMethod` | `onBody`           | **`cookie`**, the default           |

Two of those are worth understanding, because they come up with customers:

- **No relying party id is needed.** With none set it defaults to the domain the
  flow runs on, and the flow runs in the popup, on the auth domain. So the
  passkey binds there by itself. Setting it explicitly is still better in
  production, so the binding does not depend on where a flow happens to run.
- **`SameSite=Strict` does not break the popup.** Strict is withheld only on the
  popup's first document request, which is a cross-site navigation. After that
  the popup is a top level window on the auth domain, so its own calls back to
  that domain are same-site and the cookie is sent.

## WebAuthn and certificates

Chrome refuses WebAuthn on any page it considers to have a TLS error, and
"the user clicked through the warning" still counts as an error. The failure is
silent in the page - the button simply does nothing - and only the backend log
names it:

```
"failure":"NotAllowedError",
"failure_message":"WebAuthn is not supported on sites with TLS certificate errors."
```

Two things put you in that state:

- The mkcert root is not trusted. Check with
  `curl https://descope.internal:3100/popup-flow.html` and no `-k`: it must
  succeed.
- **The browser was started with certificate errors ignored.** An automated
  Chrome - Puppeteer, Playwright, the Chrome DevTools MCP - does this, so every
  page shows "Not Secure" and every passkey ceremony fails there no matter how
  good the certificate is. Run the passkey part of the demo in a normal Chrome.

## What is in here

```
popup-flow.html     served on the AUTH domain. The page the popup opens, and
                    also the OIDC login page - see below, they are one page
oidc-app.html       served on the APP domain. No login form: it redirects to
                    the auth domain, swaps the code for tokens, shows the widget
harness/serve.js    two HTTPS servers: the auth domain (3100, plus an API
                    proxy) and the app domain (3101)
harness/e2e-oidc.js the one-login run: sign in once, add a passkey, assert
                    the popup never asked again
harness/e2e.js      the same without OIDC, where the popup does ask once
harness/e2e-magiclink.js  a link-based flow finishing in the email tab, and
                    the app being told without the user closing the popup
```

Every harness script needs `MAILTM_FILE` (a json file with a mail.tm `token`)
and `POC_EMAIL`, and must run with `NODE_PATH` pointing at the repo's
`node_modules` so it can find Playwright.

Certificates are deliberately not here. Generate your own with mkcert, below.

## One login, not two

The app does not have its own login form. It sends the user to the auth domain,
which is what OIDC does, and that is the whole trick: **the session the popup
later reuses is created by that redirect.** Signing in on the app's own domain
cannot create it, because the auth domain's cookies are third party from the
app's page and browsers block them.

The chain, all local:

1. App has no session, so it redirects to
   `/oauth2/v1/<projectId>/authorize` on the auth domain.
2. Authorize redirects to `/login/<projectId>` - this page. The user signs in
   **here**, so the auth domain gets its own session cookie.
3. Back to the app with a one time code.
4. The app swaps the code for tokens. PKCE, no client secret, so this is
   plain browser code with no server side.
5. The app hands those tokens to the SDK and the widget renders.
6. "Add passkey" opens the popup on the auth domain, which already has the
   session from step 2, so it does not ask again.

Two things that are easy to get wrong here:

- **This page needs no OIDC code of its own.** `descope-wc` reads `state_id`
  and `sso_app_id` off the url itself, sends them with the flow start, and
  follows the redirect at the end. auth-hosting does not read them either. A
  login page is just a page that runs the flow.
- **`refresh(token)` does not store the token you give it.** It uses it for
  that one request and nothing else, so the next call has nothing to send. The
  sdk's own way to hand it tokens fetched elsewhere is
  `sdk.httpClient.hooks.afterRequest({}, new Response(JSON.stringify(tokens)))`,
  which is what its OIDC support does. The body is normalized, so the raw
  `access_token` / `refresh_token` naming goes in unchanged.

## The PKCE verifier and magic links

The verifier is kept in `localStorage`, not `sessionStorage`. A magic link is
clicked in the mail client, which opens a **new tab**, and `sessionStorage`
does not cross tabs. Without the verifier the token endpoint falls back to
demanding a client secret and the exchange fails with "missing secret".

This is a property of magic links, not of OIDC. A server side app keeps the
verifier in its session and never has the problem; a browser only app that does
not use magic links can use `sessionStorage` as usual.

## Flows that send a link, and the window that is left behind

Four stock widget flows send an emailed or texted link: reset password, set
phone, set recovery email, set recovery phone. These are defaults, not
customisations.

Such a flow **finishes in a different window from the one that started it**. The
user clicks the link in their mail client, which opens a new tab, and the flow
completes there. Two things make this awkward, and both are easy to misdiagnose:

- **The popup never fires `success`.** It polls, sees the flow moved elsewhere,
  shows "you can now close this window", and stops. It cannot detect completion
  by itself.
- **`success` does not fire when the last screen appears.** "Your password was
  updated successfully" has a Close button, and the flow only reaches its
  `logged-in` End step when that is clicked. A test that stops at the success
  screen will wrongly conclude nothing fires.

So without help the app is only told when the user closes the popup - and people
leave that window open.

**How it is solved.** Both windows run this page on the same origin, so the tab
that finishes broadcasts "done" on a `BroadcastChannel` keyed on project and
flow, and the window holding the opener relays it to the app and closes itself.
A dozen lines in `popup-flow.html`; `harness/e2e-magiclink.js` proves it:

```
emailTabEvents:      ["page-updated", "success"]
popupPostedToOpener: [{ "action": "widget-flow-done" }]
```

**Known limitation: another device.** Open the email on your phone and there is
no same-origin tab to hear the broadcast. The popup stays on "you can now close
this window" and the app is told when the user closes it. Degraded, not broken -
the flow still completes and the data is still correct.

**Known limitation: the sign-in fallback.** If the popup has no session AND the
sign-in uses a link, the returning tab resumes a different execution than the
one the page is set up for. In the real design the popup always has a session,
because the user reached the app through the auth domain, so this cannot arise.

## The popup signs in when it has to

The popup runs on its own origin with its own session. The app's session does
not reach it. In production there is already a session there, because the app
got its own session from that domain in the first place.

When there is not one, `/v1/flow/start` answers 401 and the flow cannot run.
`popup-flow.html` catches the component's `error` event and runs
`sign-up-or-in` first, then the flow that was actually asked for. The component
ignores a sign-in resume link on an element whose flow id does not match
("Flow id does not match the execution flow id"), so the target flow cannot
finish early and close the window before the passkey is created.

**Cookies ignore ports.** `descope.internal:3100` shares cookies with the local
console on `descope.internal:8080` and the backend on `:8443`. So the popup can
pick up a refresh cookie belonging to a **different project** and fail with:

```
[E064003] Invalid Refresh Token JWT was provided
... No match on key ID from keys, please make sure you are using the JWT from the right project
```

The sign-in fallback above recovers from this too - signing in replaces the
cookie with one for this project. Worth knowing because the error text points at
the token rather than at the real cause, which is the shared hostname.

## Session on each side

The two sides carry the session separately, and they are not the same mechanism:

- **The popup** needs a session on the auth origin. Whatever the flow's End
  action leaves there - localStorage is fine - is enough.
- **The app** needs a refresh token readable on its _own_ origin. The widget
  runs on the app's domain and its calls to the auth domain are cross-site, so
  third-party cookies are blocked whatever `SameSite` says. In production that
  token comes from the OIDC exchange with the auth domain.

Note this corrects an earlier assumption that cookies scoped to the auth host
would carry the session across. They do not.

Where the refresh token is written is decided by the **flow's End action**, not
only by the project's `tokenResponseMethod` - flipping the project setting alone
does not change it.

## Turning it on

Two temporary attributes on the widget. Phase 2 replaces both with `config.json`
values without changing the runner.

```html
<descope-user-profile-widget project-id="..." base-url="https://descope.internal:3100" flow-target="popup" flow-popup-url="https://descope.internal:3100/popup-flow.html"></descope-user-profile-widget>
```

Leave `flow-target` off and everything behaves exactly as before.

## What to verify

1. Add a passkey from the widget: the popup opens **already authenticated**,
   the ceremony completes, the popup closes, the widget updates without a
   reload.
2. Read `rp_id` back for that credential and confirm it is the auth domain, not
   the app domain. This is the point of the whole exercise.
3. Sign in from a second origin with that passkey.
4. Remove the passkey, which exercises the `form.*` parameter path.
5. Open the popup twice in a row - the second must still be authenticated. This
   catches a rotated refresh token being dropped.
6. Cancel a popup without finishing: the parent should still refresh, because a
   flow can change the user before the window is closed.

## Known gaps

- **iOS Safari is untested.** `window.open` gives a full tab there rather than a
  sized window, and descope-js#1220 was an abandoned attempt to disable popups
  on that platform for OAuth. Worth asking its author what broke before relying
  on mobile.
- **`?widget-flow=` links cannot use the popup.** `flowRedirectUrlMixin` opens
  that flow from `init()`, on page load, with no user gesture - and a popup
  without a gesture is blocked. It has to stay a modal.

  Worth knowing: that parameter can name **any** flow, so in popup mode a
  `?widget-flow=` link to a flow containing a passkey step would open a modal
  and the passkey step would then fail. The limitation is not cosmetic.
