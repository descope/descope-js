import createWebSdk from '@descope/web-js-sdk';

export type Sdk = ReturnType<typeof createWebSdk>;

export type HttpClient = Sdk['httpClient'];

export type Role = {
  name: string;
  description: string;
  permissionNames: string[];
  createdTime: Date;
  tenantId: string;
};

export type Permission = {
  name: string;
};

export type SortParams = { field: string; desc: boolean };

export type SearchRolesConfig = {
  page?: number;
  limit?: number;
  text?: string;
  sort?: SortParams[];
};

export type CreateRoleConfig = {
  name: string;
  description: string;
  permissionNames: string[];
};

export type UpdateRoleConfig = {
  name: string;
  newName: string;
  description: string;
  permissionNames: string[];
};
