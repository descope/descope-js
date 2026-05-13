import createSdk from '@descope/web-js-sdk';

declare const DESCOPE_PROJECT_ID: string;
declare const DESCOPE_BASE_URL: string;
declare const DESCOPE_BASE_STATIC_URL: string;
declare const DESCOPE_WIDGET_ID: string;

const sdk = createSdk({
  projectId: DESCOPE_PROJECT_ID,
  baseUrl: DESCOPE_BASE_URL,
  persistTokens: true,
});

const getShouldLogin = async () => {
  const res = await sdk.me();

  if (!res.ok) {
    console.log('User is not logged in');
    return true;
  }

  return false;
};

(async () => {
  const isMock = /[&?]mock=([^&]+)/.exec(location.search)?.[1];

  const shouldLogin = (await getShouldLogin()) && !isMock;
  const rootEle = document.querySelector('.container');

  const widgetEle = document.createElement('descope-user-profile-widget');
  widgetEle.setAttribute('project-id', DESCOPE_PROJECT_ID);
  widgetEle.setAttribute('base-url', DESCOPE_BASE_URL);
  widgetEle.setAttribute('base-static-url', DESCOPE_BASE_STATIC_URL);
  widgetEle.setAttribute('widget-id', DESCOPE_WIDGET_ID);
  widgetEle.setAttribute('debug', 'false');
  widgetEle.setAttribute('theme', 'light');
  widgetEle.addEventListener('logout', () => {
    window.location.reload();
  });
  if (isMock) {
    widgetEle.setAttribute('mock', 'true');
  }

  widgetEle.addEventListener('ready', () => {
    console.log('Widget is ready');
  });

  if (shouldLogin) {
    const flowEle = document.createElement('descope-wc');
    flowEle.setAttribute('project-id', DESCOPE_PROJECT_ID);
    flowEle.setAttribute('base-url', DESCOPE_BASE_URL);
    flowEle.setAttribute('base-static-url', DESCOPE_BASE_STATIC_URL);
    flowEle.setAttribute('flow-id', 'sign-up-or-in');
    flowEle.setAttribute('debug', 'false');
    flowEle.addEventListener('success', () => {
      flowEle.remove();
      rootEle.appendChild(widgetEle);
    });

    rootEle.appendChild(flowEle);
  } else {
    rootEle.appendChild(widgetEle);
  }
})();
