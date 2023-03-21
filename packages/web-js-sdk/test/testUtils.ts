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
