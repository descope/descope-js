import descopeSdk from '@descope/node-sdk';
import { baseHeaders } from './constants';

type Sdk = ReturnType<typeof descopeSdk>;
type CreateSdkParams = Omit<Parameters<typeof descopeSdk>[0], 'projectId'> & {
	projectId?: string | undefined;
};

let globalSdk: Sdk;

export const createSdk = (config?: CreateSdkParams): Sdk =>
	descopeSdk({
		...config,
		projectId: config?.projectId || process.env.DESCOPE_PROJECT_ID,
		managementKey: config?.managementKey || process.env.DESCOPE_MANAGEMENT_KEY,
		baseUrl: config?.baseUrl || process.env.DESCOPE_BASE_URL,
		baseHeaders: {
			...config?.baseHeaders,
			...baseHeaders
		}
	});

export const getGlobalSdk = (
	config?: Pick<CreateSdkParams, 'projectId' | 'baseUrl'>
): Sdk => {
	if (!globalSdk) {
		if (!config?.projectId && !process.env.DESCOPE_PROJECT_ID) {
			throw new Error('Descope project ID is required to create the SDK');
		}
		globalSdk = createSdk(config);
	}

	return globalSdk;
};
