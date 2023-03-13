/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

var __assign = function () {
  __assign =
    Object.assign ||
    function __assign(t) {
      for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s)
          if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
      }
      return t;
    };
  return __assign.apply(this, arguments);
};

function __rest(s, e) {
  var t = {};
  for (var p in s)
    if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
      t[p] = s[p];
  if (s != null && typeof Object.getOwnPropertySymbols === 'function')
    for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
      if (
        e.indexOf(p[i]) < 0 &&
        Object.prototype.propertyIsEnumerable.call(s, p[i])
      )
        t[p[i]] = s[p[i]];
    }
  return t;
}

function __awaiter(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P
      ? value
      : new P(function (resolve) {
          resolve(value);
        });
  }
  return new (P || (P = Promise))(function (resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator['throw'](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done
        ? resolve(result.value)
        : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
}

function __spreadArray(to, from, pack) {
  if (pack || arguments.length === 2)
    for (var i = 0, l = from.length, ar; i < l; i++) {
      if (ar || !(i in from)) {
        if (!ar) ar = Array.prototype.slice.call(from, 0, i);
        ar[i] = from[i];
      }
    }
  return to.concat(ar || Array.prototype.slice.call(from));
}

function __classPrivateFieldGet(receiver, state, kind, f) {
  if (kind === 'a' && !f)
    throw new TypeError('Private accessor was defined without a getter');
  if (
    typeof state === 'function'
      ? receiver !== state || !f
      : !state.has(receiver)
  )
    throw new TypeError(
      'Cannot read private member from an object whose class did not declare it'
    );
  return kind === 'm'
    ? f
    : kind === 'a'
    ? f.call(receiver)
    : f
    ? f.value
    : state.get(receiver);
}

function __classPrivateFieldSet(receiver, state, value, kind, f) {
  if (kind === 'm') throw new TypeError('Private method is not writable');
  if (kind === 'a' && !f)
    throw new TypeError('Private accessor was defined without a setter');
  if (
    typeof state === 'function'
      ? receiver !== state || !f
      : !state.has(receiver)
  )
    throw new TypeError(
      'Cannot write private member to an object whose class did not declare it'
    );
  return (
    kind === 'a'
      ? f.call(receiver, value)
      : f
      ? (f.value = value)
      : state.set(receiver, value),
    value
  );
}

const BASE_CONTENT_URL_KEY = 'base.content.url';
const IS_LOCAL_STORAGE = typeof localStorage !== 'undefined';
const BASE_CONTENT_URL =
  (IS_LOCAL_STORAGE && localStorage.getItem(BASE_CONTENT_URL_KEY)) ||
  'https://static.descope.com/pages';
const URL_RUN_IDS_PARAM_NAME = 'descope-login-flow';
const URL_TOKEN_PARAM_NAME = 't';
const URL_CODE_PARAM_NAME = 'code';
const URL_ERR_PARAM_NAME = 'err';
const DESCOPE_ATTRIBUTE_PREFIX = 'data-descope-';
const DESCOPE_ATTRIBUTE_EXCLUDE_FIELD = 'data-exclude-field';
const DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY = 'dls_last_auth';
const ELEMENT_TYPE_ATTRIBUTE = 'data-type';
const RESPONSE_ACTIONS = {
  redirect: 'redirect',
  poll: 'poll',
  webauthnCreate: 'webauthnCreate',
  webauthnGet: 'webauthnGet',
};
const ASSETS_FOLDER = 'v2-alpha';
// Those files are saved on a new folder to prevent breaking changes
const THEME_FILENAME = 'theme.css';
const CONFIG_FILENAME = 'config.json';
const CUSTOM_INTERACTIONS = {
  submit: 'submit',
  polling: 'polling',
};

/* istanbul ignore file */
var Direction;
(function (Direction) {
  Direction['backward'] = 'backward';
  Direction['forward'] = 'forward';
})(Direction || (Direction = {}));

function getUrlParam(paramName) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(paramName);
}
function getFlowUrlParam() {
  return getUrlParam(URL_RUN_IDS_PARAM_NAME);
}
function resetUrlParam(paramName) {
  if (window.history.replaceState && getUrlParam(paramName)) {
    const newUrl = new URL(window.location.href);
    const search = new URLSearchParams(newUrl.search);
    search.delete(paramName);
    newUrl.search = search.toString();
    window.history.replaceState({}, '', newUrl.toString());
  }
}
function fetchContent(url, returnType) {
  return __awaiter(this, void 0, void 0, function* () {
    const res = yield fetch(url, { cache: 'default' });
    if (!res.ok) {
      // eslint-disable-next-line no-console
      throw Error(`Error fetching URL ${url}`);
    }
    return {
      body: yield res[returnType || 'text'](),
      headers: Object.fromEntries(res.headers.entries()),
    };
  });
}
const pathJoin = (...paths) => paths.join('/').replace(/\/+/g, '/'); // preventing duplicate separators
function getContentUrl(projectId, filename) {
  const url = new URL(BASE_CONTENT_URL);
  url.pathname = pathJoin(url.pathname, projectId, ASSETS_FOLDER, filename);
  return url.toString();
}
function getAnimationDirection(currentIdx, prevIdx) {
  if (Number.isNaN(currentIdx) || Number.isNaN(prevIdx)) return undefined;
  if (currentIdx > prevIdx) return Direction.forward;
  if (currentIdx < prevIdx) return Direction.backward;
  return undefined;
}
const getRunIdsFromUrl = () => {
  const [executionId = '', stepId = ''] = (getFlowUrlParam() || '').split('_');
  return { executionId, stepId };
};
function clearRunIdsFromUrl() {
  resetUrlParam(URL_RUN_IDS_PARAM_NAME);
}
function getTokenFromUrl() {
  return getUrlParam(URL_TOKEN_PARAM_NAME) || undefined;
}
function clearTokenFromUrl() {
  resetUrlParam(URL_TOKEN_PARAM_NAME);
}
function getCodeFromUrl() {
  return getUrlParam(URL_CODE_PARAM_NAME) || undefined;
}
function getExchangeErrorFromUrl() {
  return getUrlParam(URL_ERR_PARAM_NAME) || undefined;
}
function clearCodeFromUrl() {
  resetUrlParam(URL_CODE_PARAM_NAME);
}
function clearExchangeErrorFromUrl() {
  resetUrlParam(URL_ERR_PARAM_NAME);
}
const camelCase = (s) => s.replace(/-./g, (x) => x[1].toUpperCase());
const createIsChanged = (state, prevState) => (attrName) =>
  state[attrName] !== prevState[attrName];
/**
 * in order to be able to run scripts that are part of the components, we are adding a script tag next to the component's element
 * in order to avoid cloning the scripts, each tag contains a ref-id and the actual scripts are placed under the "scripts" section
 * here we are going over the script refs, finding the actual script, generating a function out of it, binding the element to the function so we can access it from the script
 * we are returning an array of functions that can be triggered later on
 */
const generateFnsFromScriptTags = (template, context) => {
  var _a;
  const scriptFns = Array.from(
    template.querySelectorAll('script[data-id]')
  ).map((script) => {
    var _a;
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const scriptId = script.getAttribute('data-id');
    const scriptContent =
      (_a = template.getElementById(scriptId)) === null || _a === void 0
        ? void 0
        : _a.innerHTML;
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const fn = Function(scriptContent).bind(script.previousSibling, context);
    script.remove();
    return fn;
  });
  (_a = template.querySelector('scripts')) === null || _a === void 0
    ? void 0
    : _a.remove();
  return scriptFns;
};
const getElementDescopeAttributes = (ele) =>
  Array.from(
    (ele === null || ele === void 0 ? void 0 : ele.attributes) || []
  ).reduce((acc, attr) => {
    var _a;
    const descopeAttrName =
      (_a = new RegExp(`^${DESCOPE_ATTRIBUTE_PREFIX}(\\S+)$`).exec(
        attr.name
      )) === null || _a === void 0
        ? void 0
        : _a[1];
    return !descopeAttrName
      ? acc
      : Object.assign(acc, { [descopeAttrName]: attr.value });
  }, {});
const handleUrlParams = () => {
  const { executionId, stepId } = getRunIdsFromUrl();
  if (executionId || stepId) {
    clearRunIdsFromUrl();
  }
  const token = getTokenFromUrl();
  if (token) {
    clearTokenFromUrl();
  }
  const code = getCodeFromUrl();
  if (code) {
    clearCodeFromUrl();
  }
  const exchangeError = getExchangeErrorFromUrl();
  if (exchangeError) {
    clearExchangeErrorFromUrl();
  }
  return { executionId, stepId, token, code, exchangeError };
};
const loadFont = (url) => {
  if (!url) return;
  const font = document.createElement('link');
  font.href = url;
  font.rel = 'stylesheet';
  document.head.appendChild(font);
};
const compareArrays = (array1, array2) =>
  array1.length === array2.length &&
  array1.every((value, index) => value === array2[index]);
const withMemCache = (fn) => {
  let prevArgs;
  let cache;
  return (...args) => {
    if (prevArgs && compareArrays(prevArgs, args)) return cache;
    prevArgs = args;
    cache = fn(...args);
    return cache;
  };
};
const handleAutoFocus = (ele, autoFocus, isFirstScreen) => {
  if (
    autoFocus === true ||
    (autoFocus === 'skipFirstScreen' && !isFirstScreen)
  ) {
    // focus the first visible input
    const firstVisibleInput = ele.querySelector(
      'input:not([aria-hidden="true"])'
    );
    firstVisibleInput === null || firstVisibleInput === void 0
      ? void 0
      : firstVisibleInput.focus();
  }
};

var _State_state, _State_subscribers, _State_token, _State_updateOnlyOnChange;
function compareObjects(objectA, objectB) {
  const aProperties = Object.getOwnPropertyNames(objectA);
  const bProperties = Object.getOwnPropertyNames(objectB);
  if (aProperties.length !== bProperties.length) {
    return false;
  }
  for (let i = 0; i < aProperties.length; i += 1) {
    const propName = aProperties[i];
    const valA = objectA[propName];
    const valB = objectB[propName];
    if (typeof valA === 'object' && typeof valB === 'object') {
      // compare nested objects
      if (!compareObjects(valA, valB)) {
        return false;
      }
    } else if (valA !== valB) {
      return false;
    }
  }
  return true;
}
class State {
  constructor(init = {}, { updateOnlyOnChange = true } = {}) {
    _State_state.set(this, void 0);
    _State_subscribers.set(this, {});
    _State_token.set(this, 0);
    _State_updateOnlyOnChange.set(this, false);
    this.update = (newState) => {
      const internalNewState =
        typeof newState === 'function'
          ? newState(__classPrivateFieldGet(this, _State_state, 'f'))
          : newState;
      const nextState = Object.assign(
        Object.assign({}, __classPrivateFieldGet(this, _State_state, 'f')),
        internalNewState
      );
      if (
        !__classPrivateFieldGet(this, _State_updateOnlyOnChange, 'f') ||
        !compareObjects(
          __classPrivateFieldGet(this, _State_state, 'f'),
          nextState
        )
      ) {
        const prevState = __classPrivateFieldGet(this, _State_state, 'f');
        __classPrivateFieldSet(this, _State_state, nextState, 'f');
        Object.freeze(__classPrivateFieldGet(this, _State_state, 'f'));
        setTimeout(() => {
          Object.values(
            __classPrivateFieldGet(this, _State_subscribers, 'f')
          ).forEach((cb) =>
            cb(nextState, prevState, createIsChanged(nextState, prevState))
          );
        }, 0);
      }
    };
    __classPrivateFieldSet(this, _State_state, init, 'f');
    __classPrivateFieldSet(
      this,
      _State_updateOnlyOnChange,
      updateOnlyOnChange,
      'f'
    );
  }
  get current() {
    return Object.assign({}, __classPrivateFieldGet(this, _State_state, 'f'));
  }
  subscribe(cb) {
    __classPrivateFieldSet(
      this,
      _State_token,
      __classPrivateFieldGet(this, _State_token, 'f') + 1,
      'f'
    );
    __classPrivateFieldGet(this, _State_subscribers, 'f')[
      __classPrivateFieldGet(this, _State_token, 'f')
    ] = cb;
    return __classPrivateFieldGet(this, _State_token, 'f').toString();
  }
  unsubscribe(token) {
    const isFound = !!__classPrivateFieldGet(this, _State_subscribers, 'f')[
      token
    ];
    if (isFound) {
      delete __classPrivateFieldGet(this, _State_subscribers, 'f')[token];
    }
    return isFound;
  }
  unsubscribeAll() {
    __classPrivateFieldSet(this, _State_subscribers, {}, 'f');
    return true;
  }
}
(_State_state = new WeakMap()),
  (_State_subscribers = new WeakMap()),
  (_State_token = new WeakMap()),
  (_State_updateOnlyOnChange = new WeakMap());

const replaceElementMessage = (baseEle, eleType, message = '') => {
  const eleList = baseEle.querySelectorAll(
    `[${ELEMENT_TYPE_ATTRIBUTE}="${eleType}"]`
  );
  eleList.forEach((ele) => {
    // eslint-disable-next-line no-param-reassign
    ele.textContent = message;
    ele.classList[message ? 'remove' : 'add']('hide');
  });
};
/**
 * Replace the 'value' attribute of screen inputs with screen state's inputs.
 * For example: if base element contains '<input name="key1" ...>' and screen input is in form of { key1: 'val1' },
 * it will add 'val1' as the input value
 */
const replaceElementInputs = (baseEle, screenInputs) => {
  Object.entries(screenInputs || {}).forEach(([name, value]) => {
    const inputEls = Array.from(
      baseEle.querySelectorAll(
        `.descope-input[name="${name}"]:not([${DESCOPE_ATTRIBUTE_EXCLUDE_FIELD}])`
      )
    );
    inputEls.forEach((inputEle) => {
      // eslint-disable-next-line no-param-reassign
      inputEle.value = value;
    });
  });
};
/**
 * Get object nested path.
 * Examples:
 *  - getByPath({ { a { b: 'rob' } }, 'a.b') => 'hey rob'
 *  - getByPath({}, 'a.b') => ''
 */
const getByPath = (obj, path) =>
  path
    .split('.')
    .reduce(
      (prev, next) =>
        (prev === null || prev === void 0 ? void 0 : prev[next]) || '',
      obj
    );
/**
 * Apply template language on text, based on screen state.
 * Examples:
 *  - 'hey {{a.b}}', { a { b: 'rob' }} => 'hey rob'
 *  - 'hey {{not.exists}}', {} => 'hey '
 */
const applyTemplates = (text, screenState) =>
  text.replace(/{{(.+?)}}/g, (_, match) => getByPath(screenState, match));
/**
 * Replace the templates of content of inner text/link elements with screen state data
 */
const replaceElementTemplates = (baseEle, screenState) => {
  const eleList = baseEle.querySelectorAll('.descope-text,.descope-link');
  eleList.forEach((inEle) => {
    // eslint-disable-next-line no-param-reassign
    inEle.textContent = applyTemplates(inEle.textContent, screenState);
  });
};
const replaceProvisionURL = (baseEle, provisionUrl) => {
  const eleList = baseEle.querySelectorAll(
    `[${ELEMENT_TYPE_ATTRIBUTE}="totp-link"]`
  );
  eleList.forEach((ele) => {
    // eslint-disable-next-line no-param-reassign
    ele.href = provisionUrl;
  });
};
/**
 * Perform action in base element based on screen state
 *  - Show/hide error messages
 *  - Replace values of element inputs with screen state's inputs
 *  - Replace element templates ({{...}} syntax) with screen state object
 */
const replaceWithScreenState = (baseEle, screenState) => {
  var _a;
  replaceElementMessage(
    baseEle,
    'error-message',
    screenState === null || screenState === void 0
      ? void 0
      : screenState.errorText
  );
  replaceElementInputs(
    baseEle,
    screenState === null || screenState === void 0 ? void 0 : screenState.inputs
  );
  replaceProvisionURL(
    baseEle,
    (_a =
      screenState === null || screenState === void 0
        ? void 0
        : screenState.totp) === null || _a === void 0
      ? void 0
      : _a.provisionUrl
  );
  replaceElementTemplates(baseEle, screenState);
};
const setTOTPVariable = (rootEle, image) => {
  var _a;
  if (image) {
    (_a = rootEle === null || rootEle === void 0 ? void 0 : rootEle.style) ===
      null || _a === void 0
      ? void 0
      : _a.setProperty('--totp-image', `url(data:image/jpg;base64,${image})`);
  }
};
const disableWebauthnButtons = (fragment) => {
  const webauthnButtons = fragment.querySelectorAll(
    `button[${ELEMENT_TYPE_ATTRIBUTE}="biometrics"]`
  );
  webauthnButtons.forEach((button) => button.setAttribute('disabled', 'true'));
};

/* eslint @typescript-eslint/no-use-before-define: 0 */
// eslint-disable-next-line import/prefer-default-export
const isConditionalLoginSupported = withMemCache(() =>
  __awaiter(void 0, void 0, void 0, function* () {
    if (
      !window.PublicKeyCredential ||
      !PublicKeyCredential.isConditionalMediationAvailable ||
      !PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable
    ) {
      // eslint-disable-next-line no-console
      console.warn('webauthn', 'Conditional UI is not supported');
      return false;
    }
    try {
      const supported = yield Promise.all([
        PublicKeyCredential.isConditionalMediationAvailable(),
        PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(),
      ]);
      return supported.every((value) => !!value);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('webauthn', 'Conditional login check failed', err);
      return false;
    }
  })
);

/* eslint-disable import/prefer-default-export */
const calculateCondition = (condition, loginId) => {
  if (condition && condition.operator === 'not-empty') {
    const conditionResult = loginId ? condition.met : condition.unmet;
    return {
      startScreenId:
        conditionResult === null || conditionResult === void 0
          ? void 0
          : conditionResult.screenId,
      conditionInteractionId:
        conditionResult === null || conditionResult === void 0
          ? void 0
          : conditionResult.interactionId,
    };
  }
  return {};
};

function getLastAuth(loginId) {
  const lastAuth = {};
  if (loginId) {
    try {
      Object.assign(
        lastAuth,
        JSON.parse(localStorage.getItem(DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY))
      );
    } catch (e) {
      /* empty */
    }
  }
  return lastAuth;
}
// save last auth to local storage
function setLastAuth(lastAuth) {
  if (
    !(lastAuth === null || lastAuth === void 0 ? void 0 : lastAuth.authMethod)
  ) {
    return;
  }
  if (IS_LOCAL_STORAGE) {
    localStorage.setItem(
      DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY,
      JSON.stringify(lastAuth)
    );
  }
}

function e(e) {
  this.message = e;
}
(e.prototype = new Error()), (e.prototype.name = 'InvalidCharacterError');
var r$3 =
  ('undefined' != typeof window && window.atob && window.atob.bind(window)) ||
  function (r) {
    var t = String(r).replace(/=+$/, '');
    if (t.length % 4 == 1)
      throw new e(
        "'atob' failed: The string to be decoded is not correctly encoded."
      );
    for (
      var n, o, a = 0, i = 0, c = '';
      (o = t.charAt(i++));
      ~o && ((n = a % 4 ? 64 * n + o : o), a++ % 4)
        ? (c += String.fromCharCode(255 & (n >> ((-2 * a) & 6))))
        : 0
    )
      o =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='.indexOf(
          o
        );
    return c;
  };
