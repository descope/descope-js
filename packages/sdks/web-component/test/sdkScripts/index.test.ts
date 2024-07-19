import { waitFor } from '@testing-library/dom';
import loadSdkScript from '../../src/lib/descope-wc/sdkScripts';

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
});
