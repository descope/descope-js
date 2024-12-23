import { Logger } from '../loggerMixin';

type FetchParams = Parameters<typeof fetch>;
const notLastMsgSuffix = 'Trying the next fallback URL...';

export const fetchWithFallbacks = async (
  fallbacks: FetchParams['0'] | FetchParams['0'][],
  init: FetchParams['1'],
  {
    logger,
    onSuccess,
  }: { logger?: Logger; onSuccess?: (urlIndex: number) => void },
): ReturnType<typeof fetch> => {
  const fallbacksArr = Array.isArray(fallbacks) ? fallbacks : [fallbacks];

  for (let index = 0; index < fallbacksArr.length; index++) {
    const url = fallbacksArr[index];
    const isLast = index === fallbacksArr.length - 1;

    try {
      const res = await fetch(url, init);
      if (res.ok) {
        onSuccess?.(index);
        return res;
      }

      const errMsg = `Error fetching URL ${url} [${res.status}]`;

      if (isLast) throw new Error(errMsg);

      logger?.debug(`${errMsg}. ${notLastMsgSuffix}`);
    } catch (e) {
      const errMsg = `Error fetching URL ${url} [${e.message}]`;

      if (isLast) throw new Error(errMsg);

      logger?.debug(`${errMsg}. ${notLastMsgSuffix}`);
    }
  }
};
