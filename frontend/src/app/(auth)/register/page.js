'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/use-toast';

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { register: signup, isLoading, error } = useAuthStore();

  const [formData, setFormData] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [validationErrors, setValidationErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (validationErrors[name]) setValidationErrors((p) => ({ ...p, [name]: '' }));
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.username.trim()) errors.username = 'Username is required';
    else if (formData.username.length < 3) errors.username = 'Username must be at least 3 characters';
    else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) errors.username = 'Use letters, numbers, underscores';
    if (!formData.email.trim()) errors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'Please enter a valid email';
    if (!formData.password) errors.password = 'Password is required';
    else if (formData.password.length < 6) errors.password = 'Password must be at least 6 characters';
    if (!formData.confirmPassword) errors.confirmPassword = 'Please confirm your password';
    else if (formData.password !== formData.confirmPassword) errors.confirmPassword = 'Passwords do not match';
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await signup({ username: formData.username, email: formData.email, password: formData.password });
      toast({ title: 'Account created!', description: 'Welcome aboard.' });
      router.push('/feed');
    } catch (err) {
      toast({ title: 'Registration failed', description: err.message || 'Please try again.', variant: 'destructive' });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <Card className="w/full max-w-md bg-gray-900 border-gray-800">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Join Instagram Clone
          </CardTitle>
          <CardDescription className="text-gray-400">Create your account to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Input name="username" placeholder="Username" value={formData.username} onChange={handleInputChange}
                     className="bg-gray-800 border-gray-700 text-white placeholder-gray-400" disabled={isLoading} />
              {validationErrors.username && <p className="text-sm text-red-500">{validationErrors.username}</p>}
            </div>

            <div className="space-y-2">
              <Input type="email" name="email" placeholder="Email address" value={formData.email} onChange={handleInputChange}
                     className="bg-gray-800 border-gray-700 text-white placeholder-gray-400" disabled={isLoading} />
              {validationErrors.email && <p className="text-sm text-red-500">{validationErrors.email}</p>}
            </div>

            <div className="space-y-2">
              <Input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleInputChange}
                     className="bg-gray-800 border-gray-700 text-white placeholder-gray-400" disabled={isLoading} />
              {validationErrors.password && <p className="text-sm text-red-500">{validationErrors.password}</p>}
            </div>

            <div className="space-y-2">
              <Input type="password" name="confirmPassword" placeholder="Confirm password"
                     value={formData.confirmPassword} onChange={handleInputChange}
                     className="bg-gray-800 border-gray-700 text-white placeholder-gray-400" disabled={isLoading} />
              {validationErrors.confirmPassword && <p className="text-sm text-red-500">{validationErrors.confirmPassword}</p>}
            </div>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
              {isLoading ? 'Creating account...' : 'Create Account'}
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
