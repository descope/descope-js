declare const BUILD_VERSION: string;

export const baseHeaders: Record<string, string> = {
  'x-descope-sdk-name': 'solid',
  'x-descope-sdk-version':
    typeof BUILD_VERSION !== 'undefined' ? BUILD_VERSION : '0.0.0',
};
