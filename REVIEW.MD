Code Review — feat/improve-toasts

Context

Branch refactors per‑widget initNotificationsMixin into a shared createToastEventsMixin factory in @descope/sdk-mixins, adds a cancellable toast CustomEvent (with preventDefault() to suppress the built‑in toast), introduces an optional
detail string on notifications, exposes onToast on 4 React widgets, and centralises withNotifications → withToastNotifications in sdk-mixins. Tests are added for the new mixin, for DescopeWidgets, and per‑widget initNotificationsMixin.

The user asked: did I miss anything in other functions, and any simplification / boilerplate suggestions.

---

🔴 Blocking — must fix before merging

1.  Branch is reverting unrelated work

git merge-base main HEAD is e3c2a505d. main has 16 commits since then that this branch does not contain. Diffing against current main therefore removes:

- feat(wc): add externalAuthRedirect to nativeOptions (PR #1374) — core-js-sdk/src/sdk/types.ts, web-component/src/lib/descope-wc/DescopeWc.ts lines 240, 678
- All recent release CHANGELOG entries and package.json version bumps for: angular-sdk, core-js-sdk, nextjs-sdk, react-sdk, vue-sdk, web-component, web-js-sdk, and every widget package.

Action: rebase on main before opening the PR. Without this, merging will silently roll back externalAuthRedirect and 14 release commits.

2.  Behaviour regression in user-profile-widget

Old per‑widget withNotifications skipped pushing when getErrorMsg / getSuccessMsg returned an empty string:
const msg = getErrorMsg(action);
if (msg) state.notifications.push(...);
New shared withToastNotifications (packages/libs/sdk-mixins/src/mixins/toastEventsMixin/withToastNotifications.ts:13-26) always pushes. selectTenant.ts:60 can return an empty string (const errorMsg = action.error?.message || ''; if
(action.error?.name === 'Error') return errorMsg;), which previously suppressed the toast and now produces { type: 'error', msg: '' }.

Fix: add a truthy guard in withToastNotifications:
const content = toContent(getSuccessMsg(action));
if (content.msg) state.notifications.push({ type: 'success', ...content });

3.  Server‑controlled string interpolated into innerHTML

toastEventsMixin.ts:83: `<div><div>${msg}</div>${detail}</div>` is fed to notification.setContent(...), which renders as HTML. detail is populated from action.error?.message (e.g. createUser.ts:29) — a server‑controlled value. The old code
had the same shape, but the change makes it canonical and applied across many call sites.

Fix: escape msg/detail before HTML interpolation, or build the DOM with document.createElement and textContent and pass an HTMLElement to setContent (the descope notification component accepts elements).

---

🟡 Things you may have missed

4.  Vue and Angular SDKs not updated

Only the React SDK exposes onToast. packages/sdks/vue-sdk/src/UserManagement.vue (and RoleManagement.vue, plus the Angular equivalents) still only emit ready. If toast interception is a public feature, Vue/Angular consumers can't use it.
Either:

- add @toast emit + Angular (toast) output in their respective wrappers, or
- explicitly scope this PR to React and document it.

5.  Per‑widget initNotificationsMixin.test.ts tests the mock, not the code

The 131‑line file is duplicated verbatim in 4 widgets and jest.mocks @descope/sdk-mixins with a hand‑rolled re‑implementation of createToastEventsMixin. The assertions then exercise that re‑implementation — they don't catch regressions in
the real mixin. The real mixin is already covered by packages/libs/sdk-mixins/test/toastEventsMixin.test.ts.

Suggestion: delete the 4 duplicates and replace each with a small assertion that createToastEventsMixin was called with the correct selector and icons:
jest.mock('@descope/sdk-mixins', () => ({ createToastEventsMixin: jest.fn(() => x => x) }));
// ...
expect(createToastEventsMixin).toHaveBeenCalledWith(expect.objectContaining({
selector: getNotifications,
icons: { success: checkmark, error: warning, close },
}));
Cuts ~500 lines and removes the false‑confidence problem.

6.  WithToastProps only added to 4 of 8 widget React components

Added: UserManagementProps, RoleManagementProps, AccessKeyManagementProps, UserProfileProps. Not added: AuditManagementProps, ApplicationsPortalProps, TenantProfileProps, OutboundApplicationsProps. I confirmed only the first 4 widgets ship
initNotificationsMixin, so this is correct — flagging only so you can confirm intent.

7.  onToast listener wiring is duplicated 4× in React

Each of UserManagement.tsx, RoleManagement.tsx, AccessKeyManagement.tsx, UserProfile.tsx has the same 8‑line useEffect block. Worth extracting:
// hooks/useEventListener.ts
export const useEventListener = (el, event, handler) => useEffect(() => {
if (!handler || !el) return undefined;
el.addEventListener(event, handler as EventListener);
return () => el.removeEventListener(event, handler as EventListener);
}, [el, event, handler]);
Then useEventListener(innerRef, 'toast', onToast) and the same for 'ready'. The onReady block is also already duplicated in those files.

8.  Three commits titled toastss

d388ee0c5, 2192b2888, 44737b3ff. Squash before merge.

9.  Uncommitted e2e changes on the branch

role-management-widget.spec.ts and user-management-widget.spec.ts have unrelated test‑stability fixes (waitForLoadState, register waitForResponse before action) that are still uncommitted. Either commit them separately or stash — currently
they'll either get bundled into a future "toastss" commit or be lost.

10. withToastNotifications typing lost specificity

The old per‑widget withNotifications typed action as RejectedAction<AsyncThunk<any,any,any>>. The new shared version types action: any. Call sites like createUser.ts:27 use action.error?.message and now have no autocomplete / type‑check.
Re‑introduce the typed signature in the shared helper (it lives in sdk-mixins so the redux‑toolkit types do need to be a dependency or a structural type).

---

🟢 Smaller suggestions

- toastEventsMixin.ts:78 icons[type as keyof Pick<typeof icons, 'success' | 'error'>] — type is already 'success' | 'error', so icons[type] works after declaring icons accordingly.
- toastEventsMixin.ts:101 Destructures { type, msg, detail } then re‑builds the same object on line 111 to pass to #createNotificationContent. Just pass the original notification.
- withToastNotifications.ts:1 toContent is fine, but inlining or naming normalize makes intent clearer.
- The eventName config (toast default) is exposed but unused by any caller — fine to keep for flexibility, just confirm intentional.
- react-sdk/src/types.ts:50-57 WithToastProps JSDoc is good; consider promoting severity: 'success' | 'error' to a named type so SDK consumers can import it.

---
