'use strict';

var coreSdk = require('core-sdk');

function runWeb(x) {
    return "WEB [".concat(coreSdk.runCore(x), "]");
}

exports.runWeb = runWeb;
