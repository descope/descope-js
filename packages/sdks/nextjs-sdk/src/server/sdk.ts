import descopeSdk from '@descope/node-sdk';
import { baseHeaders } from './constants';

type Sdk = ReturnType<typeof descopeSdk>;
type CreateServerSdkParams = Omit<
	Parameters<typeof descopeSdk>[0],
	'projectId'
> & {
	projectId?: string | undefined;
};

type CreateSdkParams = Pick<CreateServerSdkParams, 'projectId' | 'baseUrl'>;

let globalSdk: Sdk;

const getProjectId = (config?: CreateSdkParams): string =>
	config?.projectId ||
	process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID ||
	process.env.DESCOPE_PROJECT_ID; // the last one for backward compatibility

export const createSdk = (config?: CreateServerSdkParams): Sdk =>
	descopeSdk({
		...config,
		projectId: getProjectId(config),
		managementKey: config?.managementKey || process.env.DESCOPE_MANAGEMENT_KEY,
		baseUrl:
			config?.baseUrl ||
			process.env.NEXT_PUBLIC_DESCOPE_BASE_URL ||
			process.env.DESCOPE_BASE_URL, // the last one for backward compatibility
		baseHeaders: {
			...config?.baseHeaders,
			...baseHeaders
		}
	});

export const getGlobalSdk = (config?: CreateSdkParams): Sdk => {
	const projectId = getProjectId(config);
	if (!globalSdk) {
		if (!projectId) {
			throw new Error('Descope project ID is required to create the SDK');
		}
		globalSdk = createSdk(config);
	}

	return globalSdk;
};

export type { CreateSdkParams };