function t(e) {
  var t = e.replace(/-/g, '+').replace(/_/g, '/');
  switch (t.length % 4) {
    case 0:
      break;
    case 2:
      t += '==';
      break;
    case 3:
      t += '=';
      break;
    default:
      throw 'Illegal base64url string!';
  }
  try {
    return (function (e) {
      return decodeURIComponent(
        r$3(e).replace(/(.)/g, function (e, r) {
          var t = r.charCodeAt(0).toString(16).toUpperCase();
          return t.length < 2 && (t = '0' + t), '%' + t;
        })
      );
    })(t);
  } catch (e) {
    return r$3(t);
  }
}
function n$1(e) {
  this.message = e;
}
function o$2(e, r) {
  if ('string' != typeof e) throw new n$1('Invalid token specified');
  var o = !0 === (r = r || {}).header ? 0 : 1;
  try {
    return JSON.parse(t(e.split('.')[o]));
  } catch (e) {
    throw new n$1('Invalid token specified: ' + e.message);
  }
}
(n$1.prototype = new Error()), (n$1.prototype.name = 'InvalidTokenError');

var commonjsGlobal =
  typeof globalThis !== 'undefined'
    ? globalThis
    : typeof window !== 'undefined'
    ? window
    : typeof global !== 'undefined'
    ? global
    : typeof self !== 'undefined'
    ? self
    : {};

/**
 * lodash (Custom Build) <https://lodash.com/>
 * Build: `lodash modularize exports="npm" -o ./`
 * Copyright jQuery Foundation and other contributors <https://jquery.org/>
 * Released under MIT license <https://lodash.com/license>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 */

/** Used as the `TypeError` message for "Functions" methods. */
var FUNC_ERROR_TEXT = 'Expected a function';

/** Used to stand-in for `undefined` hash values. */
var HASH_UNDEFINED = '__lodash_hash_undefined__';

/** Used as references for various `Number` constants. */
var INFINITY = 1 / 0;

/** `Object#toString` result references. */
var funcTag = '[object Function]',
  genTag = '[object GeneratorFunction]',
  symbolTag = '[object Symbol]';

/** Used to match property names within property paths. */
var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/,
  reIsPlainProp = /^\w*$/,
  reLeadingDot = /^\./,
  rePropName =
    /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g;

/**
 * Used to match `RegExp`
 * [syntax characters](http://ecma-international.org/ecma-262/7.0/#sec-patterns).
 */
var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;

/** Used to match backslashes in property paths. */
var reEscapeChar = /\\(\\)?/g;

/** Used to detect host constructors (Safari). */
var reIsHostCtor = /^\[object .+?Constructor\]$/;

/** Detect free variable `global` from Node.js. */
var freeGlobal =
  typeof commonjsGlobal == 'object' &&
  commonjsGlobal &&
  commonjsGlobal.Object === Object &&
  commonjsGlobal;

/** Detect free variable `self`. */
var freeSelf =
  typeof self == 'object' && self && self.Object === Object && self;

/** Used as a reference to the global object. */
var root = freeGlobal || freeSelf || Function('return this')();

/**
 * Gets the value at `key` of `object`.
 *
 * @private
 * @param {Object} [object] The object to query.
 * @param {string} key The key of the property to get.
 * @returns {*} Returns the property value.
 */
function getValue(object, key) {
  return object == null ? undefined : object[key];
}

/**
 * Checks if `value` is a host object in IE < 9.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a host object, else `false`.
 */
function isHostObject(value) {
  // Many host objects are `Object` objects that can coerce to strings
  // despite having improperly defined `toString` methods.
  var result = false;
  if (value != null && typeof value.toString != 'function') {
    try {
      result = !!(value + '');
    } catch (e) {}
  }
  return result;
}

/** Used for built-in method references. */
var arrayProto = Array.prototype,
  funcProto = Function.prototype,
  objectProto = Object.prototype;

/** Used to detect overreaching core-js shims. */
var coreJsData = root['__core-js_shared__'];

/** Used to detect methods masquerading as native. */
var maskSrcKey = (function () {
  var uid = /[^.]+$/.exec(
    (coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO) || ''
  );
  return uid ? 'Symbol(src)_1.' + uid : '';
})();

/** Used to resolve the decompiled source of functions. */
var funcToString = funcProto.toString;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var objectToString = objectProto.toString;

/** Used to detect if a method is native. */
var reIsNative = RegExp(
  '^' +
    funcToString
      .call(hasOwnProperty)
      .replace(reRegExpChar, '\\$&')
      .replace(
        /hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g,
        '$1.*?'
      ) +
    '$'
);

/** Built-in value references. */
var Symbol = root.Symbol,
  splice = arrayProto.splice;

/* Built-in method references that are verified to be native. */
var Map = getNative(root, 'Map'),
  nativeCreate = getNative(Object, 'create');

/** Used to convert symbols to primitives and strings. */
var symbolProto = Symbol ? Symbol.prototype : undefined,
  symbolToString = symbolProto ? symbolProto.toString : undefined;

/**
 * Creates a hash object.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function Hash(entries) {
  var index = -1,
    length = entries ? entries.length : 0;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

/**
 * Removes all key-value entries from the hash.
 *
 * @private
 * @name clear
 * @memberOf Hash
 */
function hashClear() {
  this.__data__ = nativeCreate ? nativeCreate(null) : {};
}

/**
 * Removes `key` and its value from the hash.
 *
 * @private
 * @name delete
 * @memberOf Hash
 * @param {Object} hash The hash to modify.
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function hashDelete(key) {
  return this.has(key) && delete this.__data__[key];
}

/**
 * Gets the hash value for `key`.
 *
 * @private
 * @name get
 * @memberOf Hash
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function hashGet(key) {
  var data = this.__data__;
  if (nativeCreate) {
    var result = data[key];
    return result === HASH_UNDEFINED ? undefined : result;
  }
  return hasOwnProperty.call(data, key) ? data[key] : undefined;
}

/**
 * Checks if a hash value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf Hash
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function hashHas(key) {
  var data = this.__data__;
  return nativeCreate
    ? data[key] !== undefined
    : hasOwnProperty.call(data, key);
}

/**
 * Sets the hash `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf Hash
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the hash instance.
 */
function hashSet(key, value) {
  var data = this.__data__;
  data[key] = nativeCreate && value === undefined ? HASH_UNDEFINED : value;
  return this;
}

// Add methods to `Hash`.
Hash.prototype.clear = hashClear;
Hash.prototype['delete'] = hashDelete;
Hash.prototype.get = hashGet;
Hash.prototype.has = hashHas;
Hash.prototype.set = hashSet;

/**
 * Creates an list cache object.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function ListCache(entries) {
  var index = -1,
    length = entries ? entries.length : 0;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

/**
 * Removes all key-value entries from the list cache.
 *
 * @private
 * @name clear
 * @memberOf ListCache
 */
function listCacheClear() {
  this.__data__ = [];
}

/**
 * Removes `key` and its value from the list cache.
 *
 * @private
 * @name delete
 * @memberOf ListCache
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function listCacheDelete(key) {
  var data = this.__data__,
    index = assocIndexOf(data, key);

  if (index < 0) {
    return false;
  }
  var lastIndex = data.length - 1;
  if (index == lastIndex) {
    data.pop();
  } else {
    splice.call(data, index, 1);
  }
  return true;
}

/**
 * Gets the list cache value for `key`.
 *
 * @private
 * @name get
 * @memberOf ListCache
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function listCacheGet(key) {
  var data = this.__data__,
    index = assocIndexOf(data, key);

  return index < 0 ? undefined : data[index][1];
}

/**
 * Checks if a list cache value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf ListCache
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function listCacheHas(key) {
  return assocIndexOf(this.__data__, key) > -1;
}

/**
 * Sets the list cache `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf ListCache
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the list cache instance.
 */
function listCacheSet(key, value) {
  var data = this.__data__,
    index = assocIndexOf(data, key);

  if (index < 0) {
    data.push([key, value]);
  } else {
    data[index][1] = value;
  }
  return this;
}

// Add methods to `ListCache`.
ListCache.prototype.clear = listCacheClear;
ListCache.prototype['delete'] = listCacheDelete;
ListCache.prototype.get = listCacheGet;
ListCache.prototype.has = listCacheHas;
ListCache.prototype.set = listCacheSet;

/**
 * Creates a map cache object to store key-value pairs.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function MapCache(entries) {
  var index = -1,
    length = entries ? entries.length : 0;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

/**
 * Removes all key-value entries from the map.
 *
 * @private
 * @name clear
 * @memberOf MapCache
 */
function mapCacheClear() {
  this.__data__ = {
    hash: new Hash(),
    map: new (Map || ListCache)(),
    string: new Hash(),
  };
}

/**
 * Removes `key` and its value from the map.
 *
 * @private
 * @name delete
 * @memberOf MapCache
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function mapCacheDelete(key) {
  return getMapData(this, key)['delete'](key);
}

/**
 * Gets the map value for `key`.
 *
 * @private
 * @name get
 * @memberOf MapCache
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function mapCacheGet(key) {
  return getMapData(this, key).get(key);
}

/**
 * Checks if a map value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf MapCache
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function mapCacheHas(key) {
  return getMapData(this, key).has(key);
}

/**
 * Sets the map `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf MapCache
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the map cache instance.
 */
function mapCacheSet(key, value) {
  getMapData(this, key).set(key, value);
  return this;
}

// Add methods to `MapCache`.
MapCache.prototype.clear = mapCacheClear;
MapCache.prototype['delete'] = mapCacheDelete;
MapCache.prototype.get = mapCacheGet;
MapCache.prototype.has = mapCacheHas;
MapCache.prototype.set = mapCacheSet;

/**
 * Gets the index at which the `key` is found in `array` of key-value pairs.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {*} key The key to search for.
 * @returns {number} Returns the index of the matched value, else `-1`.
 */
function assocIndexOf(array, key) {
  var length = array.length;
  while (length--) {
    if (eq(array[length][0], key)) {
      return length;
    }
  }
  return -1;
}

/**
 * The base implementation of `_.get` without support for default values.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {Array|string} path The path of the property to get.
 * @returns {*} Returns the resolved value.
 */
function baseGet(object, path) {
  path = isKey(path, object) ? [path] : castPath(path);

  var index = 0,
    length = path.length;

  while (object != null && index < length) {
    object = object[toKey(path[index++])];
  }
  return index && index == length ? object : undefined;
}

/**
 * The base implementation of `_.isNative` without bad shim checks.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a native function,
 *  else `false`.
 */
function baseIsNative(value) {
  if (!isObject(value) || isMasked(value)) {
    return false;
  }
  var pattern =
    isFunction(value) || isHostObject(value) ? reIsNative : reIsHostCtor;
  return pattern.test(toSource(value));
}

/**
 * The base implementation of `_.toString` which doesn't convert nullish
 * values to empty strings.
 *
 * @private
 * @param {*} value The value to process.
 * @returns {string} Returns the string.
 */
function baseToString(value) {
  // Exit early for strings to avoid a performance hit in some environments.
  if (typeof value == 'string') {
    return value;
  }
  if (isSymbol(value)) {
    return symbolToString ? symbolToString.call(value) : '';
  }
  var result = value + '';
  return result == '0' && 1 / value == -INFINITY ? '-0' : result;
}

/**
 * Casts `value` to a path array if it's not one.
 *
 * @private
 * @param {*} value The value to inspect.
 * @returns {Array} Returns the cast property path array.
 */
function castPath(value) {
  return isArray(value) ? value : stringToPath(value);
}

/**
 * Gets the data for `map`.
 *
 * @private
 * @param {Object} map The map to query.
 * @param {string} key The reference key.
 * @returns {*} Returns the map data.
 */
function getMapData(map, key) {
  var data = map.__data__;
  return isKeyable(key)
    ? data[typeof key == 'string' ? 'string' : 'hash']
    : data.map;
}

