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

// create a token that expires in the future
// default is 1 hour
export const getFutureSessionToken = (seconds = 60 * 60) => {
  return `{}.${window.btoa(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + seconds })
  )}.`;
};
