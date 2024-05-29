import createSdk from '@descope/web-js-sdk';

const sdk = createSdk({
  baseUrl: process.env.DESCOPE_BASE_URL,
  projectId: process.env.DESCOPE_PROJECT_ID,
  persistTokens: true,
  autoRefresh: true,
});

const loginContainer = document.querySelector('.login-container');

async function main() {
  // show loading message
  const loadingDiv = document.createElement('div');
  loadingDiv.textContent = 'Loading...';
  loginContainer.appendChild(loadingDiv);

  // first try to refresh token, this will also trigger the auto-refresh mechanism
  const refreshRes = await sdk.refresh();
  let userAuthenticated = refreshRes.ok;
  if (userAuthenticated) {
    // user is authenticated
    console.log('User is authenticated');
    // remove loading message
    loadingDiv.remove();

    // get user name
    const userRes = await sdk.me();
    if (!userRes.ok) {
      console.error('Error fetching user details', userRes.error);
      // add a div with error message
      addErrorMessageToPage('Error fetching user details');
      return;
    }
    // add a div with user name and logout button
    addUserToPage(userRes.data);
    return;
  }
  // user is not authenticated
  console.log('User is not authenticated');
  // remove loading message
  loadingDiv.remove();

  // show login flow
  addDescopeFlowToPage();
}

async function addUserToPage(user) {
  const userDiv = document.createElement('div');
  userDiv.textContent = `Welcome ${user?.name || user?.loginIds?.[0] || ''}`;
  loginContainer.appendChild(userDiv);
  const logoutButton = document.createElement('button');
  logoutButton.textContent = 'Logout';
  logoutButton.onclick = async () => {
    await sdk.logout();
    // reload the page
    window.location.reload();
  };
  // add logout button to login container
  loginContainer.appendChild(logoutButton);

  // in case of session token is missing, reload the page
  // this may happen if the user logs out from another tab or the refresh token is revoked/expired
  sdk.onSessionTokenChange = async (token) => {
    if (!token) {
      // reload the page
      window.location.reload();
    }
  };
}

async function addErrorMessageToPage(message) {
  const errorDiv = document.createElement('div');
  errorDiv.textContent = message;
  loginContainer.appendChild(errorDiv);
}

function addDescopeFlowToPage() {
  const descopeWc = document.createElement('descope-wc');
  descopeWc.setAttribute('project-id', process.env.DESCOPE_PROJECT_ID);
  descopeWc.setAttribute(
    'flow-id',
    process.env.DESCOPE_FLOW_ID || 'sign-up-or-in',
  );
  descopeWc.setAttribute('base-url', process.env.DESCOPE_BASE_URL);
  descopeWc.setAttribute('debug', 'true');
  loginContainer.appendChild(descopeWc);

  // listen for login event
  descopeWc.addEventListener('success', async (event) => {
    console.log('User logged in', event.detail);
    // remove descope-wc from login container
    descopeWc.remove();
    // trigger afterRequest hook so that sdk can store the tokens and handle auto-refresh
    await sdk.httpClient.hooks.afterRequest(
      {},
      new Response(JSON.stringify(event.detail)),
    );
    // add a div with user name and logout button
    addUserToPage(event.detail?.user);
  });

  // listen for error event
  descopeWc.addEventListener('error', (event) => {
    console.error('Error logging in', event.detail);
    // add a div with error message
    addErrorMessageToPage('Error logging in');
  });
}

main();
