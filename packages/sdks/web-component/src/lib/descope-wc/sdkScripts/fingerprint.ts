import {
  load,
  defaultEndpoint,
  defaultScriptUrlPattern,
} from '@fingerprintjs/fingerprintjs-pro';

export const loadFingerprint = async (
  initArgs: {
    publicApiKey: string;
    useCloudflareIntegration: boolean;
    cloudflareEndpointUrl: string;
    cloudflareScriptUrl: string;
  },
  _: { baseUrl?: string },
  onTokenReady: (token: string) => void,
) => {
  try {
    const {
      publicApiKey,
      useCloudflareIntegration,
      cloudflareScriptUrl,
      cloudflareEndpointUrl,
    } = initArgs;

    let endpoints = [];
    if (useCloudflareIntegration && cloudflareEndpointUrl) {
      endpoints = [cloudflareEndpointUrl, defaultEndpoint];
    } else {
      endpoints = [defaultEndpoint];
    }

    let scriptUrlPatterns = [];
    if (useCloudflareIntegration && cloudflareScriptUrl) {
      const patterUrl = new URL(cloudflareScriptUrl);
      const scriptUrlPattern = `${patterUrl.toString()}?apiKey=<apiKey>&version=<version>&loaderVersion=<loaderVersion>`;
      scriptUrlPatterns = [scriptUrlPattern, defaultScriptUrlPattern];
    } else {
      scriptUrlPatterns = [defaultScriptUrlPattern];
    }

    // load from FingerprintJS
    const agentP = load({
      apiKey: publicApiKey,
      endpoint: endpoints,
      scriptUrlPattern: scriptUrlPatterns,
    });

    const agent = await agentP;
    const { requestId } = await agent.get();
    onTokenReady(requestId);
  } catch (ex) {
    // eslint-disable-next-line no-console
    console.warn('Could not load fingerprint', ex);
  }
};

export default loadFingerprint;
