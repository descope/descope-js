import '@testing-library/jest-dom';

const matchers = require('jest-extended');
expect.extend(matchers);

// react-router v7 needs TextEncoder, which jsdom does not provide
const { TextEncoder, TextDecoder } = require('util');

Object.assign(global, { TextEncoder, TextDecoder });
