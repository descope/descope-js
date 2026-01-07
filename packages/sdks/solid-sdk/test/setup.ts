import { expect, afterEach } from 'vitest';
import { cleanup } from '@solidjs/testing-library';

afterEach(() => {
  cleanup();
});

global.BUILD_VERSION = '1.0.0-test';
