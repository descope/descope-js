/* eslint-disable import/order */
// @ts-nocheck

import {
  setupWebComponentTestEnv,
  startMock,
  teardownWebComponentTestEnv,
  generateSdkResponse,
} from './descope-wc.test-harness';

import '@testing-library/jest-dom';
import { waitFor } from '@testing-library/dom';

import '../src/lib/descope-wc';

// eslint-disable-next-line import/no-namespace
import * as helpers from '../src/lib/helpers/helpers';
import { RESPONSE_ACTIONS } from '../src/lib/constants';

describe('web-component', () => {
  beforeEach(() => {
    setupWebComponentTestEnv();
  });

  afterEach(() => {
    teardownWebComponentTestEnv();
  });

  describe('WS-Fed', () => {
    it('should validate handling of wsfed idp response', async () => {
      const wsFedUrl = 'http://rp.dummy.com/callback';

      startMock.mockReturnValue(
        generateSdkResponse({
          ok: true,
          executionId: 'e1',
          action: RESPONSE_ACTIONS.loadForm,
          wsFedIdpResponseUrl: wsFedUrl,
          wsFedIdpResponseWresult: 'rstr-xml-dummy-value',
          wsFedIdpResponseWctx: 'wctx-dummy-value',
        }),
      );

      const mockSubmitForm = jest.spyOn(helpers, 'submitForm');
      mockSubmitForm.mockImplementation(() => {});

      document.body.innerHTML = `<h1>Custom element test</h1><descope-wc flow-id="versioned-flow" project-id="1"></descope-wc>`;

      const form = (await waitFor(
        () => {
          const wsFedForm = document.querySelector(
            `form[action="${wsFedUrl}"]`,
          );

          if (!wsFedForm) {
            throw Error();
          }
          return wsFedForm;
        },
        {
          timeout: 8000,
        },
      )) as HTMLFormElement;

      expect(form).toBeInTheDocument();

      // validate wa hidden input
      const inputWa = document.querySelector(
        `form[action="${wsFedUrl}"] input[name="wa"]`,
      );
      expect(inputWa).toBeInTheDocument();
      expect(inputWa).not.toBeVisible();
      expect(inputWa).toHaveValue('wsignin1.0');

      // validate wresult hidden input
      const inputWresult = document.querySelector(
        `form[action="${wsFedUrl}"] input[name="wresult"]`,
      );
      expect(inputWresult).toBeInTheDocument();
      expect(inputWresult).not.toBeVisible();
      expect(inputWresult).toHaveValue('rstr-xml-dummy-value');

      // validate wctx hidden input
      const inputWctx = document.querySelector(
        `form[action="${wsFedUrl}"] input[name="wctx"]`,
      );
      expect(inputWctx).toBeInTheDocument();
      expect(inputWctx).not.toBeVisible();
      expect(inputWctx).toHaveValue('wctx-dummy-value');

      await waitFor(
        () => {
          expect(mockSubmitForm).toHaveBeenCalledTimes(1);
        },
        { timeout: 6000 },
      );
    });
  });
});
