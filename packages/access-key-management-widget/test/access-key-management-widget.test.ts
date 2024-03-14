// import '@testing-library/jest-dom';
// import { waitFor } from '@testing-library/dom';
// import { apiPaths } from '../src/lib/widget/api/apiPaths';
// import { mockRoles } from './mocks/mockRoles';
// import { createSdk } from '../src/lib/widget/api/sdk';
// import { pluralize } from '../src/lib/helpers/generic';
// import '../src/lib/index';
// import rootMock from './mocks/rootMock';
// import createRoleModalMock from './mocks/createAccessKeyModalMock';
// import editRoleModalMock from './mocks/editRoleModalMock';
// import deleteRoleModalMock from './mocks/deleteAccessKeyModalMock';

// const origAppend = document.body.append;

// const mockProjectId = 'mockProjectId';
// const mockTenant = 'mockTenant';

// export const mockHttpClient = {
//   get: jest.fn(),
//   post: jest.fn(),
//   put: jest.fn(),
//   delete: jest.fn(),
//   reset: () =>
//     ['post'].forEach((key) =>
//       mockHttpClient[key].mockResolvedValue({
//         ok: true,
//         status: 200,
//         json: () => Promise.resolve({ roles: mockRoles.roles }),
//         text: () => Promise.resolve(JSON.stringify({ roles: mockRoles.roles })),
//       }),
//     ),
// };
// mockHttpClient.reset();

// jest.mock('@descope/web-js-sdk', () => ({
//   __esModule: true,
//   default: jest.fn(() => ({ httpClient: mockHttpClient })),
// }));

// jest.mock('../src/lib/widget/api/sdk/createRoleSdk', () => {
//   const actualModule = jest.requireActual(
//     '../src/lib/widget/api/sdk/createRoleSdk',
//   );
//   return {
//     __esModule: true,
//     createRoleSdk: jest.fn((props) => {
//       actualModule.createRoleSdk(props);
//       return actualModule.createRoleSdk(props);
//     }),
//   };
// });

// const themeContent = {};
// const configContent = {
//   flows: {
//     flow1: { version: 1 },
//   },
//   componentsVersion: '1.2.3',
// };

// const fetchMock: jest.Mock = jest.fn();
// global.fetch = fetchMock;

// describe('role-management-widget', () => {
//   beforeEach(() => {
//     fetchMock.mockImplementation((url: string) => {
//       const res = {
//         ok: true,
//         headers: new Headers({}),
//       };

//       switch (true) {
//         case url.endsWith('theme.json'): {
//           return { ...res, json: () => themeContent };
//         }
//         case url.endsWith('config.json'): {
//           return { ...res, json: () => configContent };
//         }
//         case url.endsWith('root.html'): {
//           return { ...res, text: () => rootMock };
//         }
//         case url.endsWith('create-role-modal.html'): {
//           return { ...res, text: () => createRoleModalMock };
//         }
//         case url.endsWith('edit-role-modal.html'): {
//           return { ...res, text: () => editRoleModalMock };
//         }
//         case url.endsWith('delete-roles-modal.html'): {
//           return { ...res, text: () => deleteRoleModalMock };
//         }
//         default: {
//           return { ok: false };
//         }
//       }
//     });
//   });

//   afterEach(() => {
//     document.getElementsByTagName('head')[0].innerHTML = '';
//     document.getElementsByTagName('body')[0].innerHTML = '';
//     document.body.append = origAppend;
//     mockHttpClient.reset();
//   });

//   describe('sdk', () => {
//     it('search', async () => {
//       const sdk = createSdk({ projectId: mockProjectId }, mockTenant);
//       const result = await sdk.role.search({});

//       await waitFor(
//         () => expect(mockHttpClient.post).toHaveBeenCalledTimes(1),
//         { timeout: 5000 },
//       );
//       await waitFor(() =>
//         expect(mockHttpClient.post).toHaveBeenCalledWith(
//           apiPaths.role.search,
//           {
//             limit: 10000,
//             page: undefined,
//           },
//           {
//             queryParams: {
//               tenant: mockTenant,
//             },
//           },
//         ),
//       );

//       expect(result[0].name).toEqual(mockRoles.roles[0]['name']);
//       expect(result[1].name).toEqual(mockRoles.roles[1]['name']);
//     });

//     it('deleteBatch', async () => {
//       const sdk = createSdk({ projectId: mockProjectId }, mockTenant);
//       const roleNames = [
//         mockRoles.roles[0]['name'],
//         mockRoles.roles[1]['name'],
//       ];

//       await sdk.role.deleteBatch(roleNames);

//       await waitFor(
//         () => expect(mockHttpClient.post).toHaveBeenCalledTimes(1),
//         { timeout: 5000 },
//       );
//       await waitFor(() =>
//         expect(mockHttpClient.post).toHaveBeenCalledWith(
//           apiPaths.role.deleteBatch,
//           { roleNames },
//           {
//             queryParams: {
//               tenant: mockTenant,
//             },
//           },
//         ),
//       );
//     });
//   });

//   describe('utils', () => {
//     it('should pluralize messages', () => {
//       expect(
//         pluralize(1)`${['', 2]}${['R', 'r']}ole${[
//           '',
//           's',
//         ]} deleted successfully`,
//       ).toEqual('Role deleted successfully');
//       expect(
//         pluralize(2)`${['', 2]} ${['R', 'r']}ole${[
//           '',
//           's',
//         ]} deleted successfully`,
//       ).toEqual('2 roles deleted successfully');
//     });
//   });
// });
