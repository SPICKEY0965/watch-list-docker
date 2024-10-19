import React, { useState } from 'react';
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LoginComponentProps {
  onLogin: (token: string) => void;
}

export function LoginComponent({ onLogin }: LoginComponentProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');

  const validatePassword = (password: string) => {
    const isValid = password.length >= 8 &&
      /[a-z]/.test(password) &&
      /[A-Z]/.test(password) &&
      /\d/.test(password) &&
      /[!@#$%^&*]/.test(password);
    return isValid;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validatePassword(password)) {
      setError('パスワードは 8 文字以上で、大文字、小文字、数字、特殊文字を含める必要があります。');
      return;
    }
    try {
      const endpoint = isRegistering ? '/api/register' : '/api/login';
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
      const response = await axios.post(
        `http://192.168.1.210:5000${endpoint}`,
        { username, password },
        {
          headers: {
            'X-CSRF-Token': csrfToken || '',
          },
        }
      );
      if (isRegistering) {
        setIsRegistering(false);
      } else {
        onLogin(response.data.token);
      }
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 401) {
          setError('Invalid username or password');
        } else if (status === 403) {
          setError('Your account is locked');
        } else {
          setError(error.response?.data?.error || 'An unexpected error occurred');
        }
      }

    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-white text-center">
          {isRegistering ? 'Register' : 'Login'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="username" className="text-white">Username</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full text-white placeholder-gray-500"  // テキストを黒に、プレースホルダーを灰色に
            />
          </div>
          <div>
            <Label htmlFor="password" className="text-white">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full text-white placeholder-gray-500"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full">
            {isRegistering ? 'Register' : 'Login'}
          </Button>
        </form>
        <p className="mt-4 text-center text-white">
          {isRegistering ? 'Already have an account?' : "Don't have an account?"}
          <Button
            variant="link"
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-blue-400 hover:text-blue-300"
          >
            {isRegistering ? 'Login' : 'Register'}
          </Button>
        </p>
      </div>
    </div>
  );
}
