import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'projectflow-super-secure-jwt-secret-key-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface JwtPayload {
  userId: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: JwtPayload): string {
  // @ts-ignore
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (error) {
    return null;
  }
}

export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  let token: string | undefined;

  // 1. Check Authorization Bearer header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  // 2. Check req.query
  if (!token && req.query && typeof req.query.token === 'string') {
    token = req.query.token;
  }

  // 3. Fallback: Parse query parameter directly from req.url (crucial for iframes & media in Vite Connect)
  if (!token && req.url && req.url.includes('token=')) {
    try {
      const urlObj = new URL(req.url, 'http://localhost');
      token = urlObj.searchParams.get('token') || undefined;
    } catch {
      const match = req.url.match(/[?&]token=([^&]+)/);
      if (match) token = decodeURIComponent(match[1]);
    }
  }

  if (!token || token === 'null' || token === 'undefined') {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Session expired or invalid token. Please log in again.' });
  }

  req.user = decoded;
  next();
};
