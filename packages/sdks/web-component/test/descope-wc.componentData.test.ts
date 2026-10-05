/* eslint-disable import/order */
// @ts-nocheck

import {
  setupWebComponentTestEnv,
  teardownWebComponentTestEnv,
  startMock,
  nextMock,
  componentDataMock,
  fixtures,
  generateSdkResponse,
  WAIT_TIMEOUT,
} from './descope-wc.test-harness';

import '@testing-library/jest-dom';
import { waitFor, fireEvent } from '@testing-library/dom';
import { screen } from 'shadow-dom-testing-library';

import '../src/lib/descope-wc';

const PAGE =
  '<descope-data-input name="field" data-testid="input"></descope-data-input><descope-button id="submitterId">click</descope-button><span>It works!</span>';

const renderScreen = async () => {
  startMock.mockReturnValueOnce(
    generateSdkResponse({ executionId: 'exec-1', stepId: 'step-1' }),
  );
  globalThis.DescopeUI = { 'descope-data-input': jest.fn() };
  fixtures.pageContent = PAGE;

  document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

  await waitFor(() => screen.getByShadowText('It works!'), {
    timeout: WAIT_TIMEOUT,
  });

  const ele = screen.getByShadowTestId('input');
  // the flow renderer gives every component an id; the SDK sends it as componentId
  ele.id = 'comp-1';
  // real components are form-associated inputs
  ele.checkValidity = () => true;
  return ele;
};

// mirrors the event a screen component dispatches to fetch server data
const requestData = (
  ele: HTMLElement,
  detail: Record<string, unknown> = {
    source: 'some-source',
    params: { query: 'kar' },
  },
) => {
  const respond = jest.fn();
  const event = new CustomEvent('descope-component-data', {
    detail: { ...detail, respond },
    bubbles: true,
    composed: true,
    cancelable: true,
  });
  ele.dispatchEvent(event);
  return { event, respond };
};

const submit = async () => {
  fireEvent.click(screen.getByShadowText('click'));
  await waitFor(() => expect(nextMock).toHaveBeenCalled());
  return nextMock.mock.calls[0][5];
};

