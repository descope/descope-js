'use strict';

var jsxRuntime = require('react/jsx-runtime');
var webSdk = require('web-sdk');

const MyComponent = () => {
    return jsxRuntime.jsx(jsxRuntime.Fragment, { children: webSdk.runWeb("hey") });
};

exports.MyComponent = MyComponent;
