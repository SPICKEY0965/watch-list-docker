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
  const [isPrivate, setIsPrivate] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const validatePassword = (password: string) => {
    const isValid = password.length >= 8 &&
      /[a-z]/.test(password) &&
      /[A-Z]/.test(password) &&
      /\d/.test(password) &&
      /[@%+\/'!#$^?:.\(\)\{\}\[\]~`_-]/.test(password);
    return isValid;
  }


  const getPasswordValidationStatus = (password: string) => ({
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[@%+\/'!#$^?:.\(\)\{\}\[\]~`_-]/.test(password),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validatePassword(password)) {
      setError('パスワードは 8 文字以上で、大文字、小文字、数字、特殊文字を含める必要があります。');
      return;
    }

    try {
      const endpoint = isRegistering ? '/api/users' : '/api/login';
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
      const requestData: any = { username, password };

      if (isRegistering) {
        requestData.is_private = isPrivate.toString();
      }

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}${endpoint}`,
        requestData,
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
          setError('ユーザー名またはパスワードが無効です');
        } else if (status === 403) {
          setError('アカウントがロックされています');
        } else {
          setError(error.response?.data?.error || '予期しないエラーが発生しました');
        }
      }
    }
  };

  const passwordValidationStatus = getPasswordValidationStatus(password);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-white text-center">
          {isRegistering ? '登録' : 'ログイン'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="username" className="text-white">ユーザー名</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full text-white placeholder-gray-500"
              autoComplete="username"
            />
          </div>
          <div>
            <Label htmlFor="password" className="text-white">パスワード</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full text-white placeholder-gray-500 pr-10"
                autoComplete="current-password"
              />
              <Button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-white bg-transparent hover:bg-transparent"
              >
                {showPassword ? '非表示' : '表示'}
              </Button>
            </div>

            {isRegistering && (
              <div className="mt-2 text-sm text-white space-y-1">
                <p className={passwordValidationStatus.length ? 'text-green-500' : 'text-red-500'}>
                  {passwordValidationStatus.length ? '✔️' : '✗'} 8文字以上
                </p>
                <p className={passwordValidationStatus.lowercase ? 'text-green-500' : 'text-red-500'}>
                  {passwordValidationStatus.lowercase ? '✔️' : '✗'} 小文字
                </p>
                <p className={passwordValidationStatus.uppercase ? 'text-green-500' : 'text-red-500'}>
                  {passwordValidationStatus.uppercase ? '✔️' : '✗'} 大文字
                </p>
                <p className={passwordValidationStatus.number ? 'text-green-500' : 'text-red-500'}>
                  {passwordValidationStatus.number ? '✔️' : '✗'} 数字
                </p>
                <p className={passwordValidationStatus.special ? 'text-green-500' : 'text-red-500'}>
                  {passwordValidationStatus.special ? '✔️' : '✗'} 特殊文字 (@  %  +  \  /  '  !  #  $  ^  ?  :  .  (  )  { }  [  ]  ~  `  -  _)
                </p>
              </div>
            )}
          </div>
          {isRegistering && (
            <div>
              <Label htmlFor="is_private" className="text-white">プライベートアカウント</Label>
              <input
                id="is_private"
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="ml-2"
              />
            </div>
          )}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full">
            {isRegistering ? '登録' : 'ログイン'}
          </Button>
        </form>
        <p className="mt-4 text-center text-white">
          {isRegistering ? 'すでにアカウントを持っていますか？' : 'アカウントを持っていませんか？'}
          <Button
            variant="link"
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-blue-400 hover:text-blue-300"
          >
            {isRegistering ? 'ログイン' : '登録'}
          </Button>
        </p>
      </div>
    </div>
  );
}