/**
 * Gets the native function at `key` of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {string} key The key of the method to get.
 * @returns {*} Returns the function if it's native, else `undefined`.
 */
function getNative(object, key) {
  var value = getValue(object, key);
  return baseIsNative(value) ? value : undefined;
}

/**
 * Checks if `value` is a property name and not a property path.
 *
 * @private
 * @param {*} value The value to check.
 * @param {Object} [object] The object to query keys on.
 * @returns {boolean} Returns `true` if `value` is a property name, else `false`.
 */
function isKey(value, object) {
  if (isArray(value)) {
    return false;
  }
  var type = typeof value;
  if (
    type == 'number' ||
    type == 'symbol' ||
    type == 'boolean' ||
    value == null ||
    isSymbol(value)
  ) {
    return true;
  }
  return (
    reIsPlainProp.test(value) ||
    !reIsDeepProp.test(value) ||
    (object != null && value in Object(object))
  );
}

/**
 * Checks if `value` is suitable for use as unique object key.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is suitable, else `false`.
 */
function isKeyable(value) {
  var type = typeof value;
  return type == 'string' ||
    type == 'number' ||
    type == 'symbol' ||
    type == 'boolean'
    ? value !== '__proto__'
    : value === null;
}

/**
 * Checks if `func` has its source masked.
 *
 * @private
 * @param {Function} func The function to check.
 * @returns {boolean} Returns `true` if `func` is masked, else `false`.
 */
function isMasked(func) {
  return !!maskSrcKey && maskSrcKey in func;
}

/**
 * Converts `string` to a property path array.
 *
 * @private
 * @param {string} string The string to convert.
 * @returns {Array} Returns the property path array.
 */
var stringToPath = memoize(function (string) {
  string = toString(string);

  var result = [];
  if (reLeadingDot.test(string)) {
    result.push('');
  }
  string.replace(rePropName, function (match, number, quote, string) {
    result.push(quote ? string.replace(reEscapeChar, '$1') : number || match);
  });
  return result;
});

/**
 * Converts `value` to a string key if it's not a string or symbol.
 *
 * @private
 * @param {*} value The value to inspect.
 * @returns {string|symbol} Returns the key.
 */
function toKey(value) {
  if (typeof value == 'string' || isSymbol(value)) {
    return value;
  }
  var result = value + '';
  return result == '0' && 1 / value == -INFINITY ? '-0' : result;
}

/**
 * Converts `func` to its source code.
 *
 * @private
 * @param {Function} func The function to process.
 * @returns {string} Returns the source code.
 */
function toSource(func) {
  if (func != null) {
    try {
      return funcToString.call(func);
    } catch (e) {}
    try {
      return func + '';
    } catch (e) {}
  }
  return '';
}

/**
 * Creates a function that memoizes the result of `func`. If `resolver` is
 * provided, it determines the cache key for storing the result based on the
 * arguments provided to the memoized function. By default, the first argument
 * provided to the memoized function is used as the map cache key. The `func`
 * is invoked with the `this` binding of the memoized function.
 *
 * **Note:** The cache is exposed as the `cache` property on the memoized
 * function. Its creation may be customized by replacing the `_.memoize.Cache`
 * constructor with one whose instances implement the
 * [`Map`](http://ecma-international.org/ecma-262/7.0/#sec-properties-of-the-map-prototype-object)
 * method interface of `delete`, `get`, `has`, and `set`.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Function
 * @param {Function} func The function to have its output memoized.
 * @param {Function} [resolver] The function to resolve the cache key.
 * @returns {Function} Returns the new memoized function.
 * @example
 *
 * var object = { 'a': 1, 'b': 2 };
 * var other = { 'c': 3, 'd': 4 };
 *
 * var values = _.memoize(_.values);
 * values(object);
 * // => [1, 2]
 *
 * values(other);
 * // => [3, 4]
 *
 * object.a = 2;
 * values(object);
 * // => [1, 2]
 *
 * // Modify the result cache.
 * values.cache.set(object, ['a', 'b']);
 * values(object);
 * // => ['a', 'b']
 *
 * // Replace `_.memoize.Cache`.
 * _.memoize.Cache = WeakMap;
 */
function memoize(func, resolver) {
  if (
    typeof func != 'function' ||
    (resolver && typeof resolver != 'function')
  ) {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  var memoized = function () {
    var args = arguments,
      key = resolver ? resolver.apply(this, args) : args[0],
      cache = memoized.cache;

    if (cache.has(key)) {
      return cache.get(key);
    }
    var result = func.apply(this, args);
    memoized.cache = cache.set(key, result);
    return result;
  };
  memoized.cache = new (memoize.Cache || MapCache)();
  return memoized;
}

// Assign cache to `_.memoize`.
memoize.Cache = MapCache;

/**
 * Performs a
 * [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
 * comparison between two values to determine if they are equivalent.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to compare.
 * @param {*} other The other value to compare.
 * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
 * @example
 *
 * var object = { 'a': 1 };
 * var other = { 'a': 1 };
 *
 * _.eq(object, object);
 * // => true
 *
 * _.eq(object, other);
 * // => false
 *
 * _.eq('a', 'a');
 * // => true
 *
 * _.eq('a', Object('a'));
 * // => false
 *
 * _.eq(NaN, NaN);
 * // => true
 */
function eq(value, other) {
  return value === other || (value !== value && other !== other);
}

/**
 * Checks if `value` is classified as an `Array` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an array, else `false`.
 * @example
 *
 * _.isArray([1, 2, 3]);
 * // => true
 *
 * _.isArray(document.body.children);
 * // => false
 *
 * _.isArray('abc');
 * // => false
 *
 * _.isArray(_.noop);
 * // => false
 */
var isArray = Array.isArray;

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a function, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in Safari 8-9 which returns 'object' for typed array and other constructors.
  var tag = isObject(value) ? objectToString.call(value) : '';
  return tag == funcTag || tag == genTag;
}

/**
 * Checks if `value` is the
 * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
 * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(_.noop);
 * // => true
 *
 * _.isObject(null);
 * // => false
 */
