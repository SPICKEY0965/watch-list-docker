'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useApiClient } from '@/hooks/useApiClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface AuthToken {
  id: number;
  device_info: string;
  last_used_at: string;
  created_at: string;
  is_current_session: boolean;
}

export default function SettingsPage() {
  const { user, token, handleLogout: logout } = useAuth();
  const apiClient = useApiClient(token, logout);
  const router = useRouter();
  const [devices, setDevices] = useState<AuthToken[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const toastId = useRef<string | number | null>(null);
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [actionType, setActionType] = useState<'logout' | 'delete' | 'logout_device' | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTokenId, setSelectedTokenId] = useState<number | null>(null);

  const fetchDevices = async () => {
    if (!token) return;
    try {
      setDevicesLoading(true);
      const response = await apiClient.get('/api/auth/devices', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDevices(response.data);
    } catch (error) {
      console.error('Failed to fetch devices:', error);
      toast.error('デバイス情報の取得に失敗しました。');
    } finally {
      setDevicesLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchDevices();
    }
  }, [token]);

  const handleLogoutDevice = async (tokenId: number) => {
    setSelectedTokenId(tokenId);
    openDialog('logout_device');
  };

  const handleUpdateAllContent = async () => {
    if (isUpdating) return;
    setIsUpdating(true);

    toastId.current = toast.loading('バッチ処理を開始しています...');

    try {
      await apiClient.post('/api/batch/update-descriptions');
      setIsPolling(true);
    } catch (error: any) {
      console.error('Failed to start batch update:', error);
      if (toastId.current) {
        toast.error(error.response?.data?.message || '更新処理の開始に失敗しました。', { id: toastId.current });
      }
      setIsUpdating(false);
    }
  };


  const handleVerifyAndAction = async () => {
    if (!password || !actionType) return;
    setIsVerifying(true);

    try {
      // Step 1: Verify password and get a one-time token
      const verifyResponse = await apiClient.post('/api/auth/verify-password', {
        password,
        actionType,
        targetId: actionType === 'logout_device' ? selectedTokenId : undefined,
      });

      const { oneTimeToken } = verifyResponse.data;
      if (!oneTimeToken) {
        throw new Error('ワンタイムトークンの取得に失敗しました。');
      }
      toast.success('パスワード認証に成功しました。');

      // Step 2: Perform the actual action using the one-time token
      if (actionType === 'delete') {
        await apiClient.delete('/api/users', {
          headers: { Authorization: `Bearer ${token}` },
          data: { oneTimeToken },
        });
        toast.success('アカウントが正常に削除されました。');
        logout();
        router.push('/login');
      } else if (actionType === 'logout_device' && selectedTokenId) {
        await apiClient.delete(`/api/auth/tokens/${selectedTokenId}`, {
          headers: { Authorization: `Bearer ${token}` },
          data: { oneTimeToken },
        });
        toast.success('デバイスが正常にログアウトされました。');
        fetchDevices();
      }

      // Reset state
      setIsDialogOpen(false);
      setPassword('');
      setActionType(null);
      setSelectedTokenId(null);

    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || '操作に失敗しました。';
      if (errorMessage.includes('Invalid password')) {
        toast.error('パスワードが正しくありません。');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const openDialog = (type: 'logout' | 'delete' | 'logout_device') => {
    setActionType(type);
    setIsDialogOpen(true);
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      router.push('/login');
    } else {
      setIsLoaded(true);
    }
  }, [router]);

  useEffect(() => {
    if (token) {
      fetchDevices();
    }
  }, [token]);

  useEffect(() => {
    if (!isPolling) return;

    const interval = setInterval(async () => {
      try {
        const { data: status } = await apiClient.get('/api/batch/status');

        if (toastId.current) {
          if (status.status === 'running') {
            const progress = status.total > 0 ? Math.round((status.progress / status.total) * 100) : 0;
            toast.loading(
              `処理中... (${status.progress}/${status.total}) ${progress}%`,
              { id: toastId.current }
            );
          } else if (status.status === 'completed') {
            toast.success(status.message || 'バッチ処理が完了しました。', { id: toastId.current });
            setIsPolling(false);
            setIsUpdating(false);
          } else if (status.status === 'failed') {
            toast.error(status.message || 'バッチ処理中にエラーが発生しました。', { id: toastId.current });
            setIsPolling(false);
            setIsUpdating(false);
          } else if (status.status === 'idle') {
            // The job might have finished between polls
            toast.dismiss(toastId.current);
            setIsPolling(false);
            setIsUpdating(false);
          }
        }
      } catch (error) {
        console.error('Failed to get batch status:', error);
        if (toastId.current) {
          toast.error('進行状況の取得に失敗しました。', { id: toastId.current });
        }
        setIsPolling(false);
        setIsUpdating(false);
      }
    }, 2000); // 2秒ごとにポーリング

    return () => clearInterval(interval);
  }, [isPolling, apiClient]);

  if (!isLoaded) {
    return <div>読み込み中...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">設定</h1>
          <Button asChild>
            <Link href="/home">ホームへ</Link>
          </Button>
        </div>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">デバイス管理</CardTitle>
            <CardDescription className="text-white">現在ログイン中のデバイス一覧です。不要なセッションはログアウトできます。</CardDescription>
          </CardHeader>
          <CardContent>
            {devicesLoading ? (
              <p>読み込み中...</p>
            ) : (
              <ul className="space-y-4">
                {devices.map((device) => (
                  <li key={device.id} className="p-4 border border-gray-700 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">
                        {device.device_info}
                        {device.is_current_session && <span className="ml-2 text-xs font-normal text-green-400">(現在のセッション)</span>}
                      </p>
                      <p className="text-sm text-white">
                        最終利用: {new Date(device.last_used_at + 'Z').toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' })}
                      </p>
                    </div>
                    <Button variant="outline" onClick={() => handleLogoutDevice(device.id)} disabled={device.is_current_session}>
                      ログアウト
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">データ管理</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={handleUpdateAllContent} disabled={isUpdating}>
              {isUpdating ? '更新処理中...' : '全コンテンツの情報を更新'}
            </Button>
            <p className="text-sm text-white mt-2">すべてのコンテンツのメタデータと説明を最新の情報に更新します。処理には時間がかかる場合があります。</p>
          </CardContent>
        </Card>

        <Card className="border-destructive bg-gray-800">
          <CardHeader>
            <CardTitle className="text-white">アカウント操作</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Button variant="outline" onClick={() => { logout(); router.push('/login'); }}>現在のセッションからログアウト</Button>
            </div>
            <div>
              <Button variant="destructive" onClick={() => openDialog('delete')}>アカウントを削除</Button>
              <p className="text-sm text-white mt-2">アカウントを削除すると、全てのウォッチリストと設定が失われます。</p>
            </div>
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={(isOpen) => {
          if (!isOpen) {
            setPassword('');
            setActionType(null);
            setSelectedTokenId(null);
          }
          setIsDialogOpen(isOpen);
        }}>
          <DialogContent className="bg-gray-800 border-gray-700 text-white">
            <DialogHeader>
              <DialogTitle>
                {actionType === 'delete' && '本当にアカウントを削除しますか？'}
                {actionType === 'logout_device' && 'デバイスをログアウトしますか？'}
              </DialogTitle>
              <DialogDescription className="text-white">
                この操作を続けるには、パスワードを入力してください。
                {actionType === 'delete' && ' この操作は元に戻せません。あなたのアカウントと関連する全てのデータが完全に削除されます。'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="password">パスワード</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>キャンセル</Button>
              <Button variant="destructive" onClick={handleVerifyAndAction} disabled={isVerifying || !password}>
                {isVerifying ? '確認中...' : '実行'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
