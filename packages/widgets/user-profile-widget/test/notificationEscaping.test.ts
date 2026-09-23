import { createTemplate } from '@descope/sdk-helpers';
import { createReducer } from '@reduxjs/toolkit';
// The namespace import is the point: it pulls in every exported action, so an
// action added later is covered by this guard without touching the test.
// eslint-disable-next-line import/no-namespace
import * as asyncActions from '../src/lib/widget/state/asyncActions';
import { selectTenant } from '../src/lib/widget/state/asyncActions/selectTenant';
import { initialState } from '../src/lib/widget/state/initialState';

// A payload that becomes a live element if the error text is ever parsed as
// markup instead of escaped.
const XSS_PAYLOAD = '<img src=x onerror=alert(1)>';

type ActionEntry = {
  action: { rejected: (...args: any[]) => any };
  reducer: (builder: any) => void;
};

const isActionEntry = (value: any): value is ActionEntry =>
  !!value?.action?.rejected && typeof value?.reducer === 'function';

// Drive one action's rejected case and return every notification it pushed,
// already parsed by the same template the widget renders through.
const rejectAndParse = (entry: ActionEntry) => {
  const reducer = createReducer(initialState, (builder) =>
    entry.reducer(builder),
  );

  // `[]` and not undefined: the count-based builders read `action.meta.arg.length`.
  const state = reducer(
    initialState,
    entry.action.rejected(new Error(XSS_PAYLOAD), 'req-id', []),
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
      const contents = rejectAndParse(entry as ActionEntry);

      contents.forEach((content) => {
        expect(content.querySelector('img')).toBeNull();
        expect(content.querySelector('script')).toBeNull();
      });
    },
  );

  // selectTenant is the one builder that returns the error with no wrapper
  // markup around it, so there is no structure to assert - only that the text
  // survives as text.
  it('keeps the error text readable', () => {
    const [content] = rejectAndParse(selectTenant as unknown as ActionEntry);

    const { textContent } = content;
    expect(textContent).toContain(XSS_PAYLOAD);
    expect(content.querySelector('img')).toBeNull();
  });
});
