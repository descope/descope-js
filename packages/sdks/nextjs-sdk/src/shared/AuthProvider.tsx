'use client';

import {
	AuthProvider as AuthProviderComp,
	baseHeaders
} from '@descope/react-sdk';
import React from 'react';
import { baseHeaders as nextBaseHeaders } from './constants';

// Override baseHeaders
Object.assign(baseHeaders, nextBaseHeaders);

const AuthProvider: typeof AuthProviderComp = ({ ...props }) => (
	// by default we use sessionTokenViaCookie, so middleware will work out of the box
	<AuthProviderComp sessionTokenViaCookie {...props} />
);

export default AuthProvider;
