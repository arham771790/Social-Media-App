'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/use-toast';

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();

  const {
    error: storeError,
    requestEmailVerification,
    confirmEmailVerification,
    registerVerified,
  } = useAuthStore();

  const [form, setForm] = useState({
    email: '',
    code: '',
    username: '',
    password: '',
    confirmPassword: '',
  });

  const [verifyToken, setVerifyToken] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [localError, setLocalError] = useState('');

  // button-specific spinners only (no global loading)
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [registering, setRegistering] = useState(false);

  // resend cooldown + email lock
  const [resendIn, setResendIn] = useState(0);
  const [emailLocked, setEmailLocked] = useState(false);

  // tick down cooldown
  useEffect(() => {
    if (!resendIn) return;
    const t = setInterval(() => setResendIn((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const setErr = (msg) => setLocalError(msg || '');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErr('');
    if (validationErrors[name]) {
      setValidationErrors((p) => ({ ...p, [name]: '' }));
    }
  };

  const verified = Boolean(verifyToken);
  const anyError = localError || storeError;

  const validateRegisterFields = () => {
    const errors = {};
    if (!form.username.trim()) errors.username = 'Username is required';
    else if (form.username.length < 3) errors.username = 'Username must be at least 3 characters';
    else if (!/^[a-zA-Z0-9_]+$/.test(form.username)) errors.username = 'Use letters, numbers, underscores';

    if (!form.password) errors.password = 'Password is required';
    else if (form.password.length < 6) errors.password = 'Password must be at least 6 characters';

    if (!form.confirmPassword) errors.confirmPassword = 'Please confirm your password';
    else if (form.password !== form.confirmPassword) errors.confirmPassword = 'Passwords do not match';

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const requestCode = async () => {
    setErr('');
    if (!form.email.trim()) return setErr('Email is required');
    if (!/\S+@\S+\.\S+/.test(form.email)) return setErr('Please enter a valid email');

    try {
      setSending(true);
      await requestEmailVerification(form.email.trim());
      toast({ title: 'Code sent', description: 'We emailed you a verification code.' });
      setResendIn(45);
      setEmailLocked(true); // lock email so the code remains tied to this email
    } catch (e) {
      setErr(e?.message || 'Failed to send code');
    } finally {
      setSending(false);
    }
  };

  const verifyCode = async () => {
    setErr('');
    if (!form.code.trim()) return setErr('Enter the 6-digit code');

    try {
      setVerifying(true);
      const res = await confirmEmailVerification({
        email: form.email.trim(),
        code: form.code.trim(),
      });

      // Accept multiple return shapes
      const token =
        typeof res === 'string'
          ? res
          : res?.verifyToken || res?.token || res?.data?.verifyToken || '';

      if (!token) throw new Error('Verification failed');

      setVerifyToken(token);
      setEmailLocked(true);
      toast({ title: 'Email verified', description: 'Great! Finish your account details.' });
    } catch (e) {
      setErr(e?.message || 'Invalid or expired code');
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!verifyToken) return setErr('Please verify your email first');
    if (!validateRegisterFields()) return;

    try {
      setRegistering(true);
      const data = await registerVerified({
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        verifyToken,
      });

      if (data?.token) {
        toast({ title: 'Welcome aboard!', description: 'Your account is ready.' });
        router.push('/feed');
      } else {
        toast({ title: 'Account created!', description: 'Sign in to continue.' });
        router.push('/login');
      }
    } catch (err) {
      setErr(err?.message || 'Registration failed');
    } finally {
      setRegistering(false);
    }
  };

  const resetEmailFlow = () => {
    // allow changing email safely — clear code/token/cooldown
    setEmailLocked(false);
    setVerifyToken('');
    setForm((f) => ({ ...f, code: '' }));
    setResendIn(0);
    setErr('');
  };

  const isEmailValid = /\S+@\S+\.\S+/.test(form.email);
  const canSend = !sending && !verified && isEmailValid && resendIn === 0;
  const canVerify = !verifying && !verified && form.code.trim().length >= 6;
  const canRegister = verified && !registering;

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <Card className="w-full max-w-md bg-gray-900 border-gray-800">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Join Instagram Clone
          </CardTitle>
          <CardDescription className="text-gray-400">
            Verify your email, then create your account
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {anyError && (
              <Alert variant="destructive">
                <AlertDescription>{anyError}</AlertDescription>
              </Alert>
            )}

            {/* Step 1: Email */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  type="email"
                  name="email"
                  placeholder="Email address"
                  value={form.email}
                  onChange={handleInputChange}
                  className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                  readOnly={emailLocked}
                />
                {emailLocked && !verified && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetEmailFlow}
                    title="Change email"
                  >
                    Change
                  </Button>
                )}
              </div>

              <Button
                type="button"
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={requestCode}
                disabled={!canSend}
              >
                {sending ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </span>
                ) : resendIn > 0 ? (
                  `Resend in ${resendIn}s`
                ) : (
                  'Send code'
                )}
              </Button>
            </div>

            {/* Step 2: Code */}
            <div className="space-y-2">
              <Input
                name="code"
                placeholder="Enter 6-digit code"
                value={form.code}
                onChange={handleInputChange}
                className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 tracking-widest"
                disabled={verified}
                maxLength={6}
              />
              <Button
                type="button"
                variant="outline"
                onClick={verifyCode}
                disabled={!canVerify}
              >
                {verifying ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying…
                  </span>
                ) : verified ? (
                  'Verified ✅'
                ) : (
                  'Verify code'
                )}
              </Button>
            </div>

            {/* Step 3: User details (activate after verification) */}
            <div className="space-y-2">
              <Input
                name="username"
                placeholder="Username"
                value={form.username}
                onChange={handleInputChange}
                className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                disabled={!verified}
              />
              {validationErrors.username && (
                <p className="text-sm text-red-500">{validationErrors.username}</p>
              )}
            </div>

            <div className="space-y-2">
              <Input
                type="password"
                name="password"
                placeholder="Password"
                value={form.password}
                onChange={handleInputChange}
                className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                disabled={!verified}
              />
              {validationErrors.password && (
                <p className="text-sm text-red-500">{validationErrors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Input
                type="password"
                name="confirmPassword"
                placeholder="Confirm password"
                value={form.confirmPassword}
                onChange={handleInputChange}
                className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                disabled={!verified}
              />
              {validationErrors.confirmPassword && (
                <p className="text-sm text-red-500">{validationErrors.confirmPassword}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={!canRegister}
            >
              {registering ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating account...
                </span>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-gray-400">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-400 hover:text-blue-300">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
