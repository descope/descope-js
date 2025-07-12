export const withErrorHandler = async (res: Response) => {
  const text = await res.text();
  const json = JSON.parse(text);

  if (!res.ok) {
    const descopeErrorMsg = `${json.errorDescription}${
      json.errorMessage ? `: ${json.errorMessage}` : ''
    }`;
    throw Error(descopeErrorMsg || `${res.status} ${res.statusText}`);
  }

  res.json = () => Promise.resolve(json);
  res.text = () => Promise.resolve(text);
};
