import { BASE_URL_REGION_PLACEHOLDER } from '../constants';
import { pathJoin } from '../sdk/helpers';

const schemeSeparator = '://';

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
  // NOTE: many URL and URLSearchParams functions and fields are NOT SUPPORTED by the react-native runtime
  // Do not replace unless testing with all of the core-dependent projects
  const region = projectId.slice(1, -27);
  baseUrl = baseUrl.replace(
    BASE_URL_REGION_PLACEHOLDER,
    region ? region + '.' : '',
  );
  // extract scheme and host from base URL
  const schemeEndIndex =
    baseUrl.indexOf(schemeSeparator) + schemeSeparator.length;
  let firstSlashIndex = baseUrl.substring(schemeEndIndex).indexOf('/');
  if (firstSlashIndex === -1) firstSlashIndex = baseUrl.length;
  const schemeAndHost = baseUrl.substring(0, firstSlashIndex);

  // extract a path from the base URL if one exists and append the given path
  let pathname = baseUrl.substring(firstSlashIndex, baseUrl.length);
  pathname = pathJoin(pathname, path);

  // join them back together
  let url = `${schemeAndHost}${pathname}`;

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

  return new URL(url);
};
