/* eslint-disable import/no-namespace */
import { waitFor } from '@testing-library/dom';
import * as fp from '@fingerprintjs/fingerprintjs-pro';
import loadSdkScript from '../../src/lib/descope-wc/sdkScripts';

const urlPattern =
  '?apiKey=<apiKey>&version=<version>&loaderVersion=<loaderVersion>';
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('sdkScripts', () => {
  describe('loadSdkScript', () => {
    it('should throw an error when got invalid script', () => {
      expect(loadSdkScript('not-exists')).rejects.toThrow();
    });
  });

  describe('forter', () => {
    it('should run forter', async () => {
      const forterModule = await loadSdkScript('forter');
      const tokenChangedFn = jest.fn();

      await forterModule({ siteId: 'some-site-id' }, {}, tokenChangedFn);

      // get script from document and ensure it has id attribute
      const script = document.querySelector('script');

      // the script changes the id attribute to the siteId
      expect(script.getAttribute('id')).toBeTruthy();
      // get textContent and ensure it contains the script id
      // eslint-disable-next-line jest-dom/prefer-to-have-text-content
      expect(script.textContent).toContain('some-site-id');

      // trigger 'ftr:tokenReady' event and ensure that the tokenChangedFn is called
      const event = new CustomEvent('ftr:tokenReady', {
        detail: 'some-token',
      });

      document.dispatchEvent(event);
      await waitFor(() =>
        expect(tokenChangedFn).toHaveBeenCalledWith('some-token'),
      );
    });
  });

  describe('fingerprint', () => {
    it('should run fingerprint', async () => {
      const requestId = '12345';
      const mockOnTokenReady = jest.fn();
      const getFunc = jest.fn().mockResolvedValue({ requestId });
      const agent = jest.spyOn(fp, 'load');
      agent.mockResolvedValue({ get: getFunc });

      const fingerprintModule = await loadSdkScript('fingerprint');
      await fingerprintModule(
        {
          publicApiKey: 'testApiKey',
          useCloudflareIntegration: false,
          cloudflareEndpointUrl: '',
          cloudflareScriptUrl: '',
        },
        {},
        mockOnTokenReady,
      );

      expect(agent).toHaveBeenCalledWith({
        apiKey: 'testApiKey',
        endpoint: [fp.defaultEndpoint],
        scriptUrlPattern: [fp.defaultScriptUrlPattern],
      });
      expect(agent).toHaveBeenCalled();
      expect(getFunc).toHaveBeenCalled();
      expect(mockOnTokenReady).toHaveBeenCalledWith(requestId);
    });

    it('should run fingerprint with cloudflare integration', async () => {
      const requestId = '12345';
      const mockOnTokenReady = jest.fn();
      const getFunc = jest.fn().mockResolvedValue({ requestId });
      const agent = jest.spyOn(fp, 'load');
      agent.mockResolvedValue({ get: getFunc });

      const fingerprintModule = await loadSdkScript('fingerprint');
      await fingerprintModule(
        {
          publicApiKey: 'testApiKey',
          useCloudflareIntegration: true,
          cloudflareEndpointUrl: 'https://cloudflare.endpoint',
          cloudflareScriptUrl: 'https://cloudflare.script.url',
        },
        {},
        mockOnTokenReady,
      );

      expect(agent).toHaveBeenCalledWith({
        apiKey: 'testApiKey',
        endpoint: ['https://cloudflare.endpoint/', fp.defaultEndpoint],
        scriptUrlPattern: [
          `https://cloudflare.script.url/${urlPattern}`,
          fp.defaultScriptUrlPattern,
        ],
      });
      expect(agent).toHaveBeenCalled();
      expect(getFunc).toHaveBeenCalled();
      expect(mockOnTokenReady).toHaveBeenCalledWith(requestId);
    });
  });

  describe('fingerprintDescope', () => {
    it('should run fingerprintDescope', async () => {
      const requestId = '12345';
      const mockOnTokenReady = jest.fn();
      const getFunc = jest.fn().mockResolvedValue({ requestId });
      const agent = jest.spyOn(fp, 'load');
      agent.mockResolvedValue({ get: getFunc });

      const fingerprintModule = await loadSdkScript('fingerprintDescope');
      await fingerprintModule(
        {
          publicApiKey: 'testApiKey',
          cloudflareEndpointPath: 'cloudflare.endpoint',
          cloudflareScriptPath: 'cloudflare.script.url',
        },
        {},
        mockOnTokenReady,
      );

      expect(agent).toHaveBeenCalledWith({
        apiKey: 'testApiKey',
        endpoint: [
          'https://api.descope.com/cloudflare.endpoint',
          fp.defaultEndpoint,
        ],
        scriptUrlPattern: [
          `https://api.descope.com/cloudflare.script.url${urlPattern}`,
          fp.defaultScriptUrlPattern,
        ],
      });
      expect(agent).toHaveBeenCalled();
      expect(getFunc).toHaveBeenCalled();
      expect(mockOnTokenReady).toHaveBeenCalledWith(requestId);
    });

    it('should run fingerprintDescope with base url', async () => {
      const requestId = '12345';
      const baseUrl = 'https://my.base.url.com';
      const mockOnTokenReady = jest.fn();
      const getFunc = jest.fn().mockResolvedValue({ requestId });
      const agent = jest.spyOn(fp, 'load');
      agent.mockResolvedValue({ get: getFunc });

      const fingerprintModule = await loadSdkScript('fingerprintDescope');
      await fingerprintModule(
        {
          publicApiKey: 'testApiKey',
          cloudflareEndpointPath: 'cloudflare.endpoint',
          cloudflareScriptPath: 'cloudflare.script.url',
        },
        { baseUrl },
        mockOnTokenReady,
      );

      expect(agent).toHaveBeenCalledWith({
        apiKey: 'testApiKey',
        endpoint: [`${baseUrl}/cloudflare.endpoint`, fp.defaultEndpoint],
        scriptUrlPattern: [
          `${baseUrl}/cloudflare.script.url${urlPattern}`,
          fp.defaultScriptUrlPattern,
        ],
      });
      expect(agent).toHaveBeenCalled();
      expect(getFunc).toHaveBeenCalled();
      expect(mockOnTokenReady).toHaveBeenCalledWith(requestId);
    });

    it('should run fingerprintDescope with custom domain', async () => {
      const requestId = '12345';
      const baseUrl = 'https://my.base.url.com';
      const customDomain = 'custom.descope.com';
      const mockOnTokenReady = jest.fn();
      const getFunc = jest.fn().mockResolvedValue({ requestId });
      const agent = jest.spyOn(fp, 'load');
      agent.mockResolvedValue({ get: getFunc });

      const fingerprintModule = await loadSdkScript('fingerprintDescope');
      await fingerprintModule(
        {
          publicApiKey: 'testApiKey',
          customDomain,
          cloudflareEndpointPath: 'cloudflare.endpoint',
          cloudflareScriptPath: 'cloudflare.script.url',
        },
        { baseUrl },
        mockOnTokenReady,
      );

      expect(agent).toHaveBeenCalledWith({
        apiKey: 'testApiKey',
        endpoint: [
          `https://${customDomain}/cloudflare.endpoint`,
          fp.defaultEndpoint,
        ],
        scriptUrlPattern: [
          `https://${customDomain}/cloudflare.script.url${urlPattern}`,
          fp.defaultScriptUrlPattern,
        ],
      });
      expect(agent).toHaveBeenCalled();
      expect(getFunc).toHaveBeenCalled();
      expect(mockOnTokenReady).toHaveBeenCalledWith(requestId);
    });
  });
});
