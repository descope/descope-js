import type { ProtectedResourceConfig, ResourceMetadata } from './types';

/**
 * Builds OAuth 2.0 Protected Resource Metadata according to RFC 9728
 * @param config Protected resource configuration
 * @returns Resource metadata object
 */
export function buildResourceMetadata(
  config: ProtectedResourceConfig,
): ResourceMetadata {
  const metadata: ResourceMetadata = {
    resource: config.resource,
    authorization_servers: config.authorizationServers,
    scopes_supported: config.scopes,
    bearer_methods_supported: ['header'],
  };

  if (config.docsUrl) {
    metadata.resource_documentation = config.docsUrl;
  }

  if (config.tokenIntrospectionEndpoint) {
    metadata.resource_policy_uri = `${config.resource}/policy`;
  }

  return metadata;
}
