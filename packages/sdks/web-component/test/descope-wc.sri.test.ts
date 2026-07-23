/* eslint-disable import/order */
// @ts-nocheck

import {
  setupWebComponentTestEnv,
  teardownWebComponentTestEnv,
  fixtures,
  scriptMock,
  WAIT_TIMEOUT,
} from './descope-wc.test-harness';

import '@testing-library/jest-dom';
import { waitFor } from '@testing-library/dom';

import '../src/lib/descope-wc';

const projectId = 'P123';
const flowId = 'test-flow';
const version = '1.0.0';
const sriHash =
  'sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC';

describe('descope-wc SRI (Subresource Integrity)', () => {
  beforeEach(() => {
    setupWebComponentTestEnv();
    // Force script injection by clearing the pre-set DescopeUI singleton
    globalThis.DescopeUI = undefined;
    // Reset integrity state from previous tests (scriptMock is shared)
    scriptMock.removeAttribute('integrity');
    scriptMock.removeAttribute('crossorigin');
  });

  afterEach(() => {
    teardownWebComponentTestEnv();
  });

  it('should load components UI without SRI when hash is not provided in config', async () => {
    fixtures.configContent = {
      componentsVersion: version,
      flows: {
        [flowId]: {
          version: 1,
        },
      },
    };

    document.body.innerHTML = `<descope-wc flow-id="${flowId}" project-id="${projectId}"></descope-wc>`;

    await waitFor(
      () => {
        const scripts = Array.from(document.querySelectorAll('script'));
        const componentScript = scripts.find((script) =>
          script.src.includes('@descope/web-components-ui'),
        );

        expect(componentScript).toBeDefined();
        expect(componentScript?.hasAttribute('integrity')).toBe(false);
        expect(componentScript?.crossOrigin).toBe('');
      },
      { timeout: WAIT_TIMEOUT },
    );
  });

  it('should add integrity and crossOrigin attributes when SRI hash is provided', async () => {
    fixtures.configContent = {
      componentsVersion: version,
      componentsVersionSri: sriHash,
      flows: {
        [flowId]: {
          version: 1,
        },
      },
    };

    document.body.innerHTML = `<descope-wc flow-id="${flowId}" project-id="${projectId}"></descope-wc>`;

    await waitFor(
      () => {
        const scripts = Array.from(document.querySelectorAll('script'));
        const componentScript = scripts.find((script) =>
          script.src.includes('@descope/web-components-ui'),
        );

        expect(componentScript).toBeDefined();
        expect(componentScript?.integrity).toBe(sriHash);
        expect(componentScript?.crossOrigin).toBe('anonymous');
      },
      { timeout: WAIT_TIMEOUT },
    );
  });

  it('should log when SRI hash is available', async () => {
    const logSpy = jest.spyOn(console, 'debug').mockImplementation();

    fixtures.configContent = {
      componentsVersion: version,
      componentsVersionSri: sriHash,
      flows: {
        [flowId]: {
          version: 1,
        },
      },
    };

    document.body.innerHTML = `<descope-wc flow-id="${flowId}" project-id="${projectId}"></descope-wc>`;

    await waitFor(
      () => {
        expect(logSpy).toHaveBeenCalledWith(
          '[Descope]',
          expect.stringContaining('SRI hash available for components'),
        );
        expect(logSpy).toHaveBeenCalledWith(
          '[Descope]',
          expect.stringContaining('with SRI integrity check'),
        );
      },
      { timeout: WAIT_TIMEOUT },
    );

    logSpy.mockRestore();
  });

  it('should work with different SRI hash algorithms', async () => {
    const sha256Hash = 'sha256-abc123';
    const sha512Hash = 'sha512-xyz789';

    fixtures.configContent = {
      componentsVersion: version,
      componentsVersionSri: sha256Hash,
      flows: {
        [flowId]: {
          version: 1,
        },
      },
    };

    document.body.innerHTML = `<descope-wc flow-id="${flowId}" project-id="${projectId}"></descope-wc>`;

    await waitFor(
      () => {
        const scripts = Array.from(document.querySelectorAll('script'));
        const componentScript = scripts.find((script) =>
          script.src.includes('@descope/web-components-ui'),
        );
        expect(componentScript?.integrity).toBe(sha256Hash);
      },
      { timeout: WAIT_TIMEOUT },
    );

    teardownWebComponentTestEnv();
    setupWebComponentTestEnv();
    globalThis.DescopeUI = undefined;
    scriptMock.removeAttribute('integrity');
    scriptMock.removeAttribute('crossorigin');

    fixtures.configContent = {
      componentsVersion: version,
      componentsVersionSri: sha512Hash,
      flows: {
        [flowId]: {
          version: 1,
        },
      },
    };

    document.body.innerHTML = `<descope-wc flow-id="${flowId}" project-id="${projectId}"></descope-wc>`;

    await waitFor(
      () => {
        const scripts = Array.from(document.querySelectorAll('script'));
        const componentScript = scripts.find((script) =>
          script.src.includes('@descope/web-components-ui'),
        );
        expect(componentScript?.integrity).toBe(sha512Hash);
      },
      { timeout: WAIT_TIMEOUT },
    );
  });

  it('should gracefully handle missing SRI hash for backward compatibility', async () => {
    fixtures.configContent = {
      componentsVersion: version,
      flows: {
        [flowId]: {
          version: 1,
        },
      },
    };

    document.body.innerHTML = `<descope-wc flow-id="${flowId}" project-id="${projectId}"></descope-wc>`;

    await waitFor(
      () => {
        const scripts = Array.from(document.querySelectorAll('script'));
        const componentScript = scripts.find((script) =>
          script.src.includes('@descope/web-components-ui'),
        );

        expect(componentScript).toBeDefined();
        expect(componentScript?.hasAttribute('integrity')).toBe(false);
      },
      { timeout: WAIT_TIMEOUT },
    );
  });

  it('should apply SRI to all CDN fallbacks', async () => {
    fixtures.configContent = {
      componentsVersion: version,
      componentsVersionSri: sriHash,
      flows: {
        [flowId]: {
          version: 1,
        },
      },
    };

    document.body.innerHTML = `<descope-wc flow-id="${flowId}" project-id="${projectId}"></descope-wc>`;

    await waitFor(
      () => {
        const scripts = Array.from(document.querySelectorAll('script'));
        const componentScript = scripts.find((script) =>
          script.src.includes('@descope/web-components-ui'),
        );

        expect(componentScript?.integrity).toBe(sriHash);
        expect(componentScript?.crossOrigin).toBe('anonymous');
      },
      { timeout: WAIT_TIMEOUT },
    );
  });
});
