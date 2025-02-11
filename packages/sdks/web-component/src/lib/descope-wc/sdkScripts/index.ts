import { SDK_SCRIPT_RESULTS_KEY } from '../../constants';

export function getScriptResultPath(scriptId: string, resultKey?: string) {
  const path = resultKey ? `${scriptId}_${resultKey}` : scriptId;
  return `${SDK_SCRIPT_RESULTS_KEY}.${path}`;
}

export default async function loadSdkScript(scriptId: string) {
  let res;
  switch (scriptId) {
    case 'forter':
      res = await import('./forter');
      return res.default;
    case 'fingerprint':
      // eslint-disable-next-line no-case-declarations
      res = await import('./fingerprint');
      return res.default;
    case 'fingerprintDescope':
      // eslint-disable-next-line no-case-declarations
      res = await import('./fingerprintDescope');
      return res.default;
    case 'grecaptcha':
      // eslint-disable-next-line no-case-declarations
      res = await import('./grecaptcha');
      return res.default;
    default:
      throw new Error(`Unknown script id: ${scriptId}`);
  }
}
