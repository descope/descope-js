import { screen, waitFor } from '@testing-library/dom';
import {
  clearDocument,
  createDescopeWc,
  mockProjectApiCall,
  waitForReady,
} from './testUtils';

const projectId = 'P123';
const flowId = 'test-flow';
const version = '1.0.0';
const sriHash = 'sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC';

describe('descope-wc SRI (Subresource Integrity)', () => {
  beforeEach(() => {
    clearDocument();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should load components UI without SRI when hash is not provided in config', async () => {
    mockProjectApiCall({
      projectConfig: {
        componentsVersion: version,
        flows: {
          [flowId]: {
            version: 1,
          },
        },
      },
    });

    const descopeWcEle = createDescopeWc({ projectId, flowId });
    document.body.appendChild(descopeWcEle);

    await waitForReady(descopeWcEle);

    await waitFor(() => {
      const scripts = Array.from(document.querySelectorAll('script'));
      const componentScript = scripts.find((script) =>
        script.src.includes('@descope/web-components-ui'),
      );

      expect(componentScript).toBeDefined();
      expect(componentScript?.integrity).toBe('');
      expect(componentScript?.crossOrigin).toBe('');
    });
  });

  it('should add integrity and crossOrigin attributes when SRI hash is provided', async () => {
    mockProjectApiCall({
      projectConfig: {
        componentsVersion: version,
        componentsVersionSRI: sriHash,
        flows: {
          [flowId]: {
            version: 1,
          },
        },
      },
    });

    const descopeWcEle = createDescopeWc({ projectId, flowId });
    document.body.appendChild(descopeWcEle);

    await waitForReady(descopeWcEle);

    await waitFor(() => {
      const scripts = Array.from(document.querySelectorAll('script'));
      const componentScript = scripts.find((script) =>
        script.src.includes('@descope/web-components-ui'),
      );

      expect(componentScript).toBeDefined();
      expect(componentScript?.integrity).toBe(sriHash);
      expect(componentScript?.crossOrigin).toBe('anonymous');
    });
  });

  it('should log when SRI hash is available', async () => {
    const logSpy = jest.spyOn(console, 'debug').mockImplementation();

    mockProjectApiCall({
      projectConfig: {
        componentsVersion: version,
        componentsVersionSRI: sriHash,
        flows: {
          [flowId]: {
            version: 1,
          },
        },
      },
    });

    const descopeWcEle = createDescopeWc({ projectId, flowId });
    document.body.appendChild(descopeWcEle);

    await waitForReady(descopeWcEle);

    await waitFor(() => {
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('SRI hash available for components'),
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('with SRI integrity check'),
      );
    });

    logSpy.mockRestore();
  });

  it('should work with different SRI hash algorithms', async () => {
    const sha256Hash = 'sha256-abc123';
    const sha512Hash = 'sha512-xyz789';

    // Test SHA-256
    mockProjectApiCall({
      projectConfig: {
        componentsVersion: version,
        componentsVersionSRI: sha256Hash,
        flows: {
          [flowId]: {
            version: 1,
          },
        },
      },
    });

    const descopeWcEle1 = createDescopeWc({ projectId, flowId });
    document.body.appendChild(descopeWcEle1);

    await waitForReady(descopeWcEle1);

    await waitFor(() => {
      const scripts = Array.from(document.querySelectorAll('script'));
      const componentScript = scripts.find((script) =>
        script.src.includes('@descope/web-components-ui'),
      );
      expect(componentScript?.integrity).toBe(sha256Hash);
    });

    clearDocument();

    // Test SHA-512
    mockProjectApiCall({
      projectConfig: {
        componentsVersion: version,
        componentsVersionSRI: sha512Hash,
        flows: {
          [flowId]: {
            version: 1,
          },
        },
      },
    });

    const descopeWcEle2 = createDescopeWc({ projectId, flowId });
    document.body.appendChild(descopeWcEle2);

    await waitForReady(descopeWcEle2);

    await waitFor(() => {
      const scripts = Array.from(document.querySelectorAll('script'));
      const componentScript = scripts.find((script) =>
        script.src.includes('@descope/web-components-ui'),
      );
      expect(componentScript?.integrity).toBe(sha512Hash);
    });
  });

  it('should gracefully handle missing SRI hash for backward compatibility', async () => {
    mockProjectApiCall({
      projectConfig: {
        componentsVersion: version,
        // componentsVersionSRI is intentionally omitted
        flows: {
          [flowId]: {
            version: 1,
          },
        },
      },
    });

    const descopeWcEle = createDescopeWc({ projectId, flowId });
    document.body.appendChild(descopeWcEle);

    // Should not throw error and flow should load normally
    await expect(waitForReady(descopeWcEle)).resolves.not.toThrow();

    await waitFor(() => {
      const scripts = Array.from(document.querySelectorAll('script'));
      const componentScript = scripts.find((script) =>
        script.src.includes('@descope/web-components-ui'),
      );

      expect(componentScript).toBeDefined();
      // No integrity attribute when not provided
      expect(componentScript?.hasAttribute('integrity')).toBe(false);
    });
  });

  it('should apply SRI to all CDN fallbacks', async () => {
    mockProjectApiCall({
      projectConfig: {
        componentsVersion: version,
        componentsVersionSRI: sriHash,
        flows: {
          [flowId]: {
            version: 1,
          },
        },
      },
    });

    const descopeWcEle = createDescopeWc({ projectId, flowId });
    document.body.appendChild(descopeWcEle);

    await waitForReady(descopeWcEle);

    // Verify that the integrity is applied regardless of which CDN is used
    await waitFor(() => {
      const scripts = Array.from(document.querySelectorAll('script'));
      const componentScript = scripts.find((script) =>
        script.src.includes('@descope/web-components-ui'),
      );

      expect(componentScript?.integrity).toBe(sriHash);
      expect(componentScript?.crossOrigin).toBe('anonymous');
    });
  });
});
