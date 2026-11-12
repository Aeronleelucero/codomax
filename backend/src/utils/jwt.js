import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const ALGORITHM = 'HS256';
const ISSUER = 'artikly-api';

// The token only carries the user id ("sub"). Everything else about the user
// is loaded from the database on each request, so changes take effect at once.
export function signAccessToken(userId) {
  return jwt.sign({}, env.jwt.secret, {
    algorithm: ALGORITHM,
    expiresIn: env.jwt.expiresIn,
    issuer: ISSUER,
    subject: String(userId),
  });
}

// Throws (TokenExpiredError / JsonWebTokenError) when the token is invalid.
// Pinning the algorithm prevents "alg: none" and algorithm-confusion attacks.
export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.secret, { algorithms: [ALGORITHM], issuer: ISSUER });
}

// The token's expiry time as an ISO date string (sent to clients after login).
export function getTokenExpiry(token) {
  const { exp } = jwt.decode(token);
  return new Date(exp * 1000).toISOString();
}
