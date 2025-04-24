const getExistingScript = (scriptId: string): HTMLScriptElement => {
  return document.querySelector(`script#${scriptId}`);
};

const isScriptLoaded = (script: HTMLScriptElement) => {
  return script.getAttribute('status') === 'loaded';
};

const isScriptError = (script: HTMLScriptElement) => {
  return script.getAttribute('status') === 'error';
};

const hashUrl = (url: URL) => {
  let hash = 0;
  const urlStr = url.toString();

  for (let i = 0; i < urlStr.length; i++) {
    const char = urlStr.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return `${Math.abs(hash).toString()}`;
};

const setupScript = (id: string) => {
  const scriptEle = document.createElement('script');
  scriptEle.id = id;

  return scriptEle;
};

type ScriptData = {
  id: string;
  url: URL;
};

const injectScript = (scriptId: string, url: URL) => {
  return new Promise((res, rej) => {
    const scriptEle = setupScript(scriptId);

    scriptEle.onerror = (error) => {
      scriptEle.setAttribute('status', 'error');
      rej(error);
    };
    scriptEle.onload = () => {
      scriptEle.setAttribute('status', 'loaded');
      res(scriptEle);
    };

    scriptEle.src = url.toString();

    document.body.appendChild(scriptEle);
  });
};

const handleExistingScript = (existingScript: HTMLScriptElement) => {
  if (isScriptLoaded(existingScript)) {
    return Promise.resolve(existingScript);
  }

  if (isScriptError(existingScript)) {
    return Promise.reject();
  }

  return new Promise((res, rej) => {
    existingScript.addEventListener('load', () => {
      res(existingScript);
    });

    existingScript.addEventListener('error', (error) => {
      rej(error);
    });
  });
};

export const injectScriptWithFallbacks = async (
  scriptsData: ScriptData[],
  onError: (scriptData: ScriptData, existingScript: boolean) => void,
) => {
  for (const scriptData of scriptsData) {
    const { id, url } = scriptData;
    const existingScript = getExistingScript(id);
    if (existingScript) {
      try {
        await handleExistingScript(existingScript);
        return scriptData;
      } catch (e) {
        onError(scriptData, true);
      }
    } else {
      try {
        await injectScript(id, url);
        return scriptData;
      } catch (e) {
        onError(scriptData, false);
      }
    }
  }
  throw new Error('All scripts failed to load');
};

export const generateLibUrls = (
  baseUrls: string[],
  libName: string,
  version: string,
  path = '',
) =>
  baseUrls.reduce((prev, curr) => {
    const baseUrl = curr;
    if (!baseUrl) {
      return prev;
    }

    let url: URL;
    try {
      url = new URL(baseUrl);
    } catch (e) {
      throw new Error(`Invalid URL: ${baseUrl}`);
    }

    const isUrlIncludesPath = url.pathname !== '/';

    if (!isUrlIncludesPath) {
      url.pathname = `/npm/${libName}@${version}/${path}`;
    }

    return [
      ...prev,
      {
        url: url,
        id: `npmlib-${libName
          .replaceAll('@', '')
          .replaceAll('/', '_')}-${hashUrl(url)}`,
      },
    ];
  }, []);
