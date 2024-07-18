import { SDK_SCRIPT_RESULTS_KEY } from '../../constants';

export function getScriptResultPath(scriptId: string, resultKey?: string) {
  const path = resultKey ? `${scriptId}_${resultKey}` : scriptId;
  return `${SDK_SCRIPT_RESULTS_KEY}.${path}`;
}

// this function should contain the script that will load the sdk scripts
// this is documented in `loadSdkScript` README
export default async function loadSdkScript(scriptId: string) {
  let res;
  switch (scriptId) {
    case 'forter':
      res = await import('./forter');
      return res.default;
    default:
      throw new Error(`Unknown script id: ${scriptId}`);
  }
}
