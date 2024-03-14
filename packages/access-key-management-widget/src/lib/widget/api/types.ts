import createWebSdk from '@descope/web-js-sdk';

export type Sdk = ReturnType<typeof createWebSdk>;

export type HttpClient = Sdk['httpClient'];

export type AccessKey = {
  id: string;
  name: string;
  roleNames: string[];
  status: string;
  createdTime: Date;
  expireTime: number;
  expireTimeFormatted: string;
  createdBy: string;
  clientId: string;
  boundUserId: string;
};

export type SortParams = { field: string; desc: boolean };

export type SearchAccessKeyConfig = {
  page?: number;
  limit?: number;
  text?: string;
  sort?: SortParams[];
};

export type CreateAccessKeyConfig = {
  name: string;
  expiration: string[];
  roleNames: string[];
  userId: string;
};

export type ActivateAccessKeyConfig = {
  id: string;
};

export type DeactivateAccessKeyConfig = {
  id: string;
};

export type Role = {
  name: string;
  description: string;
  permissionNames: string[];
  createdTime: Date;
  tenantId: string;
};
