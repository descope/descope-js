import {
  VISITOR_REQUEST_ID_PARAM,
  VISITOR_SESSION_ID_PARAM,
} from './constants';

export type FingerprintOptions = {
  // FingerprintJS API key
  fpKey?: string;
  // If true, sdk object initialization will load FingerprintJS data into storage, for later usage
  fpLoad?: boolean;
};

export type FingerprintObject = {
  [VISITOR_SESSION_ID_PARAM]: string;
  [VISITOR_REQUEST_ID_PARAM]: string;
};
