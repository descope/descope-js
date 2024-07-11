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
  loginContainer.innerHTML = `<div>Loading...</div>`;

  // first try to refresh token, this will also trigger the auto-refresh mechanism
  const refreshRes = await sdk.refresh();
  let userAuthenticated = refreshRes.ok;
  if (!userAuthenticated) {
    // user is not authenticated
    console.log('User is not authenticated');
    // show login flow
    addDescopeFlowToPage();
    return;
  }

  // user is authenticated
  console.log('User is authenticated');

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
}

async function addUserToPage(user) {
  loginContainer.innerHTML = `
    <div>Welcome ${user?.name || user?.loginIds?.[0] || ''}</div>
    <button>Logout</button>
  `;

  const logoutButton = loginContainer.querySelector('button');
  logoutButton.onclick = async () => {
    await sdk.logout();
    // reload the page
    window.location.reload();
  };

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
  // add a div with error message
  loginContainer.innerHTML = `<div style="color:red">${message}</div>`;
}

function addDescopeFlowToPage() {
  loginContainer.innerHTML = `
    <descope-wc
      project-id="${process.env.DESCOPE_PROJECT_ID}"
      flow-id="${process.env.DESCOPE_FLOW_ID || 'sign-up-or-in'}"
      base-url="${process.env.DESCOPE_BASE_URL}"
      debug="true"
    ></descope-wc>
  `;

  const descopeWc = document.querySelector('descope-wc');

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
