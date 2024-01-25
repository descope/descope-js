export type ApiPaths = {
  search: string;
  deleteBatch: string;
  create: string;
  expirePassword: string;
  customAttributes: string;
};

export const apiPaths: Record<'user', ApiPaths> = {
  user: {
    search: '/v1/mgmt/user/search',
    deleteBatch: '/v1/mgmt/user/delete/batch',
    create: '/v1/mgmt/user/create',
    expirePassword: '/v1/mgmt/user/password/expire',
    customAttributes: '/v1/mgmt/user/customattributes',
  },
};
