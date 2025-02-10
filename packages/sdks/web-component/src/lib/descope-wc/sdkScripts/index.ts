import { SDK_SCRIPT_RESULTS_KEY } from '../../constants';

export function getScriptResultPath(scriptId: string, resultKey?: string) {
  const path = resultKey ? `${scriptId}_${resultKey}` : scriptId;
  return `${SDK_SCRIPT_RESULTS_KEY}.${path}`;
}

export const scripts = {
  forter: './forter',
  fingerprint: './fingerprint',
  fingerprintDescope: './fingerprintDescope',
  grecaptcha: './grecaptcha',
};

// this function should contain the script that will load the sdk scripts
// this is documented in `loadSdkScript` README
export default async function loadSdkScript(scriptId: string) {
  const path = scripts[scriptId];
  if (!path) {
    throw new Error(`Unknown script id: ${scriptId}`);
  }
  const res = await import(path);
  return res.default;
}
