/* eslint-disable import/order */
// @ts-nocheck

import {
  setupWebComponentTestEnv,
  teardownWebComponentTestEnv,
  startMock,
  fixtures,
  fetchMock,
  flowEventMock,
  generateSdkResponse,
  WAIT_TIMEOUT,
  ensureFingerprintIds,
} from './descope-wc.test-harness';

import '@testing-library/jest-dom';
import { waitFor } from '@testing-library/dom';
import { screen } from 'shadow-dom-testing-library';

import '../src/lib/descope-wc';

import { ASSETS_FOLDER } from '../src/lib/constants';

describe('web-component config', () => {
  beforeEach(() => {
    setupWebComponentTestEnv();
  });

  afterEach(() => {
    teardownWebComponentTestEnv();
  });

  it('it loads the fonts from the config when loading', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());

    fixtures.configContent = {
      ...fixtures.configContent,
      cssTemplate: {
        light: { fonts: { font1: { url: 'font.url' } } },
      },
    };

    fixtures.pageContent =
      '<descope-button id="submitterId">click</descope-button><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" theme="light" project-id="1"></descope-wc>`;

    await waitFor(() => screen.findByShadowText('It works!'), {
      timeout: 20000,
    });

    await waitFor(
      () =>
        expect(
          document.head.querySelector(`link[href="font.url"]`),
        ).toBeInTheDocument(),
      { timeout: 5000 },
    );
  }, 20000);

  it('loads flow start screen if its in config file', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());

    fixtures.configContent = {
      ...fixtures.configContent,
      flows: {
        'sign-in': { startScreenId: 'screen-0' },
      },
    };

    fixtures.pageContent = '<div>hey</div>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('hey'), {
      timeout: WAIT_TIMEOUT,
    });
    expect(startMock).not.toBeCalled();
    const expectedHtmlPath = `/pages/1/${ASSETS_FOLDER}/screen-0.html`;

    const htmlUrlPathRegex = new RegExp(`//[^/]+${expectedHtmlPath}$`);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(htmlUrlPathRegex),
      expect.any(Object),
    );
  });

  it('should fetch config file once', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());

    fixtures.pageContent = '<div>hey</div>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('hey'), {
      timeout: WAIT_TIMEOUT,
    });

    expect(
      fetchMock.mock.calls.filter((call) => call[0].endsWith('config.json'))
        .length,
    ).toBe(1);
  });

  it('runs fingerprint when config contains the correct fields', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());

    fixtures.configContent = {
      flows: {
        'sign-in': {
          startScreenId: 'screen-0',
          fingerprintEnabled: true,
          fingerprintKey: 'fp-public-key',
        },
      },
    };

    fixtures.pageContent = '<div>hey</div>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1" base-url="http://base.url"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('hey'), {
      timeout: WAIT_TIMEOUT,
    });
    expect(ensureFingerprintIds).toHaveBeenCalledWith(
      'fp-public-key',
      'http://base.url',
    );
  });

  // Client-side validation tracking is per flow and off unless config.json says
  // otherwise. These drive the component's own submit path, so they cover the
  // wiring from config.json through to what actually goes on the wire.
  describe('client-side validation tracking', () => {
    // A screen shaped like a real one: a required field and the button
    // #hydrate binds to, so clicking it runs the component's own validation.
    const SCREEN = `<input name="email" required />
      <button data-type="button" id="submit-btn">Continue</button>`;

    const mountFlow = async (
      flowConfig: Record<string, any>,
      startResponse?: any,
    ) => {
      startMock.mockReturnValueOnce(startResponse ?? generateSdkResponse());
      fixtures.configContent = { flows: { 'sign-in': flowConfig } };
      fixtures.pageContent = SCREEN;
      document.body.innerHTML = `<descope-wc flow-id="sign-in" project-id="1" base-url="http://base.url"></descope-wc>`;
      const el: any = await waitFor(
        () => {
          const node: any = document.querySelector('descope-wc');
          if (!node?.shadowRoot?.querySelector('#submit-btn')) {
            throw new Error('screen not rendered yet');
          }
          return node;
        },
        { timeout: WAIT_TIMEOUT },
      );
      return el;
    };

    // What a user does: press the button with the field left empty.
    const submitEmpty = (el: any) => {
      el.shadowRoot.querySelector('#submit-btn').click();
      window.dispatchEvent(new Event('pagehide')); // force any pending flush
    };

    // Validation events go out over the SDK, the same as flow.start/flow.next.
    const eventCalls = () => flowEventMock.mock.calls;

    const lastEvent = () => {
      const [, events] = eventCalls()[eventCalls().length - 1];
      return events[0];
    };

    it('sends nothing when the flow config omits the flag', async () => {
      const el = await mountFlow({ startScreenId: 'screen-0' });

      submitEmpty(el);

      expect(eventCalls()).toHaveLength(0);
    });

    it('holds a start-screen failure, then sends it with the start screen identity', async () => {
      const el = await mountFlow({
        startScreenId: 'start-screen-id',
        startScreenName: 'Welcome Screen',
        clientValidationTrackingEnabled: true,
      });

      submitEmpty(el);
      // The start screen renders before the flow starts, so there is nothing to
      // attribute this to yet.
      expect(eventCalls()).toHaveLength(0);

      // The flow starts (user fixed the input and continued).
      el.setValidationTrackingExecution('exec-1');

      expect(eventCalls()).toHaveLength(1);
      expect(eventCalls()[0][0]).toBe('exec-1');
      const event = lastEvent();
      expect(event.field).toBe('email');
      expect(event.rule).toBe('required');
      // identity comes from config.json, the only place that knows it
      expect(event.screenId).toBe('start-screen-id');
      expect(event.screenName).toBe('Welcome Screen');
    });

    it('uses the condition-resolved screen, not the flow-level config', async () => {
      // With conditions, the screen the config renders first is picked by
      // calculateConditions and there is no flow-level startScreenId at all.
      // The held error must carry the resolved screen, not an empty identity.
      // 'ELSE' always matches, so the resolved screen is deterministic here.
      const el = await mountFlow({
        clientValidationTrackingEnabled: true,
        conditions: [
          {
            key: 'ELSE',
            met: {
              screenId: 'condition-screen-id',
              screenName: 'Condition Screen',
              interactionId: 'else-branch',
            },
          },
        ],
      });

      submitEmpty(el);
      expect(eventCalls()).toHaveLength(0); // held, no execution yet

      el.setValidationTrackingExecution('exec-1');

      expect(eventCalls()).toHaveLength(1);
      const event = lastEvent();
      expect(event.screenId).toBe('condition-screen-id');
      expect(event.screenName).toBe('Condition Screen');
    });

    it('uses the running flow screen identity once the flow has started', async () => {
      // No startScreenId, so the component starts the flow and renders the
      // screen the response names.
      const el = await mountFlow(
        { clientValidationTrackingEnabled: true },
        generateSdkResponse({
          executionId: 'exec-1',
          screenId: 'screen-9',
          stepName: 'Step Nine',
        }),
      );

      submitEmpty(el);

      expect(eventCalls()).toHaveLength(1);
      const event = lastEvent();
      expect(event.screenId).toBe('screen-9');
      expect(event.screenName).toBe('Step Nine');
    });
  });
});
