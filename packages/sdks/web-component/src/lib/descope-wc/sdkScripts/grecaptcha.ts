declare global {
  interface Window {
    grecaptcha?: {
      enterprise?: any;
      ready: (callback: () => void) => void;
      execute: (widgetId: any, options: { action: string }) => Promise<string>;
      render: (container: HTMLElement, parameters: any) => any;
    };
    onRecaptchaLoadCallback: () => void;
  }
}

// Token refresh time: 105 seconds (2 minutes minus 15 seconds)
// Set to refresh the token shortly before expiration to ensure
// we always have a valid token when submitting the form
const TOKEN_REFRESH_TIME_MS = 105000;

export const loadGRecaptcha = (
  initArgs: {
    enterprise: boolean;
    siteKey: string;
  },
  _inputs: { baseUrl?: string },
  onTokenReady: (token: string) => void,
) => {
  let lastTokenFetchTime = new Date().getTime();

  const getScriptURL = () => {
    const url = new URL('https://www.google.com/recaptcha/');
    url.pathname += `${initArgs.enterprise ? 'enterprise' : 'api'}.js`;
    url.searchParams.append('onload', 'onRecaptchaLoadCallback');
    url.searchParams.append('render', 'explicit');
    return url.toString();
  };

  const loadRecaptchaScript = () => {
    const script = document.createElement('script');
    script.src = getScriptURL();
    script.async = true;
    script.id = 'recaptcha-script';
    script.defer = true;
    document.body.appendChild(script);
  };

  const getGrecaptchaInstance = () =>
    initArgs.enterprise ? window.grecaptcha?.enterprise : window.grecaptcha;

  let timer;
  let recaptchaWidgetId;

  const getNewToken = (grecaptchaInstance, currentNode) => {
    grecaptchaInstance.ready(() => {
      if (!initArgs.siteKey) {
        return;
      }
      grecaptchaInstance
        ?.execute(recaptchaWidgetId, { action: 'load' })
        .then((token: string, e: any) => {
          if (e) {
            // eslint-disable-next-line no-console
            console.warn('could not execute recaptcha', e);
          } else {
            onTokenReady(token);
            lastTokenFetchTime = new Date().getTime();
            // if the component is still connected, we should try to get a new token before the token expires (2 minutes)
            timer = setTimeout(() => {
              getNewToken(grecaptchaInstance, currentNode);
            }, TOKEN_REFRESH_TIME_MS);
          }
        });
    });
  };

  const stopTimer = () => {
    clearTimeout(timer);
  };

  const createRecaptchaEle = () => {
    const recaptchaEle = document.createElement('div');
    recaptchaEle.style.display = 'none';
    recaptchaEle.id = 'recaptcha';
    return document.body.appendChild(recaptchaEle);
  };

  const elementRef = createRecaptchaEle();

  const resumeScriptExecution = () => {
    const grecaptchaInstance = getGrecaptchaInstance();
    if (!grecaptchaInstance) {
      return;
    }
    getNewToken(grecaptchaInstance, elementRef);
  };

  /**
   * Checks if the reCAPTCHA token needs refreshing and refreshes it if necessary
   * This is called before form submission to ensure we have a valid token
   * @returns Promise that resolves when token is refreshed or if refresh isn't needed
   */
  const refreshIfTokenExpired = async (): Promise<void> => {
    const currentTime = Date.now();
    const timeDiff = currentTime - lastTokenFetchTime;

    if (timeDiff > TOKEN_REFRESH_TIME_MS) {
      stopTimer();
      const prev = lastTokenFetchTime;
      resumeScriptExecution();

      // Return a promise that resolves once the token is refreshed or times out
      return new Promise<void>((resolve) => {
        // Set a timeout to prevent indefinite waiting
        const timeout = setTimeout(() => {
          // eslint-disable-next-line no-console
          console.warn('reCAPTCHA token refresh timed out');
          resolve(); // Resolve anyway to prevent blocking form submission
        }, 5000); // 5 second timeout for token refresh

        const checkToken = () => {
          if (lastTokenFetchTime !== prev) {
            clearTimeout(timeout);
            resolve();
          } else {
            setTimeout(checkToken, 150);
          }
        };

        checkToken();
      });
    }

    // If no refresh is needed, return a resolved promise
    return Promise.resolve();
  };

  const createOnLoadScript = () => {
    window.onRecaptchaLoadCallback = () => {
      const currentNode = elementRef;

      // if there are child nodes, it means that the recaptcha was already rendered
      if (currentNode.hasChildNodes()) {
        return;
      }

      const grecaptchaInstance = getGrecaptchaInstance();

      if (!grecaptchaInstance) {
        return;
      }

      setTimeout(() => {
        recaptchaWidgetId = grecaptchaInstance.render(currentNode, {
          sitekey: initArgs.siteKey,
          badge: 'inline',
          size: 'invisible',
        });
        getNewToken(grecaptchaInstance, currentNode);
      }, 0);
    };
  };

  createOnLoadScript();
  loadRecaptchaScript();

  return {
    stop: stopTimer,
    start: resumeScriptExecution,
    refresh: refreshIfTokenExpired,
  };
};

export default loadGRecaptcha;
