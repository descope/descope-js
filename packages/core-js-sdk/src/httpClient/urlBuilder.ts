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
  queryParams: ConstructorParameters<typeof URLSearchParams>[0];
  projectId: string;
}) => {
  const region = projectId.slice(1, -27);
  baseUrl = baseUrl.replace(
    BASE_URL_REGION_PLACEHOLDER,
    region ? region + '.' : '',
  );
  const url = new URL(path, baseUrl);
  if (queryParams) url.search = new URLSearchParams(queryParams).toString();

  return url;
};
