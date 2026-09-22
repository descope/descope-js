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

  it('should ignore a second click while the first submit is still in flight', async () => {
    jest.useRealTimers();

    startMock.mockReturnValue(generateSdkResponse());
    // never settles, so the first submit stays in flight for the whole test
    nextMock.mockReturnValue(new Promise(() => {}));

    fixtures.pageContent = `
      <span>Test Page</span>
      <descope-button id="submit">Authorize</descope-button>
      `;
    document.body.innerHTML = `<descope-wc flow-id="test-flow" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('Test Page'), {
      timeout: WAIT_TIMEOUT,
    });

    // loggerWrapper reads this.logger at call time, so a spy set after mount is
    // the one the guard uses
    const debug = jest.fn();
    (document.querySelector('descope-wc') as any).logger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug,
    };

    const button = screen.getByShadowText('Authorize');

    fireEvent.click(button);

    await waitFor(() => expect(nextMock).toHaveBeenCalledTimes(1), {
      timeout: WAIT_TIMEOUT,
    });

    // wait out the leading debounce window before clicking again, so this is a
    // click the debounce cannot catch - the one that used to submit a second time
    await new Promise((resolve) => {
      setTimeout(resolve, 300);
    });

    fireEvent.click(button);

    await new Promise((resolve) => {
      setTimeout(resolve, 300);
    });

    expect(nextMock).toHaveBeenCalledTimes(1);
    // pin WHY it was dropped: the in-flight guard, not the leading debounce
    expect(debug).toHaveBeenCalledWith(
      'Submit already in flight, ignoring',
      '',
    );
  });

  it('should ignore rapid repeated clicks within the debounce window', async () => {
    jest.useRealTimers();

    startMock.mockReturnValue(generateSdkResponse());
    nextMock.mockReturnValue(new Promise(() => {}));

    fixtures.pageContent = `
      <span>Test Page</span>
      <descope-button id="submit">Authorize</descope-button>
      `;
    document.body.innerHTML = `<descope-wc flow-id="test-flow" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('Test Page'), {
      timeout: WAIT_TIMEOUT,
    });

    const button = screen.getByShadowText('Authorize');

    // three clicks in the same tick - the impatient double (or triple) click.
    // this window is covered by the pre-existing leadingDebounce, so this test
    // is regression cover for that, not for the in-flight guard
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => expect(nextMock).toHaveBeenCalledTimes(1), {
      timeout: WAIT_TIMEOUT,
    });

    await new Promise((resolve) => {
      setTimeout(resolve, 300);
    });

    expect(nextMock).toHaveBeenCalledTimes(1);
  });

  it('should ignore a second Enter while the first submit is still in flight', async () => {
    jest.useRealTimers();

    startMock.mockReturnValue(generateSdkResponse());
    nextMock.mockReturnValue(new Promise(() => {}));

    // a single button, so the Enter handler auto-submits it
    fixtures.pageContent = `
      <span>Test Page</span>
      <descope-button id="submit">Authorize</descope-button>
      `;
    document.body.innerHTML = `<descope-wc flow-id="test-flow" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('Test Page'), {
      timeout: WAIT_TIMEOUT,
    });

    const rootEle = document
      .getElementsByTagName('descope-wc')[0]
      .shadowRoot.querySelector('#root');

    fireEvent.keyDown(rootEle, { key: 'Enter', code: 13, charCode: 13 });

    await waitFor(() => expect(nextMock).toHaveBeenCalledTimes(1), {
      timeout: WAIT_TIMEOUT,
    });

    // past the debounce window, while the first request is still in flight -
    // the impatient second Enter that reproduces on a real consent screen
    await new Promise((resolve) => {
      setTimeout(resolve, 300);
    });

    fireEvent.keyDown(rootEle, { key: 'Enter', code: 13, charCode: 13 });

    await new Promise((resolve) => {
      setTimeout(resolve, 300);
    });

    expect(nextMock).toHaveBeenCalledTimes(1);
  });

  it('should ignore a second programmatic click while a submit is in flight', async () => {
    jest.useRealTimers();

    startMock.mockReturnValue(generateSdkResponse());
    nextMock.mockReturnValue(new Promise(() => {}));

    fixtures.pageContent = `
      <span>Test Page</span>
      <descope-button id="submit">Authorize</descope-button>
      `;
    document.body.innerHTML = `<descope-wc flow-id="test-flow" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('Test Page'), {
      timeout: WAIT_TIMEOUT,
    });

    const button = screen.getByShadowText('Authorize');

    // el.click(), the path the Enter handler and the passcode auto-submit take
    button.click();

    await waitFor(() => expect(nextMock).toHaveBeenCalledTimes(1), {
      timeout: WAIT_TIMEOUT,
    });

    await new Promise((resolve) => {
      setTimeout(resolve, 300);
    });

    button.click();

    await new Promise((resolve) => {
      setTimeout(resolve, 300);
    });

    expect(nextMock).toHaveBeenCalledTimes(1);
  });

  it('should ignore a click on a different button while a submit is in flight', async () => {
    jest.useRealTimers();

    startMock.mockReturnValue(generateSdkResponse());
    nextMock.mockReturnValue(new Promise(() => {}));

    fixtures.pageContent = `
      <span>Test Page</span>
      <descope-button id="approve">Authorize</descope-button>
      <descope-button id="deny">Cancel</descope-button>
      `;
    document.body.innerHTML = `<descope-wc flow-id="test-flow" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('Test Page'), {
      timeout: WAIT_TIMEOUT,
    });

    fireEvent.click(screen.getByShadowText('Authorize'));

    await waitFor(() => expect(nextMock).toHaveBeenCalledTimes(1), {
      timeout: WAIT_TIMEOUT,
    });

    await new Promise((resolve) => {
      setTimeout(resolve, 300);
    });

    // a second, DIFFERENT interaction while the first is in flight - without a
    // guard this submits Cancel on top of an already-submitted Authorize
    fireEvent.click(screen.getByShadowText('Cancel'));

    await new Promise((resolve) => {
      setTimeout(resolve, 300);
    });

    expect(nextMock).toHaveBeenCalledTimes(1);
    // interactionId is the 3rd arg of sdk.flow.next - the one that went through
    // is Authorize, not the Cancel that landed while it was in flight
    expect(nextMock.mock.calls[0][2]).toBe('approve');
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

    fireEvent.pageShow(window, { persisted: true });

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
