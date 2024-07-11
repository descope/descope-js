import sdk, { REFRESH_TOKEN_KEY, SESSION_TOKEN_KEY } from './index';

// We export the tokens constant in this way so that umd bundles will have the constants as properties of the default export
// But still can use the default export as a function (e.g. Descope({ projectId: 'pid'}))
sdk['REFRESH_TOKEN_KEY'] = REFRESH_TOKEN_KEY;
sdk['SESSION_TOKEN_KEY'] = SESSION_TOKEN_KEY;

export default sdk;
