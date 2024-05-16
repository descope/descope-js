import { BASE_URL_REGION_PLACEHOLDER } from '../constants';

/** Build URL with given parts */
export const urlBuilder = ({
  path,
  baseUrl,
  queryParams,
  projectId,
}: {
  path: string;
  baseUrl: string;
  queryParams?: { [key: string]: string };
  projectId: string;
}) => {
  // NOTE: many URL and URLSearchParams functions and fields are NOT SUPPORTED by the react-native runtime.
  // To add insult to injury - it adds a trailing slash almost no matter what the input is:
  // https://github.com/facebook/react-native/blob/main/packages/react-native/Libraries/Blob/URL.js#L144
  // Do not replace unless testing with all of the core-dependent projects
  const region = projectId.slice(1, -27);
  baseUrl = baseUrl.replace(
    BASE_URL_REGION_PLACEHOLDER,
    region ? region + '.' : '',
  );
  // append path to base
  let url = path
    ? `${baseUrl.replace(/\/$/, '')}/${path?.replace(/^\//, '')}`
    : baseUrl;

  // add query params if given
  if (queryParams) {
    url = `${url}?`;
    const keys = Object.keys(queryParams);
    keys.forEach((key: string, index: number) => {
      url = `${url}${key}=${queryParams[key]}${
        index === keys.length - 1 ? '' : '&'
      }`;
    });
  }

  return url;
};