function isObject(value) {
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/**
 * Checks if `value` is classified as a `Symbol` primitive or object.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
 * @example
 *
 * _.isSymbol(Symbol.iterator);
 * // => true
 *
 * _.isSymbol('abc');
 * // => false
 */
function isSymbol(value) {
  return (
    typeof value == 'symbol' ||
    (isObjectLike(value) && objectToString.call(value) == symbolTag)
  );
}

/**
 * Converts `value` to a string. An empty string is returned for `null`
 * and `undefined` values. The sign of `-0` is preserved.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to process.
 * @returns {string} Returns the string.
 * @example
 *
 * _.toString(null);
 * // => ''
 *
 * _.toString(-0);
 * // => '-0'
 *
 * _.toString([1, 2, 3]);
 * // => '1,2,3'
 */
function toString(value) {
  return value == null ? '' : baseToString(value);
}

/**
 * Gets the value at `path` of `object`. If the resolved value is
 * `undefined`, the `defaultValue` is returned in its place.
 *
 * @static
 * @memberOf _
 * @since 3.7.0
 * @category Object
 * @param {Object} object The object to query.
 * @param {Array|string} path The path of the property to get.
 * @param {*} [defaultValue] The value returned for `undefined` resolved values.
 * @returns {*} Returns the resolved value.
 * @example
 *
 * var object = { 'a': [{ 'b': { 'c': 3 } }] };
 *
 * _.get(object, 'a[0].b.c');
 * // => 3
 *
 * _.get(object, ['a', '0', 'b', 'c']);
 * // => 3
 *
 * _.get(object, 'a.b.c', 'default');
 * // => 'default'
 */
function get(object, path, defaultValue) {
  var result = object == null ? undefined : baseGet(object, path);
  return result === undefined ? defaultValue : result;
}

var lodash_get = get;

var n = { exchange: '/v1/auth/accesskey/exchange' },
  s$2 = {
    verify: '/v1/auth/otp/verify',
    signIn: '/v1/auth/otp/signin',
    signUp: '/v1/auth/otp/signup',
    update: {
      email: '/v1/auth/otp/update/email',
      phone: '/v1/auth/otp/update/phone',
    },
    signUpOrIn: '/v1/auth/otp/signup-in',
  },
  o$1 = {
    verify: '/v1/auth/magiclink/verify',
    signIn: '/v1/auth/magiclink/signin',
    signUp: '/v1/auth/magiclink/signup',
    update: {
      email: '/v1/auth/magiclink/update/email',
      phone: '/v1/auth/magiclink/update/phone',
    },
    signUpOrIn: '/v1/auth/magiclink/signup-in',
  },
  i = {
    verify: '/v1/auth/enchantedlink/verify',
    signIn: '/v1/auth/enchantedlink/signin',
    signUp: '/v1/auth/enchantedlink/signup',
    session: '/v1/auth/enchantedlink/pending-session',
    update: { email: '/v1/auth/enchantedlink/update/email' },
    signUpOrIn: '/v1/auth/enchantedlink/signup-in',
  },
  a = {
    start: '/v1/auth/oauth/authorize',
    exchange: '/v1/auth/oauth/exchange',
  },
  r$2 = {
    start: '/v1/auth/saml/authorize',
    exchange: '/v1/auth/saml/exchange',
  },
  u$1 = {
    verify: '/v1/auth/totp/verify',
    signUp: '/v1/auth/totp/signup',
    update: '/v1/auth/totp/update',
  },
  d$1 = {
    signUp: {
      start: '/v1/auth/webauthn/signup/start',
      finish: '/v1/auth/webauthn/signup/finish',
    },
    signIn: {
      start: '/v1/auth/webauthn/signin/start',
      finish: '/v1/auth/webauthn/signin/finish',
    },
    signUpOrIn: { start: '/v1/auth/webauthn/signup-in/start' },
    update: {
      start: 'v1/auth/webauthn/update/start',
      finish: '/v1/auth/webauthn/update/finish',
    },
  },
  l$1 = '/v1/auth/refresh',
  c$1 = '/v1/auth/logout',
  p$1 = '/v1/auth/logoutall',
  g$2 = '/v1/auth/me',
  h$1 = { start: '/v1/flow/start', next: '/v1/flow/next' };
const v$2 = () => {
    const e = {};
    return {
      headers(t) {
        const n =
          'function' == typeof t.entries ? Object.fromEntries(t.entries()) : t;
        return (e.Headers = JSON.stringify(n)), this;
      },
      body(t) {
        return (e.Body = t), this;
      },
      url(t) {
        return (e.Url = t.toString()), this;
      },
      method(t) {
        return (e.Method = t), this;
      },
      title(t) {
        return (e.Title = t), this;
      },
      status(t) {
        return (e.Status = t), this;
      },
      build: () =>
        Object.keys(e)
          .flatMap((t) =>
            e[t] ? [`${'Title' !== t ? `${t}: ` : ''}${e[t]}`] : []
          )
          .join('\n'),
    };
  },
  f$1 = (e, t) => {
    const n = t || fetch;
    return (
      n ||
        null == e ||
        e.warn(
          'Fetch is not defined, you will not be able to send http requests, if you are running in a test, make sure fetch is defined globally'
        ),
      e
        ? async (...t) => {
            if (!n)
              throw Error(
                'Cannot send http request, fetch is not defined, if you are running in a test, make sure fetch is defined globally'
              );
            e.log(
              ((e) =>
                v$2()
                  .title('Request')
                  .url(e[0])
                  .method(e[1].method)
                  .headers(e[1].headers)
                  .body(e[1].body)
                  .build())(t)
            );
            const s = await n(...t);
            return (
              e[s.ok ? 'log' : 'error'](
                await (async (e) => {
                  const t = await (e.clone ? e.clone().text() : e.text());
                  return (
                    (e.text = () => Promise.resolve(t)),
                    (e.json = () => Promise.resolve(JSON.parse(t))),
                    v$2()
                      .title('Response')
                      .url(e.url.toString())
                      .status(`${e.status} ${e.statusText}`)
                      .headers(e.headers)
                      .body(t)
                      .build()
                  );
                })(s)
              ),
              s
            );
          }
        : n
    );
  };
var m$1;
!(function (e) {
  (e.get = 'GET'), (e.delete = 'DELETE'), (e.post = 'POST'), (e.put = 'PUT');
})(m$1 || (m$1 = {}));
const I$1 = (...e) =>
    new Headers(
      e.reduce((e, t) => {
        const n = ((e) =>
          Array.isArray(e)
            ? e
            : e instanceof Headers
            ? Array.from(e.entries())
            : e
            ? Object.entries(e)
            : [])(t);
        return n.reduce((t, [n, s]) => ((e[n] = s), e), e), e;
      }, {})
    ),
  b$1 = (e) => (void 0 === e ? void 0 : JSON.stringify(e)),
  k$2 = (e, t = '') => {
    let n = e;
    return t && (n = n + ':' + t), { Authorization: `Bearer ${n}` };
  },
  y$1 = ({
    baseUrl: e,
    projectId: t,
    baseConfig: n,
    logger: s,
    hooks: o,
    cookiePolicy: i,
    fetch: a,
  }) => {
    const r = f$1(s, a),
      u = async (s) => {
        const a = (null == o ? void 0 : o.beforeRequest)
            ? o.beforeRequest(s)
            : s,
          {
            path: u,
            body: d,
            headers: l,
            queryParams: c,
            method: p,
            token: g,
          } = a,
          h = await r(
            (({ path: e, baseUrl: t, queryParams: n }) => {
              const s = new URL(e, t);
              return n && (s.search = new URLSearchParams(n).toString()), s;
            })({ path: u, baseUrl: e, queryParams: c }),
            {
              headers: I$1(
                k$2(t, g),
                {
                  'x-descope-sdk-name': 'core-js',
                  'x-descope-sdk-version': '1.0.1',
                },
                (null == n ? void 0 : n.baseHeaders) || {},
                l
              ),
              method: p,
              body: b$1(d),
              credentials: i || 'include',
            }
          );
        return (
          (null == o ? void 0 : o.afterRequest) &&
            (await o.afterRequest(s, null == h ? void 0 : h.clone())),
          h
        );
      };
    return {
      get: (e, { headers: t, queryParams: n, token: s } = {}) =>
        u({
          path: e,
          headers: t,
          queryParams: n,
          body: void 0,
          method: m$1.get,
          token: s,
        }),
      post: (e, t, { headers: n, queryParams: s, token: o } = {}) =>
        u({
          path: e,
          headers: n,
          queryParams: s,
          body: t,
          method: m$1.post,
          token: o,
        }),
      put: (e, t, { headers: n, queryParams: s, token: o } = {}) =>
        u({
          path: e,
          headers: n,
          queryParams: s,
          body: t,
          method: m$1.put,
          token: o,
        }),
      delete: (e, t, { headers: n, queryParams: s, token: o } = {}) =>
        u({
          path: e,
          headers: n,
          queryParams: s,
          body: t,
          method: m$1.delete,
          token: o,
        }),
      hooks: o,
    };
  };
var O$1 = { TOO_MANY_REQUESTS: 429 };
function w$1(e, t, n) {
  var s;
  let o = j$1(e);
  t &&
    (o =
      null === (s = null == o ? void 0 : o.tenants) || void 0 === s
        ? void 0
        : s[t]);
  const i = null == o ? void 0 : o[n];
  return Array.isArray(i) ? i : [];
}
function j$1(t) {
  if ('string' != typeof t || !t) throw new Error('Invalid token provided');
  return o$2(t);
}
function U$2(e) {
  const { exp: t } = j$1(e);
  return new Date().getTime() / 1e3 > t;
}
function R$1(e, t) {
  return w$1(e, t, 'permissions');
}
function x$1(e, t) {
  return w$1(e, t, 'roles');
}
const P$1 = (...e) => e.join('/').replace(/\/{2,}/g, '/');
async function q$1(e, t) {
  var n;
  const s = await e,
    o = { code: s.status, ok: s.ok, response: s },
    i = await s.clone().json();
  return (
    s.ok
      ? (o.data = t ? t(i) : i)
      : ((o.error = i),
        s.status === O$1.TOO_MANY_REQUESTS &&
          Object.assign(o.error, {
            retryAfter:
              Number.parseInt(
                null === (n = s.headers) || void 0 === n
                  ? void 0
                  : n.get('retry-after')
              ) || 0,
          })),
    o
  );
}
const E$1 =
    (e, t) =>
    (n = t) =>
    (t) =>
      !e(t) && n.replace('{val}', t),
  $ = (...e) => ({
    validate: (t) => (
      e.forEach((e) => {
        const n = e(t);
        if (n) throw new Error(n);
      }),
      !0
    ),
  }),
  S$1 = (e) => (t) => e.test(t),
  M$1 = S$1(
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/
  ),
  T$1 = S$1(/^\+[1-9]{1}[0-9]{3,14}$/),
  A$1 = E$1(M$1, '"{val}" is not a valid email'),
  L$1 = E$1(T$1, '"{val}" is not a valid phone number'),
  z = E$1(((H$1 = 1), (e) => e.length >= H$1), 'Minimum length is 1');
var H$1;
const J$1 = E$1((e) => 'string' == typeof e, 'Input is not a string'),
  N$1 =
    (...e) =>
    (t) =>
    (...n) => (e.forEach((e, t) => $(...e).validate(n[t])), t(...n)),
  C$2 = (e) => [J$1(`"${e}" must be a string`), z(`"${e}" must not be empty`)],
  _$1 = (e) => [J$1(`"${e}" must be a string`), A$1()],
  D$1 = (e) => [J$1(`"${e}" must be a string`), L$1()],
  Z = N$1(C$2('accessKey')),
  B$1 = (e) => ({
    exchange: Z((t) => q$1(e.post(n.exchange, {}, { token: t }))),
  });
var F$1, K$2, Q, Y;
!(function (e) {
  (e.sms = 'sms'), (e.whatsapp = 'whatsapp');
})(F$1 || (F$1 = {})),
  (function (e) {
    (e.email = 'email'), (e.sms = 'sms'), (e.whatsapp = 'whatsapp');
  })(K$2 || (K$2 = {})),
  (function (e) {
    (e.waiting = 'waiting'),
      (e.running = 'running'),
      (e.completed = 'completed'),
      (e.failed = 'failed');
  })(Q || (Q = {})),
  (function (e) {
    (e.signUp = 'signup'), (e.signIn = 'signin'), (e.verify = 'verify');
  })(Y || (Y = {}));
const G = C$2('loginId'),
  V = N$1(C$2('token')),
  W = N$1(G),
  X = N$1(C$2('pendingRef')),
  ee = N$1(G, _$1('email')),
  te = (e) => ({
    verify: V((t) => q$1(e.post(i.verify, { token: t }))),
    signIn: W((t, n, s, o) =>
      q$1(
        e.post(
          P$1(i.signIn, K$2.email),
          { loginId: t, URI: n, loginOptions: s },
          { token: o }
        )
      )
    ),
    signUpOrIn: W((t, n) =>
      q$1(e.post(P$1(i.signUpOrIn, K$2.email), { loginId: t, URI: n }))
    ),
    signUp: W((t, n, s) =>
      q$1(e.post(P$1(i.signUp, K$2.email), { loginId: t, URI: n, user: s }))
    ),
    waitForSession: X(
      (t, n) =>
        new Promise((s) => {
          const { pollingIntervalMs: o, timeoutMs: a } = (({
            pollingIntervalMs: e = 1e3,
            timeoutMs: t = 6e5,
          } = {}) => ({
            pollingIntervalMs: Math.max(e || 1e3, 1e3),
            timeoutMs: Math.min(t || 6e5, 6e5),
          }))(n);
          let r;
          const u = setInterval(async () => {
            const n = await e.post(i.session, { pendingRef: t });
            n.ok &&
              (clearInterval(u),
              r && clearTimeout(r),
              s(q$1(Promise.resolve(n))));
          }, o);
          r = setTimeout(() => {
            s({
              error: {
                errorDescription: `Session polling timeout exceeded: ${a}ms`,
                errorCode: '0',
              },
              ok: !1,
            }),
              clearInterval(u);
          }, a);
        })
    ),
    update: {
      email: ee((t, n, s, o) =>
        q$1(
          e.post(i.update.email, { loginId: t, email: n, URI: s }, { token: o })
        )
      ),
    },
  }),
  ne = N$1(C$2('flowId')),
  se = N$1(C$2('executionId'), C$2('stepId'), C$2('interactionId')),
  oe = (e) => ({
    start: ne((t, n, s, o, i) =>
      q$1(
        e.post(h$1.start, {
          flowId: t,
          options: n,
          conditionInteractionId: s,
          interactionId: o,
          input: i,
        })
      )
    ),
    next: se((t, n, s, o) =>
      q$1(
        e.post(h$1.next, {
          executionId: t,
          stepId: n,
          interactionId: s,
          input: o,
        })
      )
    ),
  }),
  ie = C$2('loginId'),
  ae = N$1(C$2('token')),
  re = N$1(ie),
  ue = N$1(ie, D$1('phone')),
  de = N$1(ie, _$1('email')),
  le = (e) => ({
    verify: ae((t) => q$1(e.post(o$1.verify, { token: t }))),
    signIn: Object.keys(K$2).reduce(
      (t, n) =>
        Object.assign(Object.assign({}, t), {
          [n]: re((t, s, i, a) =>
            q$1(
              e.post(
                P$1(o$1.signIn, n),
                { loginId: t, URI: s, loginOptions: i },
                { token: a }
              )
            )
          ),
        }),
      {}
    ),
    signUp: Object.keys(K$2).reduce(
      (t, n) =>
        Object.assign(Object.assign({}, t), {
          [n]: re((t, s, i) =>
            q$1(e.post(P$1(o$1.signUp, n), { loginId: t, URI: s, user: i }))
          ),
        }),
      {}
    ),
    signUpOrIn: Object.keys(K$2).reduce(
      (t, n) =>
        Object.assign(Object.assign({}, t), {
          [n]: re((t, s) =>
            q$1(e.post(P$1(o$1.signUpOrIn, n), { loginId: t, URI: s }))
          ),
        }),
      {}
    ),
    update: {
      email: de((t, n, s, i) =>
        q$1(
          e.post(
            o$1.update.email,
            { loginId: t, email: n, URI: s },
            { token: i }
          )
        )
      ),
      phone: Object.keys(F$1).reduce(
        (t, n) =>
          Object.assign(Object.assign({}, t), {
            [n]: ue((t, s, i, a) =>
              q$1(
                e.post(
                  P$1(o$1.update.phone, n),
                  { loginId: t, phone: s, URI: i },
                  { token: a }
                )
              )
            ),
          }),
        {}
      ),
    },
  });
var ce;
!(function (e) {
  (e.facebook = 'facebook'),
    (e.github = 'github'),
    (e.google = 'google'),
    (e.microsoft = 'microsoft'),
    (e.gitlab = 'gitlab'),
    (e.apple = 'apple'),
    (e.discord = 'discord'),
    (e.linkedin = 'linkedin');
})(ce || (ce = {}));
const pe = N$1(C$2('code')),
  ge = (e) => ({
    start: Object.keys(ce).reduce(
      (t, n) =>
        Object.assign(Object.assign({}, t), {
          [n]: async (t, { redirect: s = !1 } = {}, o, i) => {
            const r = await e.post(a.start, o || {}, {
              queryParams: Object.assign(
                { provider: n },
                t && { redirectURL: t }
              ),
              token: i,
            });
            if (!s || !r.ok) return q$1(Promise.resolve(r));
            const { url: u } = await r.json();
            window.location.href = u;
          },
        }),
      {}
    ),
    exchange: pe((t) => q$1(e.post(a.exchange, { code: t }))),
  });
var he;
!(function (e) {
  (e.signUp = 'signup'),
    (e.signIn = 'signin'),
    (e.verify = 'verify'),
    (e.updatePhone = 'updatePhone');
})(he || (he = {}));
const ve = C$2('loginId'),
  fe = N$1(ve, C$2('code')),
  me = N$1(ve),
  Ie = N$1(ve, D$1('phone')),
  be = N$1(ve, _$1('email')),
  ke = (e) => ({
    verify: Object.keys(K$2).reduce(
      (t, n) =>
        Object.assign(Object.assign({}, t), {
          [n]: fe((t, o) =>
            q$1(e.post(P$1(s$2.verify, n), { code: o, loginId: t }))
          ),
        }),
      {}
    ),
    signIn: Object.keys(K$2).reduce(
      (t, n) =>
        Object.assign(Object.assign({}, t), {
          [n]: me((t, o, i) =>
            q$1(
              e.post(
                P$1(s$2.signIn, n),
                { loginId: t, loginOptions: o },
                { token: i }
              )
            )
          ),
        }),
      {}
    ),
    signUp: Object.keys(K$2).reduce(
      (t, n) =>
        Object.assign(Object.assign({}, t), {
          [n]: me((t, o) =>
            q$1(e.post(P$1(s$2.signUp, n), { loginId: t, user: o }))
          ),
        }),
      {}
    ),
    signUpOrIn: Object.keys(K$2).reduce(
      (t, n) =>
        Object.assign(Object.assign({}, t), {
          [n]: me((t) => q$1(e.post(P$1(s$2.signUpOrIn, n), { loginId: t }))),
        }),
      {}
    ),
    update: {
      email: be((t, n, o) =>
        q$1(e.post(s$2.update.email, { loginId: t, email: n }, { token: o }))
      ),
      phone: Object.keys(F$1).reduce(
        (t, n) =>
          Object.assign(Object.assign({}, t), {
            [n]: Ie((t, o, i) =>
              q$1(
                e.post(
                  P$1(s$2.update.phone, n),
                  { loginId: t, phone: o },
                  { token: i }
                )
              )
            ),
          }),
        {}
      ),
    },
  }),
  ye = N$1(C$2('tenant')),
  Oe = N$1(C$2('code')),
  we = (e) => ({
    start: ye(async (t, n, { redirect: s = !1 } = {}, o, i) => {
      const a = await e.post(r$2.start, o || {}, {
        queryParams: { tenant: t, redirectURL: n },
        token: i,
      });
      if (!s || !a.ok) return q$1(Promise.resolve(a));
      const { url: u } = await a.json();
      window.location.href = u;
    }),
    exchange: Oe((t) => q$1(e.post(r$2.exchange, { code: t }))),
  }),
  je = C$2('loginId'),
  Ue = N$1(je, C$2('code')),
  Re = N$1(je),
  xe = N$1(je),
  Pe = (e) => ({
    signUp: Re((t, n) => q$1(e.post(u$1.signUp, { loginId: t, user: n }))),
    verify: Ue((t, n, s, o) =>
      q$1(
        e.post(
          u$1.verify,
          { loginId: t, code: n, loginOptions: s },
          { token: o }
        )
      )
    ),
    update: xe((t, n) => q$1(e.post(u$1.update, { loginId: t }, { token: n }))),
  }),
  qe = [J$1(`"${'loginId'}" must be a string`)];
const Ee = C$2('loginId'),
  $e = C$2('origin'),
  Se = N$1(Ee, $e, C$2('name')),
  Me = N$1(Ee, $e),
  Te = N$1(qe, $e),
  Ae = N$1(Ee, $e, C$2('token')),
  Le = N$1(C$2('transactionId'), C$2('response')),
  ze = (e) => ({
    signUp: {
      start: Se((t, n, s) =>
        q$1(
          e.post(d$1.signUp.start, { user: { loginId: t, name: s }, origin: n })
        )
      ),
      finish: Le((t, n) =>
        q$1(e.post(d$1.signUp.finish, { transactionId: t, response: n }))
      ),
    },
    signIn: {
      start: Te((t, n, s, o) =>
        q$1(
          e.post(
            d$1.signIn.start,
            { loginId: t, origin: n, loginOptions: s },
            { token: o }
          )
        )
      ),
      finish: Le((t, n) =>
        q$1(e.post(d$1.signIn.finish, { transactionId: t, response: n }))
      ),
    },
    signUpOrIn: {
      start: Me((t, n) =>
        q$1(e.post(d$1.signUpOrIn.start, { loginId: t, origin: n }))
      ),
    },
    update: {
      start: Ae((t, n, s) =>
        q$1(e.post(d$1.update.start, { loginId: t, origin: n }, { token: s }))
      ),
      finish: Le((t, n) =>
        q$1(e.post(d$1.update.finish, { transactionId: t, response: n }))
      ),
    },
  }),
  He = N$1(C$2('token'));
var Je, Ne;
var Ce = N$1([
  ((Je = 'projectId'),
  (Ne = C$2('projectId')),
  E$1(
    (
      (e, n) => (s) =>
        $(...n).validate(lodash_get(s, e))
    )(Je, Ne)
  )()),
])(
  ((e) => (t) => {
    var n, s;
    const o = [].concat(
        (null === (n = t.hooks) || void 0 === n ? void 0 : n.beforeRequest) ||
          []
      ),
      i = [].concat(
        (null === (s = t.hooks) || void 0 === s ? void 0 : s.afterRequest) || []
      );
    return e(
      Object.assign(Object.assign({}, t), {
        hooks: {
          beforeRequest: (e) =>
            null == o ? void 0 : o.reduce((e, t) => t(e), e),
          afterRequest: async (e, n) => {
            (
              await Promise.allSettled(
                null == i
                  ? void 0
                  : i.map((t) => t(e, null == n ? void 0 : n.clone()))
              )
            ).forEach((e) => {
              var n;
              return (
                'rejected' === e.status &&
                (null === (n = t.logger) || void 0 === n
                  ? void 0
                  : n.error(e.reason))
              );
            });
          },
        },
      })
    );
  })(
    ({
      projectId: e,
      logger: t,
      baseUrl: n,
      hooks: s,
      cookiePolicy: o,
      baseHeaders: i = {},
      fetch: a,
    }) => {
      return (
        (r = y$1({
          baseUrl: n || 'https://api.descope.com',
          projectId: e,
          logger: t,
          hooks: s,
          cookiePolicy: o,
          baseConfig: { baseHeaders: i },
          fetch: a,
        })),
        {
          accessKey: B$1(r),
          otp: ke(r),
          magicLink: le(r),
          enchantedLink: te(r),
          oauth: ge(r),
          saml: we(r),
          totp: Pe(r),
          webauthn: ze(r),
          flow: oe(r),
          refresh: (e) => q$1(r.post(l$1, {}, { token: e })),
          logout: (e) => q$1(r.post(c$1, {}, { token: e })),
          logoutAll: (e) => q$1(r.post(p$1, {}, { token: e })),
          me: (e) => q$1(r.get(g$2, { token: e })),
          isJwtExpired: He(U$2),
          getJwtPermissions: He(R$1),
          getJwtRoles: He(x$1),
          httpClient: r,
        }
      );
      var r;
    }
  )
);
const _e = (e, t, n) => (
  t.forEach((t) => {
    const s = t.split('.');
    let o = s.shift(),
      i = e;
    for (; s.length > 0; ) {
      if (((i = i[o]), !o || !i))
        throw Error(`Invalid path "${t}", "${o}" is missing or has no value`);
      o = s.shift();
    }
    if ('function' != typeof i[o]) throw Error(`"${t}" is not a function`);
    const a = i[o];
    i[o] = n(a);
  }),
  e
);
var Ze = Object.assign(Ce, { DeliveryMethods: K$2 });

/**
 * FingerprintJS Pro v3.8.2 - Copyright (c) FingerprintJS, Inc, 2023 (https://fingerprint.com)
 *
 * This software contains code from open-source projects:
 * MurmurHash3 by Karan Lyons (https://github.com/karanlyons/murmurHash3.js)
 */
function r$1(e, t) {
  return (function (e, t) {
    return Object.prototype.hasOwnProperty.call(e, t);
  })(e, t)
    ? e[t]
    : void 0;
}
var s$1 = 'Blocked by CSP',
  v$1 = 'API key required',
  U$1 = '3.8.2',
  L = '9319';
function g$1(t, n) {
  var r = [];
  return (function (t, n) {
    var r = 5,
      o =
        ((E = t),
        (f = __spreadArray([], E, !0)),
        {
          current: function () {
            return f[0];
          },
          postpone: function () {
            var e = f.shift();
            void 0 !== e && f.push(e);
          },
          exclude: function () {
            f.shift();
          },
        }),
      i =
        ((R = 100),
        (a = 3e3),
        (c = 0),
        function () {
          return Math.random() * Math.min(a, R * Math.pow(2, c++));
        }),
      u = o.current();
    var R, a, c;
    var E, f;
    if (void 0 === u)
      return Promise.reject(
        new TypeError('The list of script URL patterns is empty')
      );
    var l = function (e, t) {
      return n(e).catch(function (e) {
        if (t + 1 >= r) throw e;
        !(function (e) {
          if (!(e instanceof Error)) return !1;
          var t = e.message;
          return t === s$1 || t === L;
        })(e)
          ? o.postpone()
          : o.exclude();
        var n,
          u = o.current();
        if (void 0 === u) throw e;
        return ((n = i()),
        new Promise(function (e) {
          return setTimeout(e, n);
        })).then(function () {
          return l(u, t + 1);
        });
      });
    };
    return l(u, 0);
  })(t, function (e) {
    var t = new Date(),
      o = function () {
        return r.push({ url: e, startedAt: t, finishedAt: new Date() });
      },
      i = n(e);
    return i.then(o, o), i;
  }).then(function (e) {
    return [e, { attempts: r }];
  });
}
var C$1 = 'https://fpnpmcdn.net/v<version>/<apiKey>/loader_v<loaderVersion>.js',
  K$1 = 'Failed to load the JS script of the agent';
function M(e) {
  var o;
  e.scriptUrlPattern;
  var i = e.token,
    u = e.apiKey,
    R = void 0 === u ? i : u,
    a = __rest(e, ['scriptUrlPattern', 'token', 'apiKey']),
    c = null !== (o = r$1(e, 'scriptUrlPattern')) && void 0 !== o ? o : C$1;
  return Promise.resolve()
    .then(function () {
      if (!R || 'string' != typeof R) throw new Error(v$1);
      var e = (function (e, t) {
        return (Array.isArray(e) ? e : [e]).map(function (e) {
          return (function (e, t) {
            var n = encodeURIComponent;
            return e.replace(/<[^<>]+>/g, function (e) {
              return '<version>' === e
                ? '3'
                : '<apiKey>' === e
                ? n(t)
                : '<loaderVersion>' === e
                ? n(U$1)
                : e;
            });
          })(String(e), t);
        });
      })(c, R);
      return g$1(e, B).catch(k$1);
    })
    .then(function (e) {
      var t = e[0],
        r = e[1];
      return t.load(__assign(__assign({}, a), { ldi: r }));
    });
}
function B(e) {
  return (function (e, t, n, r) {
    var o,
      i = document,
      u = 'securitypolicyviolation',
      R = function (t) {
        var n = new URL(e, location.href),
          r = t.blockedURI;
        (r !== n.href && r !== n.protocol.slice(0, -1) && r !== n.origin) ||
          ((o = t), a());
      };
    i.addEventListener(u, R);
    var a = function () {
      return i.removeEventListener(u, R);
    };
    return (
      null == r || r.then(a, a),
      Promise.resolve()
        .then(t)
        .then(
          function (e) {
            return a(), e;
          },
          function (e) {
            return new Promise(function (e) {
              return setTimeout(e);
            }).then(function () {
              if ((a(), o)) return n(o);
              throw e;
            });
          }
        )
    );
  })(
    e,
    function () {
      return (function (e) {
        return new Promise(function (t, n) {
          var r = document.createElement('script'),
            o = function () {
              var e;
              return null === (e = r.parentNode) || void 0 === e
                ? void 0
                : e.removeChild(r);
            },
            i = document.head || document.getElementsByTagName('head')[0];
          (r.onload = function () {
            o(), t();
          }),
            (r.onerror = function () {
              o(), n(new Error(K$1));
            }),
            (r.async = !0),
            (r.src = e),
            i.appendChild(r);
        });
      })(e);
    },
    function () {
      throw new Error(s$1);
    }
  ).then(F);
}
function F() {
  var e = window,
    t = '__fpjs_p_l_b',
    n = e[t];
  if (
    ((function (e, t) {
      var n,
        r =
          null === (n = Object.getOwnPropertyDescriptor) || void 0 === n
            ? void 0
            : n.call(Object, e, t);
      (null == r ? void 0 : r.configurable)
        ? delete e[t]
        : (r && !r.writable) || (e[t] = void 0);
    })(e, t),
    'function' != typeof (null == n ? void 0 : n.load))
  )
    throw new Error(L);
  return n;
}
function k$1(e) {
  throw e instanceof Error && e.message === L ? new Error(K$1) : e;
}

/*! js-cookie v3.0.1 | MIT */
/* eslint-disable no-var */
function assign(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];
    for (var key in source) {
      target[key] = source[key];
    }
  }
  return target;
}
/* eslint-enable no-var */

