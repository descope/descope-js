import createWebSdk from '@descope/web-js-sdk';

export type Sdk = ReturnType<typeof createWebSdk>;

export type HttpClient = Sdk['httpClient'];

export type Audit = {
  id: string;
  userId: string;
  action: string;
  actorId: string;
  type: string;
  occurred: number;
  occurredFormatted?: string;
  device: string;
  method: string;
  geo: string;
  remoteAddress: string;
  externalIds: string[];
  data?: Record<string, string>;
};

export type SortParams = { field: string; desc: boolean };

export type SearchAuditConfig = {
  page?: number;
  limit?: number;
  text?: string;
  sort?: SortParams[];
  from?: number;
};
