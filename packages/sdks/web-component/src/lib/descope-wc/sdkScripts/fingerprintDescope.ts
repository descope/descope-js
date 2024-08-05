import {
  load,
  defaultEndpoint,
  defaultScriptUrlPattern,
} from '@fingerprintjs/fingerprintjs-pro';

export const loadFingerprint = async (
  initArgs: {
    customDomain?: string;
    publicApiKey: string;
    cloudflareEndpointPath: string;
    cloudflareScriptPath: string;
  },
  inputs: { baseUrl?: string },
  onTokenReady: (token: string) => void,
) => {
  try {
    const {
      customDomain,
      publicApiKey,
      cloudflareEndpointPath,
      cloudflareScriptPath,
    } = initArgs;
    const { baseUrl } = inputs;
    let fpUrl: string;
    if (customDomain) {
      fpUrl = `https://${customDomain}`;
    } else if (baseUrl) {
      fpUrl = baseUrl;
    } else {
      fpUrl = 'https://api.descope.com';
    }

    const endpointUrl = new URL(fpUrl);
    endpointUrl.pathname = cloudflareEndpointPath;

    const patterUrl = new URL(fpUrl);
    patterUrl.pathname = cloudflareScriptPath;
    const scriptUrlPattern = `${patterUrl.toString()}?apiKey=<apiKey>&version=<version>&loaderVersion=<loaderVersion>`;

    // load from FingerprintJS
    const agentP = load({
      apiKey: publicApiKey,
      endpoint: [
        endpointUrl.toString(),
        defaultEndpoint, // Fallback to default endpoint in case of error
      ],
      scriptUrlPattern: [
        scriptUrlPattern,
        defaultScriptUrlPattern, // Fallback to default CDN in case of error
      ],
    });

    const agent = await agentP;
    const { requestId } = await agent.get();
    onTokenReady(requestId);
  } catch (ex) {
    // eslint-disable-next-line no-console
    console.warn('Could not load descope fingerprint', ex);
  }
};

export default loadFingerprint;
