// Required for node-js sdk dependency (jose)
import { TextEncoder, TextDecoder } from 'util';
Object.assign(global, { TextDecoder, TextEncoder });

// Mock fetch
require('jest-fetch-mock').enableMocks();
