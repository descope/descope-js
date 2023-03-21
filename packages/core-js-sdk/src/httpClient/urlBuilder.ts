/** Build URL with given parts */
export const urlBuilder = ({
  path,
  baseUrl,
  queryParams,
}: {
  path: string;
  baseUrl: string;
  queryParams: ConstructorParameters<typeof URLSearchParams>[0];
}) => {
  const url = new URL(path, baseUrl);
  if (queryParams) url.search = new URLSearchParams(queryParams).toString();

  return url;
};
