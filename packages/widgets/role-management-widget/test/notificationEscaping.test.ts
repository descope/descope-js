import { createTemplate } from '@descope/sdk-helpers';
import { createReducer } from '@reduxjs/toolkit';
// The namespace import is the point: it pulls in every exported action, so an
// action added later is covered by this guard without touching the test.
// eslint-disable-next-line import/no-namespace
import * as asyncActions from '../src/lib/widget/state/asyncActions';
import { createRole } from '../src/lib/widget/state/asyncActions/createRole';
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

describe('role-management-widget notification escaping', () => {
  // The guard: every action that can push an error notification, including any
  // added later. Structure is asserted separately, below.
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

  // Written out rather than derived: an expectation read off the output would
  // pass whatever the code produces, including a fix that over-escapes and
  // prints the wrapper tags literally in the UI.
  //
  // Only the builders that actually interpolate the error are asserted here.
  // The count-based ones return a fixed message and never include the error
  // text, by design.
  it('keeps the error text readable and the wrapper markup intact', () => {
    const [content] = rejectAndParse(
      createRole as unknown as ActionEntry,
      IMG_PAYLOAD,
    );

    // the error text survived as text
    const { textContent } = content;
    expect(textContent).toContain(IMG_PAYLOAD);

    // and the intentional wrapper is still a real element, not literal tags
    expect(content.querySelector('div')).not.toBeNull();
    const title = Array.from(content.querySelectorAll('div')).find(
      (ele) => ele.textContent?.trim().startsWith('Failed to create role'),
    );
    expect(title).toBeDefined();
  });
});
