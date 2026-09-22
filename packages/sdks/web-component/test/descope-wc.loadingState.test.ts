/* eslint-disable import/order */
// @ts-nocheck

import {
  setupWebComponentTestEnv,
  teardownWebComponentTestEnv,
  startMock,
  nextMock,
  fixtures,
  generateSdkResponse,
  WAIT_TIMEOUT,
} from './descope-wc.test-harness';

import '@testing-library/jest-dom';
import { waitFor, fireEvent } from '@testing-library/dom';
import { screen } from 'shadow-dom-testing-library';

import '../src/lib/descope-wc';

describe('web-component loading state', () => {
  beforeEach(() => {
    setupWebComponentTestEnv();
  });

  afterEach(() => {
    teardownWebComponentTestEnv();
  });

  it('should set loading attribute on submitter and disable other enabled elements', async () => {
    startMock.mockReturnValue(generateSdkResponse());

    fixtures.pageContent = `
      <span>Test Page</span>
      <descope-button id="submit">Submit</descope-button>
      <descope-button id="another">Another Button</descope-button>
      <input id="input" placeholder="Input"/>
      `;
    document.body.innerHTML = `<descope-wc flow-id="test-flow" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('Test Page'), {
      timeout: WAIT_TIMEOUT,
    });

    fireEvent.click(screen.getByShadowText('Submit'));

    await waitFor(
      () => {
        expect(screen.getByShadowText('Submit')).toHaveAttribute(
          'loading',
          'true',
        );
      },
      { timeout: WAIT_TIMEOUT },
    );

    await waitFor(
      () => {
        expect(screen.getByShadowText('Another Button')).toHaveAttribute(
          'disabled',
          'true',
        );
      },
      { timeout: WAIT_TIMEOUT },
    );

    await waitFor(
      () => {
        expect(screen.getByShadowPlaceholderText('Input')).toHaveAttribute(
          'disabled',
          'true',
        );
      },
      { timeout: WAIT_TIMEOUT },
    );
  });

  // leadingDebounce default in helpers.ts. Waiting past it is what makes the
  // repeat submit reach the guard instead of being swallowed by the debounce.
  const DEBOUNCE_WINDOW_MS = 100;
  const pastDebounceWindow = () =>
    new Promise((resolve) => {
      setTimeout(resolve, DEBOUNCE_WINDOW_MS + 50);
    });

  const SINGLE_BUTTON = `
      <span>Test Page</span>
      <descope-button id="submit">Authorize</descope-button>
      `;

  const TWO_BUTTONS = `
      <span>Test Page</span>
      <descope-button id="approve">Authorize</descope-button>
      <descope-button id="deny">Cancel</descope-button>
      `;

  // loggerWrapper reads this.logger at call time, so a spy set after mount is
  // the one the guard uses
  const spyOnDebug = () => {
    const debug = jest.fn();
    (document.querySelector('descope-wc') as any).logger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug,
    };
    return debug;
  };

  const getRootEle = () =>
    document
      .getElementsByTagName('descope-wc')[0]
      .shadowRoot.querySelector('#root');

  // every case submits the same way first; only the repeat submit differs
  it.each([
    {
      repeatWith: 'a click',
      pageContent: SINGLE_BUTTON,
      resubmit: () => fireEvent.click(screen.getByShadowText('Authorize')),
    },
    {
      // the impatient second Enter that reproduces on a real consent screen
      repeatWith: 'Enter',
      pageContent: SINGLE_BUTTON,
      resubmit: () =>
        fireEvent.keyDown(getRootEle(), {
          key: 'Enter',
          code: 13,
          charCode: 13,
        }),
    },
    {
      // el.click(), the path the Enter handler and the passcode auto-submit take
      repeatWith: 'a programmatic click',
      pageContent: SINGLE_BUTTON,
      resubmit: () =>
        (screen.getByShadowText('Authorize') as HTMLElement).click(),
    },
    {
      // without a guard this submits Cancel on top of an already-submitted Authorize
      repeatWith: 'a click on a different button',
      pageContent: TWO_BUTTONS,
      resubmit: () => fireEvent.click(screen.getByShadowText('Cancel')),
    },
  ])(
    'should ignore $repeatWith while the first submit is still in flight',
    async ({ pageContent, resubmit }) => {
      jest.useRealTimers();

      startMock.mockReturnValue(generateSdkResponse());
      // never settles, so the first submit stays in flight for the whole test
      nextMock.mockReturnValue(new Promise(() => {}));

      fixtures.pageContent = pageContent;
      document.body.innerHTML = `<descope-wc flow-id="test-flow" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('Test Page'), {
        timeout: WAIT_TIMEOUT,
      });

      const debug = spyOnDebug();

      fireEvent.click(screen.getByShadowText('Authorize'));

      await waitFor(() => expect(nextMock).toHaveBeenCalledTimes(1), {
        timeout: WAIT_TIMEOUT,
      });

      await pastDebounceWindow();

      resubmit();

      // pin WHY it was dropped: the in-flight guard, not the leading debounce.
      // this is also the settle signal - no arbitrary sleep needed to prove the
      // second next() never happened
      await waitFor(
        () =>
          expect(debug).toHaveBeenCalledWith(
            'Submit already in flight, ignoring',
            '',
          ),
        { timeout: WAIT_TIMEOUT },
      );

      expect(nextMock).toHaveBeenCalledTimes(1);
      // interactionId is the 3rd arg of sdk.flow.next - the one that went
      // through is Authorize, not whatever landed while it was in flight
      expect(nextMock.mock.calls[0][2]).toBe(
        pageContent === TWO_BUTTONS ? 'approve' : 'submit',
      );
    },
  );

  it('should ignore rapid repeated clicks within the debounce window', async () => {
    jest.useRealTimers();

    startMock.mockReturnValue(generateSdkResponse());
    nextMock.mockReturnValue(new Promise(() => {}));

    fixtures.pageContent = SINGLE_BUTTON;
    document.body.innerHTML = `<descope-wc flow-id="test-flow" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('Test Page'), {
      timeout: WAIT_TIMEOUT,
    });

    const button = screen.getByShadowText('Authorize');

    // three clicks in the same tick - the impatient double (or triple) click.
    // covered twice over now: leadingDebounce drops them, and so would the
    // guard, since the attributes are set in the first click's task
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => expect(nextMock).toHaveBeenCalledTimes(1), {
      timeout: WAIT_TIMEOUT,
    });

    // nothing to wait for here - the debounce drops silently, so give the two
    // extra clicks a window in which a second next() could still have landed
    await pastDebounceWindow();

    expect(nextMock).toHaveBeenCalledTimes(1);
  });

  it('should restore loading and disable state on pageshow', async () => {
    jest.useRealTimers();

    startMock.mockReturnValue(generateSdkResponse());

    fixtures.pageContent = `
      <span>Test Page</span>
      <descope-button id="submit">Submit</descope-button>
      <descope-button id="another">Another Button</descope-button>
      <input id="input" placeholder="Input"/>
      `;
    document.body.innerHTML = `<descope-wc flow-id="test-flow" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('Test Page'), {
      timeout: WAIT_TIMEOUT,
    });

    fireEvent.click(screen.getByShadowText('Submit'));

    await waitFor(
      () => {
        expect(screen.getByShadowText('Submit')).toHaveAttribute(
          'loading',
          'true',
        );
      },
      { timeout: WAIT_TIMEOUT },
    );

    await waitFor(
      () => {
        expect(screen.getByShadowText('Another Button')).toHaveAttribute(
          'disabled',
          'true',
        );
      },
      { timeout: WAIT_TIMEOUT },
    );

    await waitFor(
      () => {
        expect(screen.getByShadowPlaceholderText('Input')).toHaveAttribute(
          'disabled',
          'true',
        );
      },
      { timeout: WAIT_TIMEOUT },
    );

    // the pageshow listener is armed from the nextRequestStatus subscriber,
    // which State.update defers by a task, so a single flush is not enough to
    // know it is there. fire inside the retry instead of guessing a delay -
    // the listener is `once`, so the extra events are no-ops
    await waitFor(
      () => {
        fireEvent.pageShow(window, { persisted: true });
        expect(screen.getByShadowText('Submit')).not.toHaveAttribute('loading');
      },
      { timeout: WAIT_TIMEOUT },
    );

    await waitFor(
      () => {
        expect(screen.getByShadowText('Another Button')).toBeEnabled();
      },
      { timeout: WAIT_TIMEOUT },
    );

    await waitFor(
      () => {
        expect(screen.getByShadowPlaceholderText('Input')).toBeEnabled();
      },
      { timeout: WAIT_TIMEOUT },
    );
  }, 10000);

  it('should restore states when staying on the same screen', async () => {
    startMock.mockReturnValue(generateSdkResponse());
    nextMock.mockReturnValue(generateSdkResponse());

    fixtures.pageContent = `
      <span>Test Page</span>
      <descope-button id="submit">Submit</descope-button>
      <descope-button id="another">Another Button</descope-button>
      <input id="input" placeholder="Input"/>
      `;
    document.body.innerHTML = `<descope-wc flow-id="test-flow" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('Test Page'), {
      timeout: WAIT_TIMEOUT,
    });

    fireEvent.click(screen.getByShadowText('Submit'));

    const submitButton = screen.getByShadowText('Submit');
    const anotherButton = screen.getByShadowText('Another Button');
    const inputField = screen.getByShadowPlaceholderText('Input');

    // wait for the loading state to be set
    await waitFor(
      () => {
        expect(submitButton).toHaveAttribute('loading', 'true');
      },
      { timeout: WAIT_TIMEOUT },
    );

    await waitFor(
      () => {
        expect(anotherButton).toHaveAttribute('disabled', 'true');
      },
      { timeout: WAIT_TIMEOUT },
    );

    await waitFor(
      () => {
        expect(inputField).toHaveAttribute('disabled', 'true');
      },
      { timeout: WAIT_TIMEOUT },
    );

    // wait for loading state to be removed
    await waitFor(
      () => {
        expect(submitButton).not.toHaveAttribute('loading');
      },
      { timeout: WAIT_TIMEOUT },
    );

    await waitFor(
      () => {
        expect(anotherButton).toBeEnabled();
      },
      { timeout: WAIT_TIMEOUT },
    );

    await waitFor(
      () => {
        expect(inputField).toBeEnabled();
      },
      { timeout: WAIT_TIMEOUT },
    );
  });

  // Regression for issue #16353: when the flow completes while the component
  // stays mounted, the submit button must not stay stuck in loading state.
  it('should restore states after the flow completes successfully', async () => {
    startMock.mockReturnValue(generateSdkResponse());
    // last screen submit completes the flow (no new screen rendered)
    nextMock.mockReturnValue(generateSdkResponse({ status: 'completed' }));

    fixtures.pageContent = `
      <span>Test Page</span>
      <descope-button id="submit">Submit</descope-button>
      <descope-button id="another">Another Button</descope-button>
      <input id="input" placeholder="Input"/>
      `;

    const onSuccess = jest.fn();
    document.body.innerHTML = `<descope-wc flow-id="test-flow" project-id="1"></descope-wc>`;
    document.querySelector('descope-wc').addEventListener('success', onSuccess);

    await waitFor(() => screen.getByShadowText('Test Page'), {
      timeout: WAIT_TIMEOUT,
    });

    fireEvent.click(screen.getByShadowText('Submit'));

    // loading is set while the next request is in flight
    await waitFor(
      () => {
        expect(screen.getByShadowText('Submit')).toHaveAttribute(
          'loading',
          'true',
        );
      },
      { timeout: WAIT_TIMEOUT },
    );

    // the flow completes and success fires
    await waitFor(() => expect(onSuccess).toHaveBeenCalled(), {
      timeout: WAIT_TIMEOUT,
    });

    // once the flow completed, the submitter and the other elements should be
    // restored even though no new screen renders and the element stays mounted
    await waitFor(
      () => {
        expect(screen.getByShadowText('Submit')).not.toHaveAttribute('loading');
      },
      { timeout: WAIT_TIMEOUT },
    );

    await waitFor(
      () => {
        expect(screen.getByShadowText('Another Button')).toBeEnabled();
      },
      { timeout: WAIT_TIMEOUT },
    );

    await waitFor(
      () => {
        expect(screen.getByShadowPlaceholderText('Input')).toBeEnabled();
      },
      { timeout: WAIT_TIMEOUT },
    );
  });

  it('should NOT restore states when navigating to a different screen', async () => {
    startMock.mockReturnValue(generateSdkResponse());
    nextMock.mockReturnValue(generateSdkResponse({ screenId: '1' }));

    fixtures.pageContent = `
      <span>Test Page</span>
      <descope-button id="submit">Submit</descope-button>
      <descope-button id="another">Another Button</descope-button>
      <input id="input" placeholder="Input"/>
      `;
    document.body.innerHTML = `<descope-wc flow-id="test-flow" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('Test Page'), {
      timeout: WAIT_TIMEOUT,
    });

    fireEvent.click(screen.getByShadowText('Submit'));

    const submitButton = screen.getByShadowText('Submit');
    const anotherButton = screen.getByShadowText('Another Button');
    const inputField = screen.getByShadowPlaceholderText('Input');

    // wait for the loading state to be set
    await waitFor(
      () => {
        expect(submitButton).toHaveAttribute('loading', 'true');
      },
      { timeout: WAIT_TIMEOUT },
    );

    await waitFor(
      () => {
        expect(anotherButton).toHaveAttribute('disabled', 'true');
      },
      { timeout: WAIT_TIMEOUT },
    );

    await waitFor(
      () => {
        expect(inputField).toHaveAttribute('disabled', 'true');
      },
      { timeout: WAIT_TIMEOUT },
    );

    // wait for the screen to change - we identify it by waiting for the loading state to be removed
    // this should NOT happen since we're navigating to a different screen
    await waitFor(
      () => {
        // The element should still have loading since the screen changed
        // and the old elements are replaced
        expect(submitButton).toHaveAttribute('loading', 'true');
      },
      { timeout: WAIT_TIMEOUT },
    );
  });
});
