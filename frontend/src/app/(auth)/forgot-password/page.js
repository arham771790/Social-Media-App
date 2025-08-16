'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Mail } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/use-toast';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { forgotPassword, isLoading } = useAuthStore();

  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [validationError, setValidationError] = useState('');

  const validateEmail = (val) => {
    if (!val.trim()) return 'Email is required';
    if (!/\S+@\S+\.\S+/.test(val)) return 'Please enter a valid email address';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const emailError = validateEmail(email);
    if (emailError) return setValidationError(emailError);

    try {
      await forgotPassword(email); // store throws on error
      toast({
        title: 'Reset email sent!',
        description: 'If an account exists, you’ll receive an OTP.',
      });
      setIsSubmitted(true);
      // Redirect to reset-password with the email
      router.push(`/reset-password?email=${encodeURIComponent(email)}`);
    } catch (err) {
      toast({
        title: 'Error',
        description: err.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (validationError) setValidationError('');
  };

  if (isSubmitted) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Card className="w-full max-w-md bg-gray-900 border-gray-800">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
              <Mail className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">Check your email</CardTitle>
            <CardDescription className="text-gray-400">
              We sent OTP instructions to <br />
              <span className="text-white font-medium">{email}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  Didn&apos;t receive it? Check spam or try a different email.
                </AlertDescription>
              </Alert>
              <Button
                onClick={() => setIsSubmitted(false)}
                variant="outline"
                className="w-full border-gray-700 text-white hover:bg-gray-800"
              >
                Try different email
              </Button>
              <div className="text-center">
                <Link
                  href="/login"
                  className="text-blue-400 hover:text-blue-300 text-sm flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to login
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <Card className="w-full max-w-md bg-gray-900 border-gray-800">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-white">Forgot Password?</CardTitle>
          <CardDescription className="text-gray-400">
            Enter your email and we&apos;ll send you an OTP.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={handleEmailChange}
                className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                disabled={isLoading}
              />
              {validationError && <p className="text-sm text-red-500">{validationError}</p>}
            </div>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Send OTP'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="text-blue-400 hover:text-blue-300 text-sm flex items-center justify-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
