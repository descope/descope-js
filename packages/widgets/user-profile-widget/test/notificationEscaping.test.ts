import { createTemplate } from '@descope/sdk-helpers';
import { createReducer } from '@reduxjs/toolkit';
// The namespace import is the point: it pulls in every exported action, so an
// action added later is covered by this guard without touching the test.
// eslint-disable-next-line import/no-namespace
import * as asyncActions from '../src/lib/widget/state/asyncActions';
import { selectTenant } from '../src/lib/widget/state/asyncActions/selectTenant';
import { initialState } from '../src/lib/widget/state/initialState';

// Payloads that become live elements if the error text is ever parsed as markup
// instead of escaped. Two shapes, because they take different parser paths:
// an element carrying an inline handler, and a real script tag. `innerHTML`
// creates a script element but never runs it, so the assertion catches the
// injection even though nothing would have executed.
const XSS_PAYLOADS = [
  '<img src=x onerror=alert(1)>',
  '<script>alert(1)</script>',
];
const [IMG_PAYLOAD] = XSS_PAYLOADS;

type ActionEntry = {
  action: { rejected: (...args: any[]) => any };
  reducer: (builder: any) => void;
};

const isActionEntry = (value: any): value is ActionEntry =>
  !!value?.action?.rejected && typeof value?.reducer === 'function';

// Drive one action's rejected case and return every notification it pushed,
// already parsed by the same template the widget renders through.
const rejectAndParse = (entry: ActionEntry, payload: string) => {
  const reducer = createReducer(initialState, (builder) =>
    entry.reducer(builder),
  );

  // `[]` and not undefined: the count-based builders read `action.meta.arg.length`.
  const state = reducer(
    initialState,
    entry.action.rejected(new Error(payload), 'req-id', []),
  );

  return state.notifications.map(({ msg }) => createTemplate(msg).content);
};

describe('user-profile-widget notification escaping', () => {
  // The guard: every action that can push an error notification, including any
  // added later.
  const entries = Object.entries(asyncActions).filter(([, value]) =>
    isActionEntry(value),
  );

  it.each(entries)(
    '%s never turns API error text into markup',
    (_name, entry) => {
      XSS_PAYLOADS.forEach((payload) => {
        const contents = rejectAndParse(entry as ActionEntry, payload);

        contents.forEach((content) => {
          expect(content.querySelector('img')).toBeNull();
          expect(content.querySelector('script')).toBeNull();
        });
      });
    },
  );

  // selectTenant is the one builder that returns the error with no wrapper
  // markup around it, so there is no structure to assert - only that the text
  // survives as text.
  it('keeps the error text readable', () => {
    const [content] = rejectAndParse(
      selectTenant as unknown as ActionEntry,
      IMG_PAYLOAD,
    );

    const { textContent } = content;
    expect(textContent).toContain(IMG_PAYLOAD);
    expect(content.querySelector('img')).toBeNull();
  });

  // This widget's withNotifications drops a falsy msg, so a blank message must
  // still produce something. Both error shapes are pinned: `withErrorHandler`
  // throws a plain Error (name 'Error'), which is the common path.
  it.each([['Error'], ['ApiError']])(
    'falls back to a default for a blank message on a %s',
    (name) => {
      const reducer = createReducer(initialState, (builder) =>
        selectTenant.reducer(builder),
      );
      const err = new Error('   ');
      err.name = name;

      const state = reducer(
        initialState,
        selectTenant.action.rejected(err, 'req-id', 'tenant-1'),
      );

      expect(state.notifications).toHaveLength(1);
      expect(state.notifications[0].msg).toBe('Error');
    },
  );
});
