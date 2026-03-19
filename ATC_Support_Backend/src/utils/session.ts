import type { Request, Response } from 'express';
import type { JwtPayload } from 'jsonwebtoken';
import jwt from 'jsonwebtoken';

import { env } from '../config/env';
import { unauthorized } from './http';

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
const REFRESH_COOKIE_NAME = 'atc_refresh_token';

type TokenType = 'access' | 'refresh';

type SessionTokenPayload = JwtPayload & {
  type: TokenType;
};

const getSigningSecret = (type: TokenType) => `${env.JWT_SECRET}:${type}`;

const signToken = (userId: number, type: TokenType, expiresInSeconds: number) =>
  jwt.sign(
    {
      sub: userId,
      type,
    },
    getSigningSecret(type),
    {
      expiresIn: expiresInSeconds,
    },
  );

const verifyToken = (token: string, expectedType: TokenType) => {
  const verifiedToken = jwt.verify(token, getSigningSecret(expectedType));

  if (typeof verifiedToken === 'string') {
    throw unauthorized('Invalid or expired token.');
  }

  if (verifiedToken.type !== expectedType) {
    throw unauthorized('Invalid token payload.');
  }

  return verifiedToken as SessionTokenPayload;
};

const parseCookies = (cookieHeader: string | undefined) =>
  Object.fromEntries(
    (cookieHeader || '')
      .split(';')
      .map((segment) => segment.trim())
      .filter(Boolean)
      .map((segment) => {
        const separatorIndex = segment.indexOf('=');

        if (separatorIndex === -1) {
          return [segment, ''];
        }

        return [segment.slice(0, separatorIndex), decodeURIComponent(segment.slice(separatorIndex + 1))];
      }),
  );

export const sessionConfig = {
  accessTokenTtlSeconds: ACCESS_TOKEN_TTL_SECONDS,
  refreshTokenTtlSeconds: REFRESH_TOKEN_TTL_SECONDS,
  refreshCookieName: REFRESH_COOKIE_NAME,
};

export const signAccessToken = (userId: number) => signToken(userId, 'access', ACCESS_TOKEN_TTL_SECONDS);
export const signRefreshToken = (userId: number) => signToken(userId, 'refresh', REFRESH_TOKEN_TTL_SECONDS);

export const verifyAccessToken = (token: string) => verifyToken(token, 'access');
export const verifyRefreshToken = (token: string) => verifyToken(token, 'refresh');

export const getRefreshTokenFromRequest = (request: Request) => parseCookies(request.headers.cookie)[REFRESH_COOKIE_NAME] || null;

export const attachRefreshCookie = (response: Response, token: string) => {
  response.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    maxAge: REFRESH_TOKEN_TTL_SECONDS * 1_000,
    path: '/api/auth',
  });
};

export const clearRefreshCookie = (response: Response) => {
  response.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/api/auth',
  });
};
