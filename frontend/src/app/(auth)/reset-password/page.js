'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/use-toast';

export default function ResetPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();

  // ✅ subscribe to specific slices to ensure rerenders
  const resetPassword = useAuthStore((s) => s.resetPassword);
  const isLoading = useAuthStore((s) => s.isLoading);
  const storeError = useAuthStore((s) => s.error);

  const searchParams = useSearchParams();
  const otpRef = useRef(null);

  const [formData, setFormData] = useState({
    email: '',
    otp: '',
    password: '',
    confirmPassword: '',
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  // Prefill email from query param if provided
  useEffect(() => {
    const email = searchParams.get('email');
    if (email) {
      setFormData((s) => ({ ...s, email }));
      setTimeout(() => otpRef.current?.focus(), 0);
    }
  }, [searchParams]);

  // Surface store errors inline (and via toast once)
  useEffect(() => {
    if (storeError) {
      toast({ title: 'Reset failed', description: storeError, variant: 'destructive' });
    }
  }, [storeError, toast]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((s) => ({ ...s, [name]: value }));
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.email.trim()) errors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'Enter a valid email';

    if (!/^\d{6}$/.test(formData.otp.trim())) errors.otp = 'OTP must be 6 digits';

    if (!formData.password) errors.password = 'Password is required';
    else if (formData.password.length < 6) errors.password = 'Password must be at least 6 characters';

    if (!formData.confirmPassword) errors.confirmPassword = 'Confirm your password';
    else if (formData.password !== formData.confirmPassword) errors.confirmPassword = 'Passwords do not match';

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const res = await resetPassword({
        email: formData.email,
        otp: formData.otp,
        newPassword: formData.password,
      });

      const msg = res?.message || 'Password reset successful';
      setSuccessMessage(msg);                                 // ✅ local UI state change -> rerender
      toast({ title: 'Success', description: msg });

      // Clear sensitive inputs & lock form
      setFormData((s) => ({ ...s, otp: '', password: '', confirmPassword: '' }));

      // Optional: redirect after a moment
      setTimeout(() => router.push('/login'), 1500);
    } catch (err) {
      // store already set the error; toast handled in useEffect
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <Card className="w-full max-w-md bg-gray-900 border-gray-800">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-white">Reset Your Password</CardTitle>
          <CardDescription className="text-gray-400">
            Enter the OTP we emailed you and choose a new password
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Inline success */}
          {successMessage && (
            <Alert className="mb-4">
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}
          {/* Inline error (from store) */}
          {!successMessage && storeError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{storeError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                name="email"
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleInputChange}
                className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                disabled={isLoading || !!successMessage}
              />
              {validationErrors.email && <p className="text-sm text-red-500">{validationErrors.email}</p>}
            </div>

            <div className="space-y-2">
              <Input
                ref={otpRef}
                name="otp"
                placeholder="OTP (6 digits)"
                value={formData.otp}
                onChange={handleInputChange}
                className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                disabled={isLoading || !!successMessage}
              />
              {validationErrors.otp && <p className="text-sm text-red-500">{validationErrors.otp}</p>}
            </div>

            <div className="space-y-2">
              <Input
                name="password"
                type="password"
                placeholder="New password"
                value={formData.password}
                onChange={handleInputChange}
                className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                disabled={isLoading || !!successMessage}
              />
              {validationErrors.password && <p className="text-sm text-red-500">{validationErrors.password}</p>}
            </div>

            <div className="space-y-2">
              <Input
                name="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                disabled={isLoading || !!successMessage}
              />
              {validationErrors.confirmPassword && (
                <p className="text-sm text-red-500">{validationErrors.confirmPassword}</p>
              )}
            </div>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading || !!successMessage}>
              {isLoading ? 'Updating...' : successMessage ? 'Updated' : 'Update Password'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/login" className="text-blue-400 hover:text-blue-300 text-sm flex items-center justify-center gap-1">
              <ArrowLeft className="w-4 h-4" />
              Back to login-
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
