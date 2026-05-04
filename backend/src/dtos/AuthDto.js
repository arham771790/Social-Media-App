import { z } from 'zod';

export const RegisterRequestSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
  verifyToken: z.string().optional(),
});

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const ForgotPasswordRequestSchema = z.object({
  email: z.string().email(),
});

export const ResetPasswordRequestSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
  newPassword: z.string().min(6),
});

export const AuthResponseDto = (user, token) => ({
  token,
  user: {
    id: user.id,
    username: user.username,
    email: user.email,
    avatar: user.avatar,
  },
});