/* eslint-disable no-var */
var defaultConverter = {
  read: function (value) {
    if (value[0] === '"') {
      value = value.slice(1, -1);
    }
    return value.replace(/(%[\dA-F]{2})+/gi, decodeURIComponent);
  },
  write: function (value) {
    return encodeURIComponent(value).replace(
      /%(2[346BF]|3[AC-F]|40|5[BDE]|60|7[BCD])/g,
      decodeURIComponent
    );
  },
};
/* eslint-enable no-var */

/* eslint-disable no-var */

function init(converter, defaultAttributes) {
  function set(key, value, attributes) {
    if (typeof document === 'undefined') {
      return;
    }

    attributes = assign({}, defaultAttributes, attributes);

    if (typeof attributes.expires === 'number') {
      attributes.expires = new Date(Date.now() + attributes.expires * 864e5);
    }
    if (attributes.expires) {
      attributes.expires = attributes.expires.toUTCString();
    }

    key = encodeURIComponent(key)
      .replace(/%(2[346B]|5E|60|7C)/g, decodeURIComponent)
      .replace(/[()]/g, escape);

    var stringifiedAttributes = '';
    for (var attributeName in attributes) {
      if (!attributes[attributeName]) {
        continue;
      }

      stringifiedAttributes += '; ' + attributeName;

      if (attributes[attributeName] === true) {
        continue;
      }

      // Considers RFC 6265 section 5.2:
      // ...
      // 3.  If the remaining unparsed-attributes contains a %x3B (";")
      //     character:
      // Consume the characters of the unparsed-attributes up to,
      // not including, the first %x3B (";") character.
      // ...
      stringifiedAttributes += '=' + attributes[attributeName].split(';')[0];
    }

    return (document.cookie =
      key + '=' + converter.write(value, key) + stringifiedAttributes);
  }

  function get(key) {
    if (typeof document === 'undefined' || (arguments.length && !key)) {
      return;
    }

    // To prevent the for loop in the first place assign an empty array
    // in case there are no cookies at all.
    var cookies = document.cookie ? document.cookie.split('; ') : [];
    var jar = {};
    for (var i = 0; i < cookies.length; i++) {
      var parts = cookies[i].split('=');
      var value = parts.slice(1).join('=');

      try {
        var foundKey = decodeURIComponent(parts[0]);
        jar[foundKey] = converter.read(value, foundKey);

        if (key === foundKey) {
          break;
        }
      } catch (e) {}
    }

    return key ? jar[key] : jar;
  }

  return Object.create(
    {
      set: set,
      get: get,
      remove: function (key, attributes) {
        set(
          key,
          '',
          assign({}, attributes, {
            expires: -1,
          })
        );
      },
      withAttributes: function (attributes) {
        return init(this.converter, assign({}, this.attributes, attributes));
      },
      withConverter: function (converter) {
        return init(assign({}, this.converter, converter), this.attributes);
      },
    },
    {
      attributes: { value: Object.freeze(defaultAttributes) },
      converter: { value: Object.freeze(converter) },
    }
  );
}

var api = init(defaultConverter, { path: '/' });

const o = (t, e) => {
    var n;
    return (
      ['beforeRequest', 'afterRequest'].reduce(
        (n, a) => {
          var i;
          return (
            (n[a] = []
              .concat(
                (null === (i = t.hooks) || void 0 === i ? void 0 : i[a]) || []
              )
              .concat((null == e ? void 0 : e[a]) || [])),
            n
          );
        },
        null !== (n = t.hooks) && void 0 !== n ? n : (t.hooks = {})
      ),
      t
    );
  },
  s = async (t) => {
    if (!(null == t ? void 0 : t.ok)) return {};
    const e = await (null == t ? void 0 : t.clone().json());
    return (null == e ? void 0 : e.authInfo) || e || {};
  },
  r = async (t) => {
    const e = await s(t);
    return (
      (null == e ? void 0 : e.user) ||
      ((null == e ? void 0 : e.hasOwnProperty('userId')) ? e : void 0)
    );
  },
  l = 'undefined' != typeof localStorage,
  c = (t, e) =>
    l &&
    (null === localStorage || void 0 === localStorage
      ? void 0
      : localStorage.setItem(t, e)),
  u = (t) =>
    l &&
    (null === localStorage || void 0 === localStorage
      ? void 0
      : localStorage.getItem(t)),
  d = (t) =>
    l &&
    (null === localStorage || void 0 === localStorage
      ? void 0
      : localStorage.removeItem(t)),
  g = 'undefined' != typeof window,
  p =
    (g &&
      (null === localStorage || void 0 === localStorage
        ? void 0
        : localStorage.getItem('fingerprint.endpoint.url'))) ||
    'https://fp.descope.com',
  w = (t = '', e = '') => ({ vsid: t, vrid: e }),
  f = (t = !1) => {
    const e = localStorage.getItem('fp');
    if (!e) return null;
    const n = JSON.parse(e);
    return new Date().getTime() > n.expiry && !t ? null : n.value;
  },
  b = async (t) => {
    try {
      if (f()) return;
      const e = (
          Date.now().toString(36) +
          Math.random().toString(36).substring(2) +
          Math.random().toString(36).substring(2)
        ).substring(0, 27),
        n = M({ apiKey: t, endpoint: p }),
        i = await n,
        { requestId: o } = await i.get({ linkedId: e });
      ((t) => {
        const e = { value: t, expiry: new Date().getTime() + 864e5 };
        localStorage.setItem('fp', JSON.stringify(e));
      })(w(e, o));
    } catch (t) {
      global.FB_DEBUG && console.error(t);
    }
  },
  h = (t) => (t.body && (t.body.fpData = f(!0) || w()), t),
  v = () => u('dls_last_user_login_id'),
  y = () => u('dls_last_user_display_name'),
  S =
    (t) =>
    async (...e) => {
      var n;
      e[1] = e[1] || {};
      const [, a = {}] = e,
        i = v(),
        o = y();
      i &&
        ((null !== (n = a.lastAuth) && void 0 !== n) || (a.lastAuth = {}),
        (a.lastAuth.loginId = i),
        (a.lastAuth.name = o));
      return await t(...e);
    },
  m =
    (t) =>
    async (...e) => {
      const n = await t(...e);
      return d('dls_last_user_login_id'), d('dls_last_user_display_name'), n;
    };
function O() {
  const t = [];
  return {
    pub: (e) => {
      t.forEach((t) => t(e));
    },
    sub: (e) => {
      const n = t.push(e) - 1;
      return () => t.splice(n, 1);
    },
  };
}
const I = (e = {}, n) => {
  var { refreshJwt: a, sessionJwt: o } = e,
    s = __rest(e, ['refreshJwt', 'sessionJwt']);
  void 0 === n && (n = !1),
    a && c('DSR', a),
    o &&
      (n
        ? (function (
            t,
            e,
            { cookiePath: n, cookieDomain: a, cookieExpiration: o }
          ) {
            if (e) {
              const s = new Date(1e3 * o);
              api.set(t, e, {
                path: n,
                domain: a,
                expires: s,
                sameSite: 'Strict',
                secure: !0,
              });
            }
          })('DS', o, s)
        : c('DS', o));
};
function k() {
  return u('DSR') || '';
}
function _() {
  return api.get('DS') || u('DS') || '';
}
function j() {
  d('DSR'), d('DS'), api.remove('DS');
}
const D = (t) => Object.assign(t, { token: t.token || k() }),
  U =
    (t) =>
    async (...e) => {
      const n = await t(...e);
      return j(), n;
    };
