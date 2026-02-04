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
