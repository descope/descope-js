/* eslint-disable import/order */
// @ts-nocheck

import {
  WAIT_TIMEOUT,
  createSdk,
  fixtures,
  setupWebComponentTestEnv,
  startMock,
  teardownWebComponentTestEnv,
  generateSdkResponse,
} from './descope-wc.test-harness';

import '@testing-library/jest-dom';
import { waitFor } from '@testing-library/dom';
import { screen } from 'shadow-dom-testing-library';

import '../src/lib/descope-wc';

describe('web-component', () => {
  beforeEach(() => {
    setupWebComponentTestEnv();
  });

  afterEach(() => {
    teardownWebComponentTestEnv();
  });

  describe('customStorage', () => {
    const mockCustomStorage = {
      getItem: jest.fn((key: string) => `mocked_${key}`),
      setItem: jest.fn(() => {}),
      removeItem: jest.fn(() => {}),
    };

    beforeEach(() => {
      jest.clearAllMocks();
      startMock.mockReturnValue(generateSdkResponse({}));
      fixtures.pageContent =
        '<button id="email">Button</button><span>It works!</span>';

      const DescopeUI = {
        componentsThemeManager: { currentThemeName: undefined },
      };
      globalThis.DescopeUI = DescopeUI;
    });

    it('should accept customStorage property and pass it to SDK config', async () => {
      // Create element and set customStorage before adding to DOM
      const wc = document.createElement('descope-wc') as any;
      wc.setAttribute('flow-id', 'otpSignInEmail');
      wc.setAttribute('project-id', '1');
      wc.customStorage = mockCustomStorage;

      document.body.innerHTML = `<h1>Custom element test</h1>`;
      document.body.appendChild(wc);

      await waitFor(() => screen.getByShadowText('Button'), {
        timeout: WAIT_TIMEOUT,
      });

      // Wait for the SDK to be created with the custom storage
      await waitFor(
        () => {
          expect(createSdk).toHaveBeenCalledWith(
            expect.objectContaining({
              customStorage: mockCustomStorage,
            }),
          );
        },
        { timeout: 2000 },
      );
    });

    it('should handle customStorage with async methods', async () => {
      const asyncCustomStorage = {
        getItem: jest.fn(async (key: string) =>
          Promise.resolve(`async_${key}`),
        ),
        setItem: jest.fn(async () => Promise.resolve()),
        removeItem: jest.fn(async () => Promise.resolve()),
      };

      // Create element and set customStorage before adding to DOM
      const wc = document.createElement('descope-wc') as any;
      wc.setAttribute('flow-id', 'otpSignInEmail');
      wc.setAttribute('project-id', '1');
      wc.customStorage = asyncCustomStorage;

      document.body.innerHTML = `<h1>Custom element test</h1>`;
      document.body.appendChild(wc);

      await waitFor(
        () => {
          expect(createSdk).toHaveBeenCalledWith(
            expect.objectContaining({
              customStorage: asyncCustomStorage,
            }),
          );
        },
        { timeout: 2000 },
      );
    });

    it('should validate customStorage interface', async () => {
      const invalidStorage = {
        getItem: jest.fn(),
        // Missing set and remove methods
      };

      // Create element and set customStorage before adding to DOM
      const wc = document.createElement('descope-wc') as any;
      wc.setAttribute('flow-id', 'otpSignInEmail');
      wc.setAttribute('project-id', '1');

      document.body.innerHTML = `<h1>Custom element test</h1>`;
      document.body.appendChild(wc);

      // Should throw when setting invalid storage
      expect(() => {
        wc.customStorage = invalidStorage;
      }).toThrow('Custom storage must have a setItem method');
    });
  });
});
