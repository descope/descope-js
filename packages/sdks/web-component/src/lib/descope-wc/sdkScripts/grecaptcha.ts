export const loadGRecaptcha = (
  initArgs: {
    enterprise: boolean;
    siteKey: string;
  },
  inputs: { baseUrl?: string },
  onTokenReady: (token: string) => void,
) => {
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

  const getNewToken = (grecaptchaInstance, currentNode, recaptchaWidgetId) => {
    grecaptchaInstance.ready(() => {
      if (!initArgs.siteKey) {
        return;
      }
      // we should pass recaptchaWidgetId, but this does not allow us to run execute multiple times
      // also calling grecaptchaInstance.reset() does not work
      grecaptchaInstance
        ?.execute(recaptchaWidgetId, {
          action: 'load',
        })
        .then((token, e) => {
          if (e) {
            // eslint-disable-next-line no-console
            console.warn('could not execute recaptcha', e);
          } else {
            onTokenReady(token);
            // if the component is still connected, we should try to get a new token before the token expires (2 minutes)
            timer = setTimeout(() => {
              getNewToken(grecaptchaInstance, currentNode, recaptchaWidgetId);
            }, 110000);
          }
        });
    });
  };

  const stopScriptExecution = () => {
    clearTimeout(timer);
  };

  const createRecaptchaEle = () => {
    const recaptchaEle = document.createElement('div');
    recaptchaEle.style.display = 'none';
    recaptchaEle.id = 'recaptcha';
    return document.body.appendChild(recaptchaEle);
  };

  const elementRef = createRecaptchaEle();

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
        const recaptchaWidgetId = grecaptchaInstance.render(currentNode, {
          sitekey: initArgs.siteKey,
          badge: 'inline',
          size: 'invisible',
        });
        getNewToken(grecaptchaInstance, currentNode, recaptchaWidgetId);
      }, 0);
    };
  };

  createOnLoadScript();
  loadRecaptchaScript();

  return stopScriptExecution;
};

export default loadGRecaptcha;
