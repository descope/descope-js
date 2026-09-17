/* eslint-disable import/order */
// @ts-nocheck

import {
  WAIT_TIMEOUT,
  fixtures,
  setupWebComponentTestEnv,
  startMock,
  nextMock,
  teardownWebComponentTestEnv,
  generateSdkResponse,
} from './descope-wc.test-harness';

import '@testing-library/jest-dom';
import { waitFor } from '@testing-library/dom';
import { screen } from 'shadow-dom-testing-library';

import '../src/lib/descope-wc';

// eslint-disable-next-line import/no-namespace
import * as helpers from '../src/lib/helpers/helpers';
import {
  RESPONSE_ACTIONS,
  SAML_IDP_USERNAME_PARAM_NAME,
} from '../src/lib/constants';

describe('web-component', () => {
  beforeEach(() => {
    setupWebComponentTestEnv();
  });

  afterEach(() => {
    teardownWebComponentTestEnv();
  });

  describe('SAML', () => {
    const samlUrl = 'http://acs.dummy.com';

    // renders <descope-wc>, returns the injected saml form and the submitForm spy
    const renderSamlIdpForm = async (
      samlResponse: string,
      relayState: string,
    ) => {
      startMock.mockReturnValue(
        generateSdkResponse({
          ok: true,
          executionId: 'e1',
          action: RESPONSE_ACTIONS.loadForm,
          samlIdpResponseUrl: samlUrl,
          samlIdpResponseSamlResponse: samlResponse,
          samlIdpResponseRelayState: relayState,
        }),
      );

      const mockSubmitForm = jest.spyOn(helpers, 'submitForm');
      mockSubmitForm.mockImplementation(() => {});

      document.body.innerHTML = `<h1>Custom element test</h1><descope-wc flow-id="versioned-flow" project-id="1"></descope-wc>`;

      const form = (await waitFor(
        () => {
          const samlForm = document.querySelector(`form[action="${samlUrl}"]`);

          if (!samlForm) {
            throw Error();
          }
          return samlForm;
        },
        {
          timeout: 8000,
        },
      )) as HTMLFormElement;

      return { form, mockSubmitForm };
    };

    it('should validate handling of saml idp response', async () => {
      const { form, mockSubmitForm } = await renderSamlIdpForm(
        'saml-response-dummy-value',
        'saml-relay-state-dummy-value',
      );

      expect(form).toBeInTheDocument();

      // validate inputs exist
      const inputSamlResponse = document.querySelector(
        `form[action="${samlUrl}"] input[role="saml-response"]`,
      );
      expect(inputSamlResponse).toBeInTheDocument();
      expect(inputSamlResponse).not.toBeVisible();
      expect(inputSamlResponse).toHaveValue('saml-response-dummy-value');

      // validate inputs are hidden
      const inputSamlRelayState = document.querySelector(
        `form[action="${samlUrl}"] input[role="saml-relay-state"]`,
      );
      expect(inputSamlRelayState).toBeInTheDocument();
      expect(inputSamlRelayState).not.toBeVisible();
      expect(inputSamlRelayState).toHaveValue('saml-relay-state-dummy-value');

      await waitFor(
        () => {
          expect(mockSubmitForm).toHaveBeenCalledTimes(1);
        },
        { timeout: 6000 },
      );
    });

    it('should not parse markup-shaped saml idp values as HTML', async () => {
      const maliciousRelayState = '"><img src=x onerror=alert(1)>';
      const maliciousSamlResponse = '"><input name="submit" value="clobbered">';

      const { form, mockSubmitForm } = await renderSamlIdpForm(
        maliciousSamlResponse,
        maliciousRelayState,
      );

      // no foreign nodes were created from the markup-shaped values
      expect(form.querySelector('img')).toBeNull();
      expect(form.children).toHaveLength(3);

      // full values are preserved
      expect(form.querySelector('input[role="saml-response"]')).toHaveValue(
        maliciousSamlResponse,
      );
      expect(form.querySelector('input[role="saml-relay-state"]')).toHaveValue(
        maliciousRelayState,
      );

      // form.submit is not clobbered by an injected control named "submit"
      expect(typeof form.submit).toBe('function');

      await waitFor(
        () => {
          expect(mockSubmitForm).toHaveBeenCalledTimes(1);
        },
        { timeout: 6000 },
      );
    });

    it('should automatic fill saml idp username in form element', async () => {
      startMock.mockReturnValue(
        generateSdkResponse({
          ok: true,
          executionId: 'e1',
        }),
      );
      nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));

      const samlIdpEmailAddress = 'dummy@email.com';
      const encodedSamlIdpEmailAddress =
        encodeURIComponent(samlIdpEmailAddress);
      window.location.search = `?${SAML_IDP_USERNAME_PARAM_NAME}=${encodedSamlIdpEmailAddress}`;

      fixtures.pageContent =
        '<div>Loaded</div><input class="descope-input" id="loginId" name="loginId" value="{{loginId}}">{{loginId}}</input><input class="descope-input" id="email" name="email">{{email}}</input>';

      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="versioned-flow" project-id="1"></descope-wc>`;

      await waitFor(() => screen.getByShadowText('Loaded'), {
        timeout: WAIT_TIMEOUT,
      });

      const inputs = await waitFor(
        () => screen.findAllByShadowDisplayValue(samlIdpEmailAddress),
        {
          timeout: 6000,
        },
      );

      expect(inputs.length).toBe(2);
    });
  });
});
