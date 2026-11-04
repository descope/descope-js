/* eslint-disable import/order */
// @ts-nocheck

import {
  setupWebComponentTestEnv,
  teardownWebComponentTestEnv,
  startMock,
  nextMock,
  httpPostMock,
  fixtures,
  generateSdkResponse,
  WAIT_TIMEOUT,
} from './descope-wc.test-harness';

import '@testing-library/jest-dom';
import { waitFor, fireEvent } from '@testing-library/dom';
import { screen } from 'shadow-dom-testing-library';

import '../src/lib/descope-wc';

const PAGE =
  '<descope-data-input name="field" data-testid="input" data-descope-ds="cars"></descope-data-input><descope-button id="submitterId">click</descope-button><span>It works!</span>';

// what a published data source bundle registers
const cars = {
  name: 'cars',
  endpoint: '/v1/flow/ds/cars',
  methods: {
    // a plain function: the harness resets every jest.fn between tests
    list: async (ctx, params) => {
      const res = await ctx.request({
        executionId: ctx.executionId,
        stepId: ctx.stepId,
        componentId: ctx.componentId,
        componentType: ctx.componentType,
        ...params,
      });
      return res.data;
    },
  },
};

let injectMock: jest.Mock;

const renderScreen = async () => {
  startMock.mockReturnValueOnce(
    generateSdkResponse({ executionId: 'exec-1', stepId: 'step-1' }),
  );
  globalThis.DescopeUI = { 'descope-data-input': jest.fn() };
  fixtures.pageContent = PAGE;
  // jsdom never loads script tags, so loading registers the bundle directly
  injectMock = jest.fn(async () => {
    globalThis.descope = { dataSources: { cars } };
  });
  const proto = customElements.get('descope-wc').prototype;
  jest.spyOn(proto, 'injectNpmLib').mockImplementation(injectMock);

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

// mirrors the event a screen component dispatches to get a data source
const getDataSource = (ele: HTMLElement, name = 'cars') => {
  const resolve = jest.fn();
  const event = new CustomEvent('descope-data-source', {
    detail: { name, resolve },
    bubbles: true,
    composed: true,
    cancelable: true,
  });
  ele.dispatchEvent(event);
  return { event, resolve };
};

const okResponse = (data) => ({
  ok: true,
  status: 200,
  json: async () => data,
});

const submit = async () => {
  fireEvent.click(screen.getByShadowText('click'));
  await waitFor(() => expect(nextMock).toHaveBeenCalled());
  return nextMock.mock.calls[0][5];
};

describe('web-component data sources', () => {
  beforeEach(() => {
    setupWebComponentTestEnv();
  });

  afterEach(() => {
    teardownWebComponentTestEnv();
    jest.restoreAllMocks();
    delete globalThis.descope;
  });

  describe('descope-data-source', () => {
    it('preloads the data sources the rendered screen declares', async () => {
      await renderScreen();

      await waitFor(() =>
        expect(injectMock).toHaveBeenCalledWith(
          '@descope/components-data-sources',
          expect.any(String),
          'dist/cars.js',
          [],
        ),
      );
    });

    it('resolves a handle that calls the endpoint for the current step', async () => {
      httpPostMock.mockResolvedValue(okResponse({ cars: ['volvo'] }));
      const ele = await renderScreen();

      const { event, resolve } = getDataSource(ele);

      expect(event.defaultPrevented).toBe(true);
      await waitFor(() => expect(resolve).toHaveBeenCalled());
      const handle = resolve.mock.calls[0][0];
      await expect(handle.list({ make: 'vol' })).resolves.toEqual({
        data: { cars: ['volvo'] },
      });
      expect(httpPostMock).toHaveBeenCalledWith(
        '/v1/flow/ds/cars',
        {
          executionId: 'exec-1',
          stepId: 'step-1',
          componentId: 'comp-1',
          componentType: 'descope-data-input',
          make: 'vol',
        },
        { disableRetry: true },
      );
    });

    it('identifies the component hosting the event, not the inner element', async () => {
      httpPostMock.mockResolvedValue(okResponse({}));
      const ele = await renderScreen();
      // real components dispatch from inside their own shadow root
      const inner = document.createElement('span');
      inner.id = 'inner-1';
      ele.attachShadow({ mode: 'open' }).appendChild(inner);

      const { resolve } = getDataSource(inner);

      await waitFor(() => expect(resolve).toHaveBeenCalled());
      await resolve.mock.calls[0][0].list();
      expect(httpPostMock.mock.calls[0][1]).toEqual(
        expect.objectContaining({
          componentId: 'comp-1',
          componentType: 'descope-data-input',
        }),
      );
    });

    it('does not answer for a data source the component did not declare', async () => {
      const ele = await renderScreen();

      const { event, resolve } = getDataSource(ele, 'other');

      expect(event.defaultPrevented).toBe(false);
      expect(resolve).not.toHaveBeenCalled();
    });

    it('does not answer an event from an element without an id', async () => {
      const ele = await renderScreen();
      ele.removeAttribute('id');

      const { event } = getDataSource(ele);

      expect(event.defaultPrevented).toBe(false);
    });

    it('keeps one handle valid across screens', async () => {
      httpPostMock.mockResolvedValue(okResponse({}));
      nextMock.mockReturnValueOnce(
        generateSdkResponse({
          executionId: 'exec-1',
          stepId: 'step-2',
          screenId: '1',
        }),
      );
      const ele = await renderScreen();
      const { resolve } = getDataSource(ele);
      await waitFor(() => expect(resolve).toHaveBeenCalled());
      const handle = resolve.mock.calls[0][0];

      fixtures.pageContent = PAGE.replace('It works!', 'Next screen');
      fireEvent.click(screen.getByShadowText('click'));
      await waitFor(() => screen.getByShadowText('Next screen'), {
        timeout: WAIT_TIMEOUT,
      });
      await handle.list();

      expect(httpPostMock.mock.calls[0][1]).toEqual(
        expect.objectContaining({ stepId: 'step-2' }),
      );
    });

    it('stops answering once disconnected', async () => {
      const ele = await renderScreen();
      const wc = document.querySelector('descope-wc');

      wc.remove();
      const { event } = getDataSource(ele);

      expect(event.defaultPrevented).toBe(false);
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
