// Keys stripped from the top level of the custom-screen context.
// `cssVars`/`componentsConfig`/`inputs` are internal; `errorText`/`errorType` are
// reshaped into `error`; `clientScripts` is internal; `data` is SDK-owned (rebuilt in
// transformStepStateForCustomScreen, so a backend-provided value never leaks). The rest
// are server-produced screen data relocated under `data`.
export const EXCLUDED_STATE_KEYS = [
  'cssVars',
  'componentsConfig',
  'inputs',
  'errorText',
  'errorType',
  'clientScripts',
  'data',
  'totp',
  'notp',
  'sentTo',
  'sso',
  'selfProvisionDomains',
];