describe('web-component component data', () => {
  beforeEach(() => {
    setupWebComponentTestEnv();
  });

  afterEach(() => {
    teardownWebComponentTestEnv();
  });

  describe('descope-component-data', () => {
    it('answers with the data for the current step', async () => {
      const data = { items: [{ id: '1' }] };
      componentDataMock.mockResolvedValue({ ok: true, data: { data } });
      const ele = await renderScreen();

      const { event, respond } = requestData(ele);

      expect(event.defaultPrevented).toBe(true);
      await waitFor(() => expect(respond).toHaveBeenCalledWith({ data }));
      expect(componentDataMock).toHaveBeenCalledTimes(1);
      expect(componentDataMock).toHaveBeenCalledWith(
        'exec-1',
        'step-1',
        'some-source',
        'comp-1',
        { query: 'kar' },
      );
    });

    it('sends the id of the component hosting the event, not the inner element', async () => {
      componentDataMock.mockResolvedValue({ ok: true, data: { data: {} } });
      const ele = await renderScreen();
      // real components dispatch from inside their own shadow root
      const host = document.createElement('div');
      host.id = 'host-1';
      ele.parentElement.appendChild(host);
      const inner = document.createElement('span');
      inner.id = 'inner-1';
      host.attachShadow({ mode: 'open' }).appendChild(inner);

      requestData(inner);

      await waitFor(() =>
        expect(componentDataMock).toHaveBeenCalledWith(
          'exec-1',
          'step-1',
          'some-source',
          'host-1',
          { query: 'kar' },
        ),
      );
    });

    it('answers with an error when the request fails', async () => {
      const error = { errorCode: 'E1', errorDescription: 'failed' };
      componentDataMock.mockResolvedValue({ ok: false, error });
      const ele = await renderScreen();

      const { respond } = requestData(ele);

      await waitFor(() => expect(respond).toHaveBeenCalledWith({ error }));
    });

    it('answers with an error when the request rejects', async () => {
      componentDataMock.mockRejectedValue(new Error('network down'));
      const ele = await renderScreen();

      const { respond } = requestData(ele);

      await waitFor(() =>
        expect(respond).toHaveBeenCalledWith({ error: 'network down' }),
      );
    });

    it('answers with an error when the sdk throws synchronously', async () => {
      componentDataMock.mockImplementation(() => {
        throw new Error('"source" must not be empty');
      });
      const ele = await renderScreen();

      const { respond } = requestData(ele, { source: '' });

      await waitFor(() =>
        expect(respond).toHaveBeenCalledWith({
          error: '"source" must not be empty',
        }),
      );
    });

    it('ignores an event without a string source', async () => {
      const ele = await renderScreen();

      const { event, respond } = requestData(ele, { params: {} });

      expect(event.defaultPrevented).toBe(false);
      expect(respond).not.toHaveBeenCalled();
      expect(componentDataMock).not.toHaveBeenCalled();
    });

    it('ignores an event from an element without an id', async () => {
      const ele = await renderScreen();
      ele.removeAttribute('id');

      const { event, respond } = requestData(ele);

      expect(event.defaultPrevented).toBe(false);
      expect(respond).not.toHaveBeenCalled();
      expect(componentDataMock).not.toHaveBeenCalled();
    });

    it('registers a single listener that survives screen changes', async () => {
      componentDataMock.mockResolvedValue({ ok: true, data: { data: {} } });
      nextMock.mockReturnValueOnce(
        generateSdkResponse({
          executionId: 'exec-1',
          stepId: 'step-2',
          screenId: '1',
        }),
      );
      await renderScreen();

      fixtures.pageContent = PAGE.replace('It works!', 'Next screen');
      fireEvent.click(screen.getByShadowText('click'));
      await waitFor(() => screen.getByShadowText('Next screen'), {
        timeout: WAIT_TIMEOUT,
      });

      const next = screen.getByShadowTestId('input');
      next.id = 'comp-1';
      const { respond } = requestData(next);

      await waitFor(() => expect(respond).toHaveBeenCalledWith({ data: {} }));
      expect(componentDataMock).toHaveBeenCalledTimes(1);
      expect(componentDataMock).toHaveBeenCalledWith(
        'exec-1',
        'step-2',
        'some-source',
        'comp-1',
        { query: 'kar' },
      );
    });

    it('stops answering once disconnected', async () => {
      const ele = await renderScreen();
      const wc = document.querySelector('descope-wc');

      wc.remove();
      const { event } = requestData(ele);

      expect(event.defaultPrevented).toBe(false);
      expect(componentDataMock).not.toHaveBeenCalled();
    });
  });

  describe('extraFormValues', () => {
    it('merges the extra values of an input into the form data', async () => {
      nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));
      const ele = await renderScreen();
      ele.value = 'karen@acme.com';
      ele.extraFormValues = { otherField: 'T1' };

      const form = await submit();

      expect(form).toEqual(
        expect.objectContaining({ field: 'karen@acme.com', otherField: 'T1' }),
      );
    });

    it('ignores non-string extra values', async () => {
      nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));
      const ele = await renderScreen();
      ele.value = 'karen@acme.com';
      ele.extraFormValues = { kept: 'yes', num: 1, obj: { a: 'b' }, nil: null };

      const form = await submit();

      expect(form).toEqual(
        expect.objectContaining({ field: 'karen@acme.com', kept: 'yes' }),
      );
      expect(form).not.toHaveProperty('num');
      expect(form).not.toHaveProperty('obj');
      expect(form).not.toHaveProperty('nil');
    });

    it.each([
      ['absent', undefined],
      ['empty', {}],
      ['not an object', 'T1'],
      ['an array', ['T1']],
    ])('adds nothing when extraFormValues is %s', async (_, extra) => {
      nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));
      const ele = await renderScreen();
      ele.value = 'karen@acme.com';
      if (extra !== undefined) ele.extraFormValues = extra;

      const form = await submit();

      expect(form).toEqual(
        expect.objectContaining({ field: 'karen@acme.com' }),
      );
      expect(form).not.toHaveProperty('0');
    });
  });
});
