/* eslint-disable import/order */
// @ts-nocheck

import {
  setupWebComponentTestEnv,
  teardownWebComponentTestEnv,
  startMock,
  nextMock,
  fixtures,
  generateSdkResponse,
  defaultOptionsValues,
  WAIT_TIMEOUT,
} from './descope-wc.test-harness';

import '@testing-library/jest-dom';
import { waitFor, fireEvent } from '@testing-library/dom';
import { screen } from 'shadow-dom-testing-library';

import '../src/lib/descope-wc';

import {
  URL_TOKEN_PARAM_NAME,
  DESCOPE_ATTRIBUTE_PREFIX,
} from '../src/lib/constants';

describe('web-component submission', () => {
  beforeEach(() => {
    setupWebComponentTestEnv();
  });

  afterEach(() => {
    teardownWebComponentTestEnv();
  });

  it('When submitting it injects the next page to the website', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));

    fixtures.pageContent =
      '<descope-button>click</descope-button><input id="email"></input><input id="code"></input><span>Loaded</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('Loaded'), {
      timeout: WAIT_TIMEOUT,
    });

    fixtures.pageContent =
      '<input id="email"></input><input id="code"></input><span>It works!</span>';

    fireEvent.click(screen.getByShadowText('click'));

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    expect(startMock).toBeCalledTimes(1);
    expect(nextMock).toBeCalledTimes(1);
  });

  it('When submitting it calls next with the button id', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));

    fixtures.pageContent =
      '<descope-button id="submitterId">click</descope-button><input id="email" name="email"></input><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    fireEvent.click(screen.getByShadowText('click'));

    await waitFor(() =>
      expect(nextMock).toHaveBeenCalledWith(
        '0',
        '0',
        'submitterId',
        1,
        '1.2.3',
        {
          email: '',
          origin: 'http://localhost',
        },
        false,
      ),
    );
  });

  it('When submitting it calls next with the input value', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));

    fixtures.pageContent =
      '<descope-button id="submitterId">click</descope-button><input id="toggle" name="t1" value="123"></input><span>It works!</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-up-or-in" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('It works!'), {
      timeout: WAIT_TIMEOUT,
    });

    fireEvent.click(screen.getByShadowText('click'));

    await waitFor(
      () =>
        expect(nextMock).toHaveBeenCalledWith(
          '0',
          '0',
          'submitterId',
          0,
          '1.2.3',
          {
            t1: '123',
            origin: 'http://localhost',
          },
          false,
        ),
      { timeout: WAIT_TIMEOUT },
    );
  });

  it('When submitting and no execution id - it calls start with the button id and token if exists', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    fixtures.configContent = {
      ...fixtures.configContent,
      flows: {
        'sign-in': { startScreenId: 'screen-0' },
      },
    };
    const token = 'token1';
    window.location.search = `?&${URL_TOKEN_PARAM_NAME}=${token}`;
    fixtures.pageContent =
      '<descope-button id="submitterId">click</descope-button><input id="email" name="email"></input><span>hey</span>';

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="sign-in" project-id="1" redirect-url="http://custom.url"></descope-wc>`;

    await waitFor(() => screen.findByShadowText('hey'), {
      timeout: WAIT_TIMEOUT,
    });

    fireEvent.click(screen.getByShadowText('click'));

    await waitFor(() =>
      expect(startMock).toHaveBeenCalledWith(
        'sign-in',
        {
          ...defaultOptionsValues,
          redirectUrl: 'http://custom.url',
          preview: false,
        },
        undefined,
        'submitterId',
        '1.2.3',
        {
          'sign-in': 0,
        },
        {
          email: '',
          origin: 'http://localhost',
          token,
        },
        false,
      ),
    );
  });

  it('When clicking a button it should collect all the descope attributes and call next with it', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));

    fixtures.pageContent = `<descope-button type="button" id="123" ${DESCOPE_ATTRIBUTE_PREFIX}attr1='attr1' ${DESCOPE_ATTRIBUTE_PREFIX}attr2='attr2'>Click</descope-button>`;

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.findByShadowText('Click'), {
      timeout: WAIT_TIMEOUT,
    });

    fixtures.pageContent =
      '<input id="email"></input><input id="code"></input><span>It works!</span>';

    fireEvent.click(screen.getByShadowText('Click'));

    await waitFor(() =>
      expect(nextMock).toBeCalledWith(
        '0',
        '0',
        '123',
        1,
        '1.2.3',
        {
          attr1: 'attr1',
          attr2: 'attr2',
          origin: 'http://localhost',
        },
        false,
      ),
    );
  });

  it('Submitter button should have a loading class when next is pending', async () => {
    startMock.mockReturnValueOnce(generateSdkResponse());
    let resolve: Function;
    nextMock.mockImplementationOnce(
      () =>
        new Promise((res) => {
          resolve = res;
        }),
    );

    fixtures.pageContent = `<descope-button type="button" id="123" ${DESCOPE_ATTRIBUTE_PREFIX}attr1='attr1' ${DESCOPE_ATTRIBUTE_PREFIX}attr2='attr2'>Click</descope-button>`;

    document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    await waitFor(() => screen.findByShadowText('Click'), {
      timeout: WAIT_TIMEOUT,
    });

    fireEvent.click(screen.getByShadowText('Click'));

    await waitFor(() =>
      expect(screen.getByShadowText('Click')).toHaveAttribute(
        'loading',
        'true',
      ),
    );

    resolve(generateSdkResponse({ screenId: '1' }));

    await waitFor(
      () => expect(screen.getByShadowText('Click')).not.toHaveClass('loading'),
      { timeout: WAIT_TIMEOUT },
    );
  });
});
