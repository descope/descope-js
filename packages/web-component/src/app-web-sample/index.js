import createSdk from '@descope/web-js-sdk';

const sdk = createSdk({
  baseUrl: process.env.DESCOPE_BASE_URL,
  projectId: process.env.DESCOPE_PROJECT_ID,
  persistTokens: true,
  autoRefresh: true,
});

async function main() {
  // check if user is already authenticated
  const sessionToken = sdk.getSessionToken();
  const userAuthenticated = !!sessionToken && !sdk.isJwtExpired(sessionToken);
  if (userAuthenticated) {
    // user is authenticated
    console.log('User is authenticated');
    // get user name
    const userRes = await sdk.me();
    if (!userRes.ok) {
      console.error('Error fetching user details', userRes.error);
      // add a div with error message
      const errorDiv = document.createElement('div');
      errorDiv.textContent = 'Error fetching user details';
      loginContainer.appendChild(errorDiv);
      return;
    }
    // add a div with user name and logout button
    addUserToPage(userRes.data);
    return;
  }
  // user is not authenticated
  console.log('User is not authenticated');
  // get loginContainer by class login-container
  const loginContainer = document.querySelector('.login-container');
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
    // add a div with user name and logout button
    addUserToPage(event.detail?.user);
  });

  // listen for error event
  descopeWc.addEventListener('error', (event) => {
    console.error('Error logging in', event.detail);
    // add a div with error message
    const errorDiv = document.createElement('div');
    errorDiv.textContent = 'Error logging in';
    loginContainer.appendChild(errorDiv);
    // remove login container
    loginContainer.remove();
  });

  return;
}

async function addUserToPage(user) {
  const loginContainer = document.querySelector('.login-container');

  const userDiv = document.createElement('div');
  userDiv.textContent = `Welcome ${user?.name || user?.loginIds?.[0] || ''}`;
  loginContainer.appendChild(userDiv);
  const logoutButton = document.createElement('button');
  logoutButton.textContent = 'Logout';
  logoutButton.onclick = async () => {
    const logoutRes = await sdk.logout();
    if (!logoutRes.ok) {
      console.error('Error logging out', logoutRes.error);
      return;
    }
    // reload the page
    window.location.reload();
  };
  // add logout button to login container
  loginContainer.appendChild(logoutButton);
}

main();
