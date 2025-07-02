export interface ProtectedResourceConfig {
  resource: string;
  authorizationServers: string[];
  scopes: string[];
  docsUrl?: string;
  tokenIntrospectionEndpoint?: string;
  projectId?: string;
}

export interface ResourceMetadata {
  resource: string;
  authorization_servers: string[];
  scopes_supported: string[];
  bearer_methods_supported: string[];
  resource_documentation?: string;
  resource_policy_uri?: string;
  resource_registration_uri?: string;
  resource_type?: string;
}

export interface WWWAuthenticateParams {
  realm?: string;
  scope?: string;
  error?: 'invalid_token' | 'insufficient_scope' | 'invalid_request';
  error_description?: string;
  error_uri?: string;
  authorizationServers?: string[];
  resourceMetadataUrl?: string;
}
