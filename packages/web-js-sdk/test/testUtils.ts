export const createMockReturnValue = (data: any) => {
  const ret: {
    ok: boolean;
    json: () => Promise<any>;
    text?: () => Promise<any>;
    clone?: () => any;
    url?: URL;
    headers?: Headers;
  } = {
    ok: true,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    url: new URL('http://example.com'),
    headers: new Headers(),
  };

  ret.clone = () => ret;

  return ret;
};

export const getExpiredSessionToken = () => {
  // create a token that expires in 1 hour
  return `{}.${window.btoa(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 60 * 60 })
  )}.`;
};