async function A(t) {
  const e = (function (t) {
      var e;
      const n = JSON.parse(t);
      return (
        (n.publicKey.challenge = N(n.publicKey.challenge)),
        (n.publicKey.user.id = N(n.publicKey.user.id)),
        null === (e = n.publicKey.excludeCredentials) ||
          void 0 === e ||
          e.forEach((t) => {
            t.id = N(t.id);
          }),
        n
      );
    })(t),
    n = await navigator.credentials.create(e);
  return (
    (a = n),
    JSON.stringify({
      id: a.id,
      rawId: x(a.rawId),
      type: a.type,
      response: {
        attestationObject: x(a.response.attestationObject),
        clientDataJSON: x(a.response.clientDataJSON),
      },
    })
  );
  var a;
}
async function J(t) {
  const e = R(t);
  return C(await navigator.credentials.get(e));
}
async function T(t, e) {
  const n = R(t);
  (n.signal = e.signal), (n.mediation = 'conditional');
  return C(await navigator.credentials.get(n));
}
async function K(t = !1) {
  if (!g) return Promise.resolve(!1);
  const e = !!(
    PublicKeyCredential &&
    navigator.credentials &&
    navigator.credentials.create &&
    navigator.credentials.get
  );
  return e &&
    t &&
    PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable
    ? PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
    : e;
}
function R(t) {
  var e;
  const n = JSON.parse(t);
  return (
    (n.publicKey.challenge = N(n.publicKey.challenge)),
    null === (e = n.publicKey.allowCredentials) ||
      void 0 === e ||
      e.forEach((t) => {
        t.id = N(t.id);
      }),
    n
  );
}
function C(t) {
  return JSON.stringify({
    id: t.id,
    rawId: x(t.rawId),
    type: t.type,
    response: {
      authenticatorData: x(t.response.authenticatorData),
      clientDataJSON: x(t.response.clientDataJSON),
      signature: x(t.response.signature),
      userHandle: t.response.userHandle ? x(t.response.userHandle) : void 0,
    },
  });
}
function N(t) {
  const e = t.replace(/_/g, '/').replace(/-/g, '+');
  return Uint8Array.from(atob(e), (t) => t.charCodeAt(0)).buffer;
}
function x(t) {
  return btoa(String.fromCharCode.apply(null, new Uint8Array(t)))
    .replace(/\//g, '_')
    .replace(/\+/g, '-')
    .replace(/=/g, '');
}
var q,
  P =
    ((q = (t) => ({
      async signUp(e, n) {
        const a = await t.webauthn.signUp.start(e, window.location.origin, n);
        if (!a.ok) return a;
        const i = await A(a.data.options);
        return await t.webauthn.signUp.finish(a.data.transactionId, i);
      },
      async signIn(e) {
        const n = await t.webauthn.signIn.start(e, window.location.origin);
        if (!n.ok) return n;
        const a = await J(n.data.options);
        return await t.webauthn.signIn.finish(n.data.transactionId, a);
      },
      async signUpOrIn(e) {
        var n;
        const a = await t.webauthn.signUpOrIn.start(e, window.location.origin);
        if (!a.ok) return a;
        if (null === (n = a.data) || void 0 === n ? void 0 : n.create) {
          const e = await A(a.data.options);
          return await t.webauthn.signUp.finish(a.data.transactionId, e);
        }
        {
          const e = await J(a.data.options);
          return await t.webauthn.signIn.finish(a.data.transactionId, e);
        }
      },
      async update(e, n) {
        const a = await t.webauthn.update.start(e, window.location.origin, n);
        if (!a.ok) return a;
        const i = await A(a.data.options);
        return await t.webauthn.update.finish(a.data.transactionId, i);
      },
      helpers: { create: A, get: J, isSupported: K, conditional: T },
    })),
    (...t) => {
      const e = q(...t);
      return (
        Object.assign(e.signUp, t[0].webauthn.signUp),
        Object.assign(e.signIn, t[0].webauthn.signIn),
        Object.assign(e.signUpOrIn, t[0].webauthn.signUpOrIn),
        Object.assign(e.update, t[0].webauthn.update),
        e
      );
    }),
  E = (t) =>
    Object.assign(Object.assign({}, t.flow), {
      start: async (...e) => {
        const n = await K(),
          a = Object.assign(
            Object.assign({ redirectUrl: window.location.href }, e[1]),
            { deviceInfo: { webAuthnSupport: n } }
          );
        return (e[1] = a), t.flow.start(...e);
      },
    });
const H = (function (...t) {
  return (e) => t.reduce((t, e) => e(t), e);
})(
  (e) => (n) => {
    var { fpKey: a, fpLoad: i } = n,
      s = __rest(n, ['fpKey', 'fpLoad']);
    return a
      ? (g
          ? i && b(a).catch(() => null)
          : console.warn(
              'Fingerprint is a client side only capability and will not work when running in the server'
            ),
        e(o(s, { beforeRequest: h })))
      : e(Object.assign({}, s));
  },
  (e) => (a) => {
    var i = __rest(a, ['autoRefresh']);
    const { clearAllTimers: r, setTimer: l } = (() => {
        const t = [];
        return {
          clearAllTimers: () => {
            for (; t.length; ) clearTimeout(t.pop());
          },
          setTimer: (e, n) => {
            t.push(setTimeout(e, n));
          },
        };
      })(),
      c = e(
        o(i, {
          afterRequest: async (t, e) => {
            const { refreshJwt: n, sessionJwt: a } = await s(e);
            if (401 === (null == e ? void 0 : e.status)) r();
            else if (a) {
              const t =
                ((i = ((t) => {
                  const e = t.split('.');
                  try {
                    if (3 === e.length) {
                      const t = JSON.parse(window.atob(e[1]));
                      if (t.exp) return new Date(1e3 * t.exp);
                    }
                  } catch (t) {}
                  return null;
                })(a))
                  ? i.getTime() - new Date().getTime()
                  : 0) - 2e4;
              r(), l(() => c.refresh(n), t);
            }
            var i;
          },
        })
      );
    return _e(c, ['logout', 'logoutAll'], (t) => async (...e) => {
      const n = await t(...e);
      return r(), n;
    });
  },
  (t) => (e) =>
    t(
      Object.assign(Object.assign({}, e), {
        baseHeaders: Object.assign(
          { 'x-descope-sdk-name': 'web-js', 'x-descope-sdk-version': '1.0.0' },
          e.baseHeaders
        ),
      })
    ),
  (t) => (e) => {
    const a = O(),
      i = O(),
      l = t(
        o(e, {
          afterRequest: async (t, e) => {
            if (401 === (null == e ? void 0 : e.status))
              a.pub(null), i.pub(null);
            else {
              const t = await r(e);
              t && i.pub(t);
              const { sessionJwt: n } = await s(e);
              n && a.pub(n);
            }
          },
        })
      ),
      c = _e(l, ['logout', 'logoutAll'], (t) => async (...e) => {
        const n = await t(...e);
        return a.pub(null), i.pub(null), n;
      });
    return Object.assign(c, {
      onSessionTokenChange: a.sub,
      onUserChange: i.sub,
    });
  },
  (t) => (e) => {
    const a = t(
      o(e, {
        afterRequest: async (t, e) => {
          var n;
          const a = await r(e),
            i =
              null === (n = null == a ? void 0 : a.loginIds) || void 0 === n
                ? void 0
                : n[0],
            o = null == a ? void 0 : a.name;
          i &&
            (((t) => {
              c('dls_last_user_login_id', t);
            })(i),
            ((t) => {
              c('dls_last_user_display_name', t);
            })(o));
        },
      })
    );
    let i = _e(a, ['flow.start'], S);
    return (
      (i = _e(i, ['logout', 'logoutAll'], m)),
      Object.assign(i, { getLastUserLoginId: v, getLastUserDisplayName: y })
    );
  },
  (e) => (a) => {
    var { persistTokens: i, sessionTokenViaCookie: r } = a,
      l = __rest(a, ['persistTokens', 'sessionTokenViaCookie']);
    if (!i || !g)
      return (
        i &&
          console.warn(
            'Storing auth tokens in local storage and cookies are a client side only capabilities and will not be done when running in the server'
          ),
        e(l)
      );
    const c = e(
        o(l, {
          beforeRequest: D,
          afterRequest: async (t, e) => {
            401 === (null == e ? void 0 : e.status) ? j() : I(await s(e), r);
          },
        })
      ),
      u = _e(c, ['logout', 'logoutAll'], U);
    return Object.assign(u, { getRefreshToken: k, getSessionToken: _ });
  }
)((...t) => {
  const n = Ze(...t);
  return Object.assign(Object.assign({}, n), { flow: E(n), webauthn: P(n) });
});

const initTemplate = document.createElement('template');
initTemplate.innerHTML = `
	<style>
		:host {
			width: 100%;
			height: 100%;
		}
		
		#wc-root {
			height: 100%;
			transition: opacity 300ms ease-in-out;
		}

		#wc-root[data-theme] {
			background-color: transparent;
		}

		.fade-out {
			opacity: 0.1;
		}

	</style>
	<div id="wc-root"></div>
	`;

var _BaseDescopeWc_instances,
  _BaseDescopeWc_init,
  _BaseDescopeWc_flowState,
  _BaseDescopeWc_debugState,
  _BaseDescopeWc_debuggerEle,
  _BaseDescopeWc_eventsCbRefs,
  _BaseDescopeWc_updateExecState,
  _BaseDescopeWc_initShadowDom,
  _BaseDescopeWc_shouldMountInFormEle,
  _BaseDescopeWc_handleOuterForm,
  _BaseDescopeWc_validateAttrs,
  _BaseDescopeWc_syncStateIdFromUrl,
  _BaseDescopeWc_createSdk,
  _BaseDescopeWc_onFlowChange,
  _BaseDescopeWc_getConfig,
  _BaseDescopeWc_loadFonts,
  _BaseDescopeWc_handleTheme,
  _BaseDescopeWc_loadTheme,
  _BaseDescopeWc_applyTheme,
  _BaseDescopeWc_disableDebugger,
  _BaseDescopeWc_handleDebugMode,
  _BaseDescopeWc_updateDebuggerMessages,
  _BaseDescopeWc_handleKeyPress;
// this base class is responsible for WC initialization
class BaseDescopeWc extends HTMLElement {
  constructor(updateExecState) {
    super();
    _BaseDescopeWc_instances.add(this);
    _BaseDescopeWc_init.set(this, false);
    _BaseDescopeWc_flowState.set(this, new State());
    _BaseDescopeWc_debugState.set(this, new State());
    this.nextRequestStatus = new State({ isLoading: false });
    _BaseDescopeWc_debuggerEle.set(this, void 0);
    _BaseDescopeWc_eventsCbRefs.set(this, {
      popstate: __classPrivateFieldGet(
        this,
        _BaseDescopeWc_instances,
        'm',
        _BaseDescopeWc_syncStateIdFromUrl
      ).bind(this),
    });
    _BaseDescopeWc_updateExecState.set(this, void 0);
    // we want to get the config only if we don't have it already
    _BaseDescopeWc_getConfig.set(
      this,
      withMemCache(() =>
        __awaiter(this, void 0, void 0, function* () {
          const configUrl = getContentUrl(this.projectId, CONFIG_FILENAME);
          try {
            const { body, headers } = yield fetchContent(configUrl, 'json');
            return {
              projectConfig: body,
              executionContext: { geo: headers['x-geo'] },
            };
          } catch (e) {
            this.logger.error(
              'Cannot get config file',
              'make sure that your projectId & flowId are correct'
            );
          }
          return undefined;
        })
      )
    );
    this.logger = {
      error: (message, description = '') => {
        // eslint-disable-next-line no-console
        console.error(message, description, new Error());
        __classPrivateFieldGet(
          this,
          _BaseDescopeWc_instances,
          'm',
          _BaseDescopeWc_updateDebuggerMessages
        ).call(this, message, description);
      },
      info: (message, description = '') => {
        // eslint-disable-next-line no-console
        console.log(message, description);
      },
    };
    __classPrivateFieldSet(
      this,
      _BaseDescopeWc_updateExecState,
      updateExecState,
      'f'
    );
    __classPrivateFieldGet(
      this,
      _BaseDescopeWc_instances,
      'm',
      _BaseDescopeWc_initShadowDom
    ).call(this);
  }
  static get observedAttributes() {
    return [
      'project-id',
      'flow-id',
      'base-url',
      'tenant',
      'theme',
      'debug',
      'telemetryKey',
      'redirect-url',
      'auto-focus',
    ];
  }
  get projectId() {
    return this.getAttribute('project-id');
  }
  get flowId() {
    return this.getAttribute('flow-id');
  }
  get baseUrl() {
    return this.getAttribute('base-url') || undefined;
  }
  get tenant() {
    return this.getAttribute('tenant') || undefined;
  }
  get redirectUrl() {
    return this.getAttribute('redirect-url') || undefined;
  }
  get debug() {
    return this.getAttribute('debug') === 'true';
  }
  get theme() {
    var _a, _b;
    const theme = this.getAttribute('theme');
    if (theme === 'os') {
      const isOsDark =
        window.matchMedia &&
        ((_b =
          (_a = window.matchMedia) === null || _a === void 0
            ? void 0
            : _a.call(window, '(prefers-color-scheme: dark)')) === null ||
        _b === void 0
          ? void 0
          : _b.matches);
      return isOsDark ? 'dark' : 'light';
    }
    return theme || 'light';
  }
  get telemetryKey() {
    return this.getAttribute('telemetryKey') || undefined;
  }
  get autoFocus() {
    var _a;
    const res =
      (_a = this.getAttribute('auto-focus')) !== null && _a !== void 0
        ? _a
        : 'true';
    if (res === 'skipFirstScreen') {
      return res;
    }
    return res === 'true';
  }
  getExecutionContext() {
    return __awaiter(this, void 0, void 0, function* () {
      const { executionContext } = yield __classPrivateFieldGet(
        this,
        _BaseDescopeWc_getConfig,
        'f'
      ).call(this);
      return executionContext;
    });
  }
  getFlowConfig() {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
      const { projectConfig } = yield __classPrivateFieldGet(
        this,
        _BaseDescopeWc_getConfig,
        'f'
      ).call(this);
      return (
        ((_a =
          projectConfig === null || projectConfig === void 0
            ? void 0
            : projectConfig.flows) === null || _a === void 0
          ? void 0
          : _a[this.flowId]) || {}
      );
    });
  }
  connectedCallback() {
    return __awaiter(this, void 0, void 0, function* () {
      if (this.shadowRoot.isConnected) {
        if (
          __classPrivateFieldGet(
            this,
            _BaseDescopeWc_instances,
            'm',
            _BaseDescopeWc_shouldMountInFormEle
          ).call(this)
        ) {
          __classPrivateFieldGet(
            this,
            _BaseDescopeWc_instances,
            'm',
            _BaseDescopeWc_handleOuterForm
          ).call(this);
          return;
        }
        __classPrivateFieldGet(
          this,
          _BaseDescopeWc_instances,
          'm',
          _BaseDescopeWc_validateAttrs
        ).call(this);
        __classPrivateFieldGet(
          this,
          _BaseDescopeWc_instances,
          'm',
          _BaseDescopeWc_handleTheme
        ).call(this);
        __classPrivateFieldGet(
          this,
          _BaseDescopeWc_instances,
          'm',
          _BaseDescopeWc_loadFonts
        ).call(this);
        __classPrivateFieldGet(
          this,
          _BaseDescopeWc_instances,
          'm',
          _BaseDescopeWc_handleKeyPress
        ).call(this);
        const { executionId, stepId, token, code, exchangeError } =
          handleUrlParams();
        // we want to update the state when user clicks on back in the browser
        window.addEventListener(
          'popstate',
          __classPrivateFieldGet(this, _BaseDescopeWc_eventsCbRefs, 'f')
            .popstate
        );
        __classPrivateFieldGet(this, _BaseDescopeWc_flowState, 'f').subscribe(
          __classPrivateFieldGet(
            this,
            _BaseDescopeWc_instances,
            'm',
            _BaseDescopeWc_onFlowChange
          ).bind(this)
        );
        __classPrivateFieldGet(this, _BaseDescopeWc_debugState, 'f').subscribe(
          __classPrivateFieldGet(
            this,
            _BaseDescopeWc_instances,
            'm',
            _BaseDescopeWc_handleDebugMode
          ).bind(this)
        );
        __classPrivateFieldGet(this, _BaseDescopeWc_flowState, 'f').update({
          projectId: this.projectId,
          flowId: this.flowId,
          baseUrl: this.baseUrl,
          tenant: this.tenant,
          redirectUrl: this.redirectUrl,
          stepId,
          executionId,
          token,
          code,
          exchangeError,
          telemetryKey: this.telemetryKey,
        });
        __classPrivateFieldGet(this, _BaseDescopeWc_debugState, 'f').update({
          isDebug: this.debug,
        });
        __classPrivateFieldSet(this, _BaseDescopeWc_init, true, 'f');
      }
    });
  }
  disconnectedCallback() {
    __classPrivateFieldGet(
      this,
      _BaseDescopeWc_flowState,
      'f'
    ).unsubscribeAll();
    __classPrivateFieldGet(
      this,
      _BaseDescopeWc_debugState,
      'f'
    ).unsubscribeAll();
    __classPrivateFieldGet(
      this,
      _BaseDescopeWc_instances,
      'm',
      _BaseDescopeWc_disableDebugger
    ).call(this);
    window.removeEventListener(
      'popstate',
      __classPrivateFieldGet(this, _BaseDescopeWc_eventsCbRefs, 'f').popstate
    );
  }
  attributeChangedCallback(attrName, oldValue, newValue) {
    if (
      !this.shadowRoot.isConnected ||
      !__classPrivateFieldGet(this, _BaseDescopeWc_init, 'f')
    )
      return;
    if (
      oldValue !== newValue &&
      BaseDescopeWc.observedAttributes.includes(attrName)
    ) {
      __classPrivateFieldGet(
        this,
        _BaseDescopeWc_instances,
        'm',
        _BaseDescopeWc_validateAttrs
      ).call(this);
      const isInitialRun = oldValue === null;
      __classPrivateFieldGet(this, _BaseDescopeWc_flowState, 'f').update(
        ({ stepId, executionId }) => {
          let newStepId = stepId;
          let newExecutionId = executionId;
          // If not initial run and we got a new project/flow, we want to restart the step
          if (!isInitialRun) {
            newExecutionId = null;
            newStepId = null;
            clearRunIdsFromUrl();
          }
          return {
            [camelCase(attrName)]: newValue,
            stepId: newStepId,
            executionId: newExecutionId,
          };
        }
      );
      __classPrivateFieldGet(this, _BaseDescopeWc_debugState, 'f').update({
        isDebug: this.debug,
      });
    }
  }
}
(_BaseDescopeWc_init = new WeakMap()),
  (_BaseDescopeWc_flowState = new WeakMap()),
  (_BaseDescopeWc_debugState = new WeakMap()),
  (_BaseDescopeWc_debuggerEle = new WeakMap()),
  (_BaseDescopeWc_eventsCbRefs = new WeakMap()),
  (_BaseDescopeWc_updateExecState = new WeakMap()),
  (_BaseDescopeWc_getConfig = new WeakMap()),
  (_BaseDescopeWc_instances = new WeakSet()),
  (_BaseDescopeWc_initShadowDom = function _BaseDescopeWc_initShadowDom() {
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(initTemplate.content.cloneNode(true));
    this.rootElement = this.shadowRoot.querySelector('#wc-root');
  }),
  (_BaseDescopeWc_shouldMountInFormEle =
    function _BaseDescopeWc_shouldMountInFormEle() {
      const isChrome =
        /Chrome/.test(navigator.userAgent) &&
        /Google Inc/.test(navigator.vendor);
      const wc = this.shadowRoot.host;
      return !wc.closest('form') && isChrome;
    }),
  (_BaseDescopeWc_handleOuterForm = function _BaseDescopeWc_handleOuterForm() {
    const wc = this.shadowRoot.host;
    const form = document.createElement('form');
    wc.parentElement.appendChild(form);
    form.appendChild(wc);
  }),
  (_BaseDescopeWc_validateAttrs = function _BaseDescopeWc_validateAttrs() {
    const optionalAttributes = [
      'base-url',
      'tenant',
      'theme',
      'debug',
      'telemetryKey',
      'redirect-url',
      'auto-focus',
    ];
    BaseDescopeWc.observedAttributes.forEach((attr) => {
      if (!optionalAttributes.includes(attr) && !this[camelCase(attr)])
        throw Error(`${attr} cannot be empty`);
    });
    if (this.theme && this.theme !== 'light' && this.theme !== 'dark') {
      throw Error(
        'Supported theme values are "light", "dark", or leave empty for using the OS theme'
      );
    }
  }),
  (_BaseDescopeWc_syncStateIdFromUrl =
    function _BaseDescopeWc_syncStateIdFromUrl() {
      const { stepId, executionId } = getRunIdsFromUrl();
      __classPrivateFieldGet(this, _BaseDescopeWc_flowState, 'f').update({
        stepId,
        executionId,
      });
    }),
  (_BaseDescopeWc_createSdk = function _BaseDescopeWc_createSdk(
    projectId,
    baseUrl,
    telemetryKey
  ) {
    const fpKey = telemetryKey || undefined;
    const fpLoad = !!fpKey;
    this.sdk = H(
      Object.assign(Object.assign({}, BaseDescopeWc.sdkConfigOverrides), {
        projectId,
        baseUrl,
        fpKey,
        fpLoad,
        // Use persist tokens options in order to add existing tokens in outgoing requests (if they exists)
        persistTokens: true,
      })
    );
    // we are wrapping the next & start function so we can indicate the request status
    ['start', 'next'].forEach((key) => {
      const origFn = this.sdk.flow[key];
      this.sdk.flow[key] = (...args) =>
        __awaiter(this, void 0, void 0, function* () {
          this.nextRequestStatus.update({ isLoading: true });
          try {
            const resp = yield origFn(...args);
            return resp;
          } finally {
            this.nextRequestStatus.update({ isLoading: false });
          }
        });
    });
  }),
  (_BaseDescopeWc_onFlowChange = function _BaseDescopeWc_onFlowChange(
    currentState,
    _prevState,
    isChanged
  ) {
    return __awaiter(this, void 0, void 0, function* () {
      const { projectId, baseUrl, telemetryKey } = currentState;
      const shouldCreateSdkInstance =
        isChanged('projectId') ||
        isChanged('baseUrl') ||
        isChanged('telemetryKey');
      if (shouldCreateSdkInstance) {
        if (!projectId) return;
        // Initialize the sdk when got a new project id
        __classPrivateFieldGet(
          this,
          _BaseDescopeWc_instances,
          'm',
          _BaseDescopeWc_createSdk
        ).call(this, projectId, baseUrl, telemetryKey);
      }
      // update runtime state
      __classPrivateFieldGet(this, _BaseDescopeWc_updateExecState, 'f').call(
        this,
        currentState
      );
    });
  }),
  (_BaseDescopeWc_loadFonts = function _BaseDescopeWc_loadFonts() {
    var _a, _b, _c, _d;
    return __awaiter(this, void 0, void 0, function* () {
      const { projectConfig } = yield __classPrivateFieldGet(
        this,
        _BaseDescopeWc_getConfig,
        'f'
      ).call(this);
      (_d =
        (_c =
          (_b =
            (_a =
              projectConfig === null || projectConfig === void 0
                ? void 0
                : projectConfig.cssTemplate) === null || _a === void 0
              ? void 0
              : _a[this.theme]) === null || _b === void 0
            ? void 0
            : _b.typography) === null || _c === void 0
          ? void 0
          : _c.fontFamilies) === null || _d === void 0
        ? void 0
        : _d.forEach((font) => loadFont(font.url));
    });
  }),
  (_BaseDescopeWc_handleTheme = function _BaseDescopeWc_handleTheme() {
    __classPrivateFieldGet(
      this,
      _BaseDescopeWc_instances,
      'm',
      _BaseDescopeWc_loadTheme
    ).call(this);
    __classPrivateFieldGet(
      this,
      _BaseDescopeWc_instances,
      'm',
      _BaseDescopeWc_applyTheme
    ).call(this);
  }),
  (_BaseDescopeWc_loadTheme = function _BaseDescopeWc_loadTheme() {
    return __awaiter(this, void 0, void 0, function* () {
      const styleEle = document.createElement('style');
      const themeUrl = getContentUrl(this.projectId, THEME_FILENAME);
      try {
        const { body } = yield fetchContent(themeUrl, 'text');
        styleEle.innerText = body;
      } catch (e) {
        this.logger.error(
          'Cannot fetch theme file',
          'make sure that your projectId & flowId are correct'
        );
      }
      this.shadowRoot.appendChild(styleEle);
    });
  }),
  (_BaseDescopeWc_applyTheme = function _BaseDescopeWc_applyTheme() {
    this.rootElement.setAttribute('data-theme', this.theme);
  }),
  (_BaseDescopeWc_disableDebugger = function _BaseDescopeWc_disableDebugger() {
    var _a;
    (_a = __classPrivateFieldGet(this, _BaseDescopeWc_debuggerEle, 'f')) ===
      null || _a === void 0
      ? void 0
      : _a.remove();
    __classPrivateFieldSet(this, _BaseDescopeWc_debuggerEle, null, 'f');
  }),
  (_BaseDescopeWc_handleDebugMode = function _BaseDescopeWc_handleDebugMode({
    isDebug,
  }) {
    return __awaiter(this, void 0, void 0, function* () {
      if (isDebug) {
        // we are importing the debugger dynamically so we won't load it when it's not needed
        yield import('./debugger-wc-c0e89065.js');
        __classPrivateFieldSet(
          this,
          _BaseDescopeWc_debuggerEle,
          document.createElement('descope-debugger'),
          'f'
        );
        Object.assign(
          __classPrivateFieldGet(this, _BaseDescopeWc_debuggerEle, 'f').style,
          {
            position: 'fixed',
            top: '0',
            right: '0',
            height: '100vh',
            width: '100vw',
            pointerEvents: 'none',
            zIndex: 99999,
          }
        );
        document.body.appendChild(
          __classPrivateFieldGet(this, _BaseDescopeWc_debuggerEle, 'f')
        );
      } else {
        __classPrivateFieldGet(
          this,
          _BaseDescopeWc_instances,
          'm',
          _BaseDescopeWc_disableDebugger
        ).call(this);
      }
    });
  }),
  (_BaseDescopeWc_updateDebuggerMessages =
    function _BaseDescopeWc_updateDebuggerMessages(title, description) {
      var _a;
      if (title && this.debug)
        (_a = __classPrivateFieldGet(this, _BaseDescopeWc_debuggerEle, 'f')) ===
          null || _a === void 0
          ? void 0
          : _a.updateData({ title, description });
    }),
  (_BaseDescopeWc_handleKeyPress = function _BaseDescopeWc_handleKeyPress() {
    // we want to simulate submit when the user presses Enter
    this.rootElement.onkeydown = (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const buttons = this.rootElement.querySelectorAll('button');
      // in case there is a single button on the page, click on it
      if (buttons.length === 1) {
        buttons[0].click();
        return;
      }
      const genericButtons = Array.from(buttons).filter(
        (button) => button.getAttribute('data-type') === 'button'
      );
      // in case there is a single "generic" button on the page, click on it
      if (genericButtons.length === 1) {
        genericButtons[0].click();
      }
    };
  });
