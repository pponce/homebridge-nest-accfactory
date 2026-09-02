// Authentication helpers
// Part of homebridge-nest-accfactory
'use strict';

import { Buffer } from 'node:buffer';
import { URLSearchParams } from 'node:url';

import { fetchWrapper } from './utils.js';

export const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
export const GOOGLE_NEST_CLIENT_ID = '733249279899-1gpkq9duqmdp55a7e5lft1pr2smumdla.apps.googleusercontent.com';
export const GOOGLE_NEST_FIELD_TEST_CLIENT_ID = '384529615266-57v6vaptkmhm64n9hn5dcmkr4at14p8j.apps.googleusercontent.com';

export function parseLegacyRefreshToken(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return undefined;
  }

  let trimmed = value.trim();

  // Some legacy tools exported the complete OAuth credential as JSON rather
  // than three separate configuration values. Accept either representation.
  if (trimmed.startsWith('{') === true) {
    try {
      let parsed = JSON.parse(trimmed);

      return {
        refreshToken: String(parsed.refreshToken ?? parsed.refresh_token ?? '').trim(),
        clientId: String(parsed.clientId ?? parsed.client_id ?? '').trim(),
        clientSecret: String(parsed.clientSecret ?? parsed.client_secret ?? '').trim(),
      };
    } catch {
      return undefined;
    }
  }

  return { refreshToken: trimmed };
}

export async function exchangeGoogleRefreshToken(credentials, request = fetchWrapper) {
  let parsed = parseLegacyRefreshToken(credentials?.refreshToken);
  let refreshToken = parsed?.refreshToken;
  let clientId = credentials?.fieldTest === true ? GOOGLE_NEST_FIELD_TEST_CLIENT_ID : GOOGLE_NEST_CLIENT_ID;

  if (refreshToken === undefined || refreshToken === '') {
    throw new Error('A valid Google refresh token is required');
  }

  let body = new URLSearchParams({
    client_id: clientId,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  let response = await request(
    'post',
    GOOGLE_TOKEN_ENDPOINT,
    {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': credentials?.userAgent,
      },
      timeout: 40000,
    },
    Buffer.from(body.toString(), 'utf8'),
  );
  let data = await response.json();

  if ((data?.access_token?.trim?.() ?? '') === '') {
    // Provider descriptions are deliberately not included because OAuth
    // servers are allowed to echo request details in them.
    let error = new Error(
      typeof data?.error === 'string'
        ? 'Google refresh-token exchange failed (' + data.error + ')'
        : 'Google refresh-token exchange returned no access token',
    );
    error.name = 'GoogleAuthError';
    error.code = data?.error;
    throw error;
  }

  return {
    access_token: data.access_token.trim(),
    token_type: typeof data.token_type === 'string' && data.token_type.trim() !== '' ? data.token_type.trim() : 'Bearer',
    expires_in: Number(data.expires_in),
  };
}
