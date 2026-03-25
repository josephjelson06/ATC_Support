import bcrypt from 'bcrypt';
import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { asyncHandler, unauthorized } from '../utils/http';
import { serializeUser } from '../utils/serializers';
import { attachRefreshCookie, clearRefreshCookie, getRefreshTokenFromRequest, signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/session';
import { safeUserSelect } from '../utils/userModel';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

const userSelect = safeUserSelect;

router.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as z.infer<typeof loginSchema>;
    const user = await prisma.user.findUnique({
      where: {
        email: email.toLowerCase(),
      },
      select: {
        ...userSelect,
        passwordHash: true,
      },
    });

    if (!user) {
      throw unauthorized('Invalid email or password.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw unauthorized('Invalid email or password.');
    }

    const { passwordHash: _passwordHash, ...safeUser } = user;
    attachRefreshCookie(res, signRefreshToken(user.id));

    res.json({
      token: signAccessToken(user.id),
      user: serializeUser(safeUser),
    });
  }),
);

router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const refreshToken = getRefreshTokenFromRequest(req);

    if (!refreshToken) {
      throw unauthorized('Refresh token is missing.');
    }

    let payload;

    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      clearRefreshCookie(res);
      throw unauthorized('Refresh token is invalid or expired.');
    }

    const userId = Number(payload.sub);

    if (!Number.isInteger(userId) || userId <= 0) {
      clearRefreshCookie(res);
      throw unauthorized('Refresh token is invalid.');
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: userSelect,
    });

    if (!user || user.status !== 'ACTIVE') {
      clearRefreshCookie(res);
      throw unauthorized('User is not authorized.');
    }

    attachRefreshCookie(res, signRefreshToken(user.id));

    res.json({
      token: signAccessToken(user.id),
      user: serializeUser(user),
    });
  }),
);

router.get(
  '/me',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: {
        id: req.user!.id,
      },
      select: userSelect,
    });

    res.json({
      user: serializeUser(user),
    });
  }),
);

router.post(
  '/logout',
  asyncHandler(async (_req, res) => {
    clearRefreshCookie(res);

    res.status(204).send();
  }),
);

router.post(
  '/change-password',
  authMiddleware,
  validate(changePasswordSchema),
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body as z.infer<typeof changePasswordSchema>;
    const user = await prisma.user.findUnique({
      where: {
        id: req.user!.id,
      },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    if (!user) {
      throw unauthorized('User is not authorized.');
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isPasswordValid) {
      throw unauthorized('Current password is incorrect.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        passwordHash,
      },
    });

    attachRefreshCookie(res, signRefreshToken(user.id));

    res.json({
      token: signAccessToken(user.id),
    });
  }),
);

export default router;
