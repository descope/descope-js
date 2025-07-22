import descopeSdk from '@descope/node-sdk';
import { baseHeaders } from '../../src/shared/constants';
import { createSdk, getGlobalSdk } from '../../src/server/sdk';

jest.mock('@descope/node-sdk', () =>
	jest.fn().mockImplementation((...args) => {
		// we want to use the original implementation of descopeSdk
		// but we need to mock it to ensure it is called with the correct parameters
		const mockOriginalDescopeSdk =
			jest.requireActual('@descope/node-sdk').default;
		return mockOriginalDescopeSdk(...args);
	})
);

describe('sdk', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	afterEach(() => {
		jest.resetModules();
	});

	describe('createSdk', () => {
		it('should create a new sdk with parameters', () => {
			const config = { projectId: 'project1', managementKey: 'key1' };
			createSdk(config);

			expect(descopeSdk).toHaveBeenCalledWith(
				expect.objectContaining({
					projectId: 'project1',
					managementKey: 'key1',
					baseHeaders: expect.objectContaining(baseHeaders)
				})
			);
		});

		it('should create a new sdk with env variables', () => {
			process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID = 'envProjectId';
			process.env.DESCOPE_MANAGEMENT_KEY = 'envManagementKey';
			process.env.NEXT_PUBLIC_DESCOPE_BASE_URL = 'envBaseUrl';

			createSdk();

			expect(descopeSdk).toHaveBeenCalledWith(
				expect.objectContaining({
					projectId: 'envProjectId',
					managementKey: 'envManagementKey',
					baseUrl: 'envBaseUrl',
					baseHeaders: expect.any(Object)
				})
			);

			// Clean up environment variables to avoid side effects
			delete process.env.NEXT_PUBLIC_DESCOPE_BASE_URL;
			delete process.env.DESCOPE_MANAGEMENT_KEY;
			delete process.env.NEXT_PUBLIC_DESCOPE_BASE_URL;
		});

		it('should create a new sdk with legacy env variables', () => {
			process.env.DESCOPE_PROJECT_ID = 'envProjectId';
			process.env.DESCOPE_MANAGEMENT_KEY = 'envManagementKey';
			process.env.DESCOPE_BASE_URL = 'envBaseUrl';

			createSdk();

			expect(descopeSdk).toHaveBeenCalledWith(
				expect.objectContaining({
					projectId: 'envProjectId',
					managementKey: 'envManagementKey',
					baseUrl: 'envBaseUrl',
					baseHeaders: expect.any(Object)
				})
			);

			// Clean up environment variables to avoid side effects
			delete process.env.DESCOPE_PROJECT_ID;
			delete process.env.DESCOPE_MANAGEMENT_KEY;
			delete process.env.DESCOPE_BASE_URL;
		});
	});

	describe('getGlobalSdk', () => {
		it('should create a new sdk if one does not exist', () => {
			const config = { projectId: 'project1' };
			getGlobalSdk(config);

			expect(descopeSdk).toHaveBeenCalledWith(
				expect.objectContaining({
					projectId: 'project1'
				})
			);
		});

		it('should return the existing sdk', () => {
			const sdk1 = getGlobalSdk({ projectId: 'project1' });
			const sdk2 = getGlobalSdk({ projectId: 'project1' });

			expect(sdk1).toBe(sdk2); // Verify that the same SDK instance is returned
		});

		it('should handle multiple project IDs in the same scope', () => {
			// Set up environment variable for second test
			process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID = 'envProjectId';

			// 1. Custom project id
			const sdk1 = getGlobalSdk({ projectId: 'customProject1' });

			// 2. Project id from env var
			const sdk2 = getGlobalSdk(); // Uses env var

			// 3. Another custom project id
			const sdk3 = getGlobalSdk({ projectId: 'customProject2' });

			// ensure there are 3 calls with different project IDs
			expect(descopeSdk).toHaveBeenCalledTimes(3);
			// Verify that descopeSdk was called with correct project IDs
			expect(descopeSdk).toHaveBeenCalledWith(
				expect.objectContaining({ projectId: 'customProject1' })
			);
			expect(descopeSdk).toHaveBeenCalledWith(
				expect.objectContaining({ projectId: 'envProjectId' })
			);
			expect(descopeSdk).toHaveBeenCalledWith(
				expect.objectContaining({ projectId: 'customProject2' })
			);

			// Verify that each SDK is different (different project IDs)
			expect(sdk1).not.toEqual(sdk2);
			expect(sdk1).not.toEqual(sdk3);
			expect(sdk2).not.toEqual(sdk3);

			// Verify that calling with the same project ID returns the same SDK instance
			const sdk1Again = getGlobalSdk({ projectId: 'customProject1' });
			const sdk2Again = getGlobalSdk(); // Uses env var again
			const sdk3Again = getGlobalSdk({ projectId: 'customProject2' });

			expect(sdk1).toBe(sdk1Again);
			expect(sdk2).toBe(sdk2Again);
			expect(sdk3).toBe(sdk3Again);

			// ensure that the descopeSdk was not called again
			expect(descopeSdk).toHaveBeenCalledTimes(3);

			// Clean up environment variable
			delete process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID;
		});

		it("should throw an error if no projectId is provided and it's not in env", () => {
			// environment variable is not set and no projectId is provided
			delete process.env.DESCOPE_PROJECT_ID;
			delete process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID;

			expect(() => getGlobalSdk()).toThrow(
				'Descope project ID is required to create the SDK'
			);
		});
	});
});