// this is a way for extending the sdk config from outside
BaseDescopeWc.sdkConfigOverrides = {
  baseHeaders: {
    'x-descope-sdk-name': 'web-component',
    'x-descope-sdk-version': '2.0.1',
  },
};

var _DescopeWc_instances,
  _DescopeWc_currentInterval,
  _DescopeWc_conditionalUiAbortController,
  _DescopeWc_resetCurrentInterval,
  _DescopeWc_handleSdkResponse,
  _DescopeWc_getWebauthnConditionalUiStartParams,
  _DescopeWc_handleConditionalUiInput,
  _DescopeWc_handleWebauthnConditionalUi,
  _DescopeWc_validateInputs,
  _DescopeWc_getFormData,
  _DescopeWc_handleSubmitButtonLoader,
  _DescopeWc_handleSubmit,
  _DescopeWc_hydrate,
  _DescopeWc_handleAnimation,
  _DescopeWc_dispatch;
// this class is responsible for WC flow execution
class DescopeWc extends BaseDescopeWc {
  constructor() {
    const flowState = new State();
    super(flowState.update.bind(flowState));
    _DescopeWc_instances.add(this);
    this.stepState = new State({}, { updateOnlyOnChange: false });
    _DescopeWc_currentInterval.set(this, void 0);
    _DescopeWc_conditionalUiAbortController.set(this, null);
    _DescopeWc_resetCurrentInterval.set(this, () => {
      clearInterval(
        __classPrivateFieldGet(this, _DescopeWc_currentInterval, 'f')
      );
      __classPrivateFieldSet(this, _DescopeWc_currentInterval, null, 'f');
    });
    _DescopeWc_handleSdkResponse.set(this, (sdkResp) => {
      var _a, _b, _c, _d, _e, _f, _g, _h, _j;
      if (!(sdkResp === null || sdkResp === void 0 ? void 0 : sdkResp.ok)) {
        __classPrivateFieldGet(this, _DescopeWc_resetCurrentInterval, 'f').call(
          this
        );
        __classPrivateFieldGet(
          this,
          _DescopeWc_instances,
          'm',
          _DescopeWc_dispatch
        ).call(
          this,
          'error',
          sdkResp === null || sdkResp === void 0 ? void 0 : sdkResp.error
        );
        const defaultMessage =
          (_a =
            sdkResp === null || sdkResp === void 0
              ? void 0
              : sdkResp.response) === null || _a === void 0
            ? void 0
            : _a.url;
        const defaultDescription = `${
          (_b =
            sdkResp === null || sdkResp === void 0
              ? void 0
              : sdkResp.response) === null || _b === void 0
            ? void 0
            : _b.status
        } - ${
          (_c =
            sdkResp === null || sdkResp === void 0
              ? void 0
              : sdkResp.response) === null || _c === void 0
            ? void 0
            : _c.statusText
        }`;
        this.logger.error(
          ((_d =
            sdkResp === null || sdkResp === void 0 ? void 0 : sdkResp.error) ===
            null || _d === void 0
            ? void 0
            : _d.errorDescription) || defaultMessage,
          ((_e =
            sdkResp === null || sdkResp === void 0 ? void 0 : sdkResp.error) ===
            null || _e === void 0
            ? void 0
            : _e.errorMessage) || defaultDescription
        );
        return;
      }
      const errorText =
        (_h =
          (_g =
            (_f = sdkResp.data) === null || _f === void 0
              ? void 0
              : _f.screen) === null || _g === void 0
            ? void 0
            : _g.state) === null || _h === void 0
          ? void 0
          : _h.errorText;
      if (errorText) {
        this.logger.error(errorText);
      }
      if ((_j = sdkResp.data) === null || _j === void 0 ? void 0 : _j.error) {
        this.logger.error(
          `[${sdkResp.data.error.code}]: ${sdkResp.data.error.description}`,
          sdkResp.data.error.message
        );
      }
      const { status, authInfo, lastAuth } = sdkResp.data;
      if (status === 'completed') {
        setLastAuth(lastAuth);
        __classPrivateFieldGet(this, _DescopeWc_resetCurrentInterval, 'f').call(
          this
        );
        __classPrivateFieldGet(
          this,
          _DescopeWc_instances,
          'm',
          _DescopeWc_dispatch
        ).call(this, 'success', authInfo);
        return;
      }
      const { executionId, stepId, action, screen, redirect, webauthn } =
        sdkResp.data;
      if (action === RESPONSE_ACTIONS.poll) {
        // We only update action because the polling response action does not return extra information
        this.flowState.update({
          action,
        });
        return;
      }
      this.flowState.update({
        stepId,
        executionId,
        action,
        redirectTo:
          redirect === null || redirect === void 0 ? void 0 : redirect.url,
        screenId: screen === null || screen === void 0 ? void 0 : screen.id,
        screenState:
          screen === null || screen === void 0 ? void 0 : screen.state,
        webauthnTransactionId:
          webauthn === null || webauthn === void 0
            ? void 0
            : webauthn.transactionId,
        webauthnOptions:
          webauthn === null || webauthn === void 0 ? void 0 : webauthn.options,
      });
    });
    // we want to get the start params only if we don't have it already
    _DescopeWc_getWebauthnConditionalUiStartParams.set(
      this,
      withMemCache(() =>
        __awaiter(this, void 0, void 0, function* () {
          var _a;
          try {
            const startResp = yield this.sdk.webauthn.signIn.start(
              '',
              window.location.origin
            ); // when using conditional UI we need to call start without identifier
            if (!startResp.ok) {
              this.logger.error(
                'Webauthn start failed',
                (_a =
                  startResp === null || startResp === void 0
                    ? void 0
                    : startResp.error) === null || _a === void 0
                  ? void 0
                  : _a.errorMessage
              );
            }
            return startResp.data;
          } catch (err) {
            this.logger.error('Webauthn start failed', err.message);
          }
          return undefined;
        })
      )
    );
    this.flowState = flowState;
  }
  static set sdkConfigOverrides(config) {
    BaseDescopeWc.sdkConfigOverrides = config;
  }
  connectedCallback() {
    const _super = Object.create(null, {
      connectedCallback: { get: () => super.connectedCallback },
    });
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
      if (this.shadowRoot.isConnected) {
        (_a = this.flowState) === null || _a === void 0
          ? void 0
          : _a.subscribe(this.onFlowChange.bind(this));
        (_b = this.stepState) === null || _b === void 0
          ? void 0
          : _b.subscribe(this.onStepChange.bind(this));
      }
      yield _super.connectedCallback.call(this);
    });
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.flowState.unsubscribeAll();
    this.stepState.unsubscribeAll();
  }
  onFlowChange(currentState, prevState, isChanged) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
      const {
        projectId,
        flowId,
        tenant,
        stepId,
        executionId,
        action,
        screenId,
        screenState,
        redirectTo,
        redirectUrl,
        token,
        code,
        exchangeError,
        webauthnTransactionId,
        webauthnOptions,
      } = currentState;
      if (__classPrivateFieldGet(this, _DescopeWc_currentInterval, 'f')) {
        __classPrivateFieldGet(this, _DescopeWc_resetCurrentInterval, 'f').call(
          this
        );
      }
      let startScreenId;
      let conditionInteractionId;
      const loginId = this.sdk.getLastUserLoginId();
      // if there is no execution id we should start a new flow
      if (!executionId) {
        if (!flowId) return;
        const flowConfig = yield this.getFlowConfig();
        ({ startScreenId = flowConfig.startScreenId, conditionInteractionId } =
          calculateCondition(flowConfig.condition, loginId));
        if (!startScreenId) {
          const sdkResp = yield this.sdk.flow.start(
            flowId,
            Object.assign({ tenant }, redirectUrl && { redirectUrl })
          );
          __classPrivateFieldGet(this, _DescopeWc_handleSdkResponse, 'f').call(
            this,
            sdkResp
          );
          return;
        }
      }
      // if there is a descope url param on the url its because the user clicked on email link or redirected back to the app
      // we should call next with the params
      if (
        (isChanged('token') && token) ||
        (isChanged('code') && code) ||
        (isChanged('exchangeError') && exchangeError)
      ) {
        const sdkResp = yield this.sdk.flow.next(
          executionId,
          stepId,
          CUSTOM_INTERACTIONS.submit,
          {
            token,
            exchangeCode: code,
            exchangeError,
          }
        );
        __classPrivateFieldGet(this, _DescopeWc_handleSdkResponse, 'f').call(
          this,
          sdkResp
        );
        this.flowState.update({
          token: undefined,
          code: undefined,
          exchangeError: undefined,
        }); // should happen after handleSdkResponse, otherwise we will not have screen id on the next run
        return;
      }
      if (action === RESPONSE_ACTIONS.redirect) {
        if (!redirectTo) {
          this.logger.error('Did not get redirect url');
        }
        window.location.assign(redirectTo);
        return;
      }
      if (
        action === RESPONSE_ACTIONS.webauthnCreate ||
        action === RESPONSE_ACTIONS.webauthnGet
      ) {
        if (!webauthnTransactionId || !webauthnOptions) {
          this.logger.error('Did not get webauthn transaction id or options');
          return;
        }
        (_a = __classPrivateFieldGet(
          this,
          _DescopeWc_conditionalUiAbortController,
          'f'
        )) === null || _a === void 0
          ? void 0
          : _a.abort();
        __classPrivateFieldSet(
          this,
          _DescopeWc_conditionalUiAbortController,
          null,
          'f'
        );
        let response;
        let cancelWebauthn;
        try {
          response =
            action === RESPONSE_ACTIONS.webauthnCreate
              ? yield this.sdk.webauthn.helpers.create(webauthnOptions)
              : yield this.sdk.webauthn.helpers.get(webauthnOptions);
        } catch (e) {
          if (e.name !== 'NotAllowedError') {
            this.logger.error(e.message);
            return;
          }
          cancelWebauthn = true;
        }
        // Call next with the response and transactionId
        const sdkResp = yield this.sdk.flow.next(
          executionId,
          stepId,
          CUSTOM_INTERACTIONS.submit,
          {
            transactionId: webauthnTransactionId,
            response,
            cancelWebauthn,
          }
        );
        __classPrivateFieldGet(this, _DescopeWc_handleSdkResponse, 'f').call(
          this,
          sdkResp
        );
      }
      if (action === RESPONSE_ACTIONS.poll) {
        __classPrivateFieldSet(
          this,
          _DescopeWc_currentInterval,
          setInterval(
            () =>
              __awaiter(this, void 0, void 0, function* () {
                const sdkResp = yield this.sdk.flow.next(
                  executionId,
                  stepId,
                  CUSTOM_INTERACTIONS.polling,
                  {}
                );
                __classPrivateFieldGet(
                  this,
                  _DescopeWc_handleSdkResponse,
                  'f'
                ).call(this, sdkResp);
              }),
            2000
          ),
          'f'
        );
      }
      // if there is no screen id (probably due to page refresh) we should get it from the server
      if (!screenId && !startScreenId) {
        this.logger.info(
          'Refreshing the page during a flow is not supported yet'
        );
        return;
      }
      // generate step state update data
      const stepStateUpdate = {
        direction: getAnimationDirection(+stepId, +prevState.stepId),
        screenState: Object.assign(Object.assign({}, screenState), {
          lastAuth: {
            loginId,
            name: this.sdk.getLastUserDisplayName() || loginId,
          },
        }),
        htmlUrl: getContentUrl(projectId, `${startScreenId || screenId}.html`),
      };
      const lastAuth = getLastAuth(loginId);
      if (startScreenId) {
        stepStateUpdate.next = (...args) =>
          this.sdk.flow.start(
            flowId,
            { tenant, lastAuth },
            conditionInteractionId,
            ...args
          );
      } else if (
        isChanged('projectId') ||
        isChanged('baseUrl') ||
        isChanged('executionId') ||
        isChanged('stepId')
      ) {
        stepStateUpdate.next = (...args) =>
          this.sdk.flow.next(executionId, stepId, ...args);
      }
      // update step state
      this.stepState.update(stepStateUpdate);
    });
  }
  onStepChange(currentState, prevState) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
      const { htmlUrl, direction, next, screenState } = currentState;
      const stepTemplate = document.createElement('template');
      const { body } = yield fetchContent(htmlUrl, 'text');
      stepTemplate.innerHTML = body;
      const clone = stepTemplate.content.cloneNode(true);
      const scriptFns = generateFnsFromScriptTags(
        clone,
        yield this.getExecutionContext()
      );
      // we want to disable the webauthn buttons if it's not supported on the browser
      if (!this.sdk.webauthn.helpers.isSupported()) {
        disableWebauthnButtons(clone);
      } else {
        yield __classPrivateFieldGet(
          this,
          _DescopeWc_instances,
          'm',
          _DescopeWc_handleWebauthnConditionalUi
        ).call(this, clone, next);
      }
      replaceWithScreenState(clone, screenState);
      // put the totp variable on the root element, which is the top level 'div'
      setTOTPVariable(
        clone.querySelector('div'),
        (_a =
          screenState === null || screenState === void 0
            ? void 0
            : screenState.totp) === null || _a === void 0
          ? void 0
          : _a.image
      );
      const injectNextPage = () =>
        __awaiter(this, void 0, void 0, function* () {
          try {
            scriptFns.forEach((fn) => {
              fn();
            });
          } catch (e) {
            this.logger.error(e.message);
          }
          this.rootElement.replaceChildren(clone);
          // If before html url was empty, we deduce its the first time a screen is shown
          const isFirstScreen = !prevState.htmlUrl;
          handleAutoFocus(this.rootElement, this.autoFocus, isFirstScreen);
          __classPrivateFieldGet(
            this,
            _DescopeWc_instances,
            'm',
            _DescopeWc_hydrate
          ).call(this, next);
          __classPrivateFieldGet(
            this,
            _DescopeWc_instances,
            'm',
            _DescopeWc_dispatch
          ).call(this, 'page-updated', {});
          const loader = this.rootElement.querySelector(
            `[${ELEMENT_TYPE_ATTRIBUTE}="polling"]`
          );
          if (loader) {
            // Loader component in the screen triggers polling interaction
            const response = yield next(CUSTOM_INTERACTIONS.polling, {});
            __classPrivateFieldGet(
              this,
              _DescopeWc_handleSdkResponse,
              'f'
            ).call(this, response);
          }
        });
      // no animation
      if (!direction) {
        injectNextPage();
        return;
      }
      __classPrivateFieldGet(
        this,
        _DescopeWc_instances,
        'm',
        _DescopeWc_handleAnimation
      ).call(this, injectNextPage, direction);
    });
  }
}
(_DescopeWc_currentInterval = new WeakMap()),
  (_DescopeWc_conditionalUiAbortController = new WeakMap()),
  (_DescopeWc_resetCurrentInterval = new WeakMap()),
  (_DescopeWc_handleSdkResponse = new WeakMap()),
  (_DescopeWc_getWebauthnConditionalUiStartParams = new WeakMap()),
  (_DescopeWc_instances = new WeakSet()),
  (_DescopeWc_handleConditionalUiInput =
    function _DescopeWc_handleConditionalUiInput(inputEle) {
      const ignoreList = ['email'];
      const origName = inputEle.name;
      if (!ignoreList.includes(origName)) {
        const conditionalUiSupportName = `user-${origName}`;
        // eslint-disable-next-line no-param-reassign
        inputEle.name = conditionalUiSupportName;
        inputEle.addEventListener('input', () => {
          // eslint-disable-next-line no-param-reassign
          inputEle.name = inputEle.value ? origName : conditionalUiSupportName;
        });
      }
    }),
  (_DescopeWc_handleWebauthnConditionalUi =
    function _DescopeWc_handleWebauthnConditionalUi(fragment, next) {
      var _a;
      return __awaiter(this, void 0, void 0, function* () {
        (_a = __classPrivateFieldGet(
          this,
          _DescopeWc_conditionalUiAbortController,
          'f'
        )) === null || _a === void 0
          ? void 0
          : _a.abort();
        const conditionalUiInput = fragment.querySelector(
          'input[autocomplete="webauthn"]'
        );
        if (conditionalUiInput && (yield isConditionalLoginSupported())) {
          const { options, transactionId } =
            (yield __classPrivateFieldGet(
              this,
              _DescopeWc_getWebauthnConditionalUiStartParams,
              'f'
            ).call(this)) || {};
          if (options && transactionId) {
            __classPrivateFieldGet(
              this,
              _DescopeWc_instances,
              'm',
              _DescopeWc_handleConditionalUiInput
            ).call(this, conditionalUiInput);
            // we need the abort controller so we can cancel the current webauthn session in case the user clicked on a webauthn button, and we need to start a new session
            __classPrivateFieldSet(
              this,
              _DescopeWc_conditionalUiAbortController,
              new AbortController(),
              'f'
            );
            // we should not wait for this fn, it will call next when the user uses his passkey on the input
            this.sdk.webauthn.helpers
              .conditional(
                options,
                __classPrivateFieldGet(
                  this,
                  _DescopeWc_conditionalUiAbortController,
                  'f'
                )
              )
              .then((response) =>
                __awaiter(this, void 0, void 0, function* () {
                  const resp = yield next(conditionalUiInput.id, {
                    transactionId,
                    response,
                  });
                  __classPrivateFieldGet(
                    this,
                    _DescopeWc_handleSdkResponse,
                    'f'
                  ).call(this, resp);
                })
              )
              .catch((err) => {
                if (err.name !== 'AbortError') {
                  this.logger.error('Conditional login failed', err.message);
                }
              });
          }
        }
      });
    }),
  (_DescopeWc_validateInputs = function _DescopeWc_validateInputs() {
    return Array.from(this.shadowRoot.querySelectorAll('.descope-input')).every(
      (input) => {
        input.reportValidity();
        return input.checkValidity();
      }
    );
  }),
  (_DescopeWc_getFormData = function _DescopeWc_getFormData() {
    return Array.from(
      this.shadowRoot.querySelectorAll(
        `*[name]:not([${DESCOPE_ATTRIBUTE_EXCLUDE_FIELD}])`
      )
    ).reduce(
      (acc, input) =>
        input.name ? Object.assign(acc, { [input.name]: input.value }) : acc,
      {}
    );
  }),
  (_DescopeWc_handleSubmitButtonLoader =
    function _DescopeWc_handleSubmitButtonLoader(submitter) {
      const unsubscribeNextRequestStatus = this.nextRequestStatus.subscribe(
        ({ isLoading }) => {
          var _a, _b;
          if (isLoading) {
            (_a =
              submitter === null || submitter === void 0
                ? void 0
                : submitter.classList) === null || _a === void 0
              ? void 0
              : _a.add('loading');
          } else {
            this.nextRequestStatus.unsubscribe(unsubscribeNextRequestStatus);
            (_b =
              submitter === null || submitter === void 0
                ? void 0
                : submitter.classList) === null || _b === void 0
              ? void 0
              : _b.remove('loading');
          }
        }
      );
    }),
  (_DescopeWc_handleSubmit = function _DescopeWc_handleSubmit(submitter, next) {
    return __awaiter(this, void 0, void 0, function* () {
      if (
        submitter.formNoValidate ||
        __classPrivateFieldGet(
          this,
          _DescopeWc_instances,
          'm',
          _DescopeWc_validateInputs
        ).call(this)
      ) {
        const submitterId =
          submitter === null || submitter === void 0
            ? void 0
            : submitter.getAttribute('id');
        __classPrivateFieldGet(
          this,
          _DescopeWc_instances,
          'm',
          _DescopeWc_handleSubmitButtonLoader
        ).call(this, submitter);
        const formData = __classPrivateFieldGet(
          this,
          _DescopeWc_instances,
          'm',
          _DescopeWc_getFormData
        ).call(this);
        const eleDescopeAttrs = getElementDescopeAttributes(submitter);
        const actionArgs = Object.assign(
          Object.assign(Object.assign({}, eleDescopeAttrs), formData),
          {
            // 'origin' is required to start webauthn. For now we'll add it to every request
            origin: window.location.origin,
          }
        );
        const sdkResp = yield next(submitterId, actionArgs);
        __classPrivateFieldGet(this, _DescopeWc_handleSdkResponse, 'f').call(
          this,
          sdkResp
        );
      }
    });
  }),
  (_DescopeWc_hydrate = function _DescopeWc_hydrate(next) {
    // hydrating the page
    this.rootElement.querySelectorAll('button').forEach((button) => {
      // eslint-disable-next-line no-param-reassign
      button.onclick = () => {
        __classPrivateFieldGet(
          this,
          _DescopeWc_instances,
          'm',
          _DescopeWc_handleSubmit
        ).call(this, button, next);
      };
    });
  }),
  (_DescopeWc_handleAnimation = function _DescopeWc_handleAnimation(
    injectNextPage,
    direction
  ) {
    this.rootElement.addEventListener(
      'transitionend',
      () => {
        this.rootElement.classList.remove('fade-out');
        injectNextPage();
      },
      { once: true }
    );
    const transitionClass =
      direction === Direction.forward ? 'slide-forward' : 'slide-backward';
    Array.from(
      this.rootElement.getElementsByClassName('input-container')
    ).forEach((ele, i) => {
      // eslint-disable-next-line no-param-reassign
      ele.style['transition-delay'] = `${i * 40}ms`;
      ele.classList.add(transitionClass);
    });
    this.rootElement.classList.add('fade-out');
  }),
  (_DescopeWc_dispatch = function _DescopeWc_dispatch(eventName, detail) {
    this.dispatchEvent(new CustomEvent(eventName, { detail }));
  });

customElements.define('descope-wc', DescopeWc);

export {
  DescopeWc as D,
  State as S,
  __classPrivateFieldGet as _,
  __classPrivateFieldSet as a,
};
//# sourceMappingURL=index-e76ada1f.js.map
