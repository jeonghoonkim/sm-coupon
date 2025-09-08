'use client';
import AuthGate from '@/component/AuthGate';
import { useAuth } from '@/component/AuthProvider';
import CouponHistory from '@/component/CouponHistory';
import { saveUser } from '@/lib/firestore';
import { updateProfile } from 'firebase/auth';
import { useState } from 'react';

export default function Home() {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter your name.');
      return;
    }
    if (
      !window.confirm(
        `'${trimmed}'가 맞나요?\n하이브 ID 는 변경 불가능해요.\n계속하시겠습니까?`
      )
    ) {
      return;
    }
    if (!user) return;
    try {
      setSaving(true);
      await updateProfile(user, { displayName: trimmed });
      await saveUser(user.uid, {
        displayName: trimmed,
        phoneNumber: user.phoneNumber,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthGate>
      {user && !user.displayName && !saved ? (
        <div className='min-h-screen flex items-center justify-center p-4'>
          <form onSubmit={submit} className='w-full max-w-sm space-y-3'>
            <h2 className='text-lg font-semibold'>하이브 ID</h2>
            <input
              type='text'
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='하이브 ID'
              className='w-full border rounded px-3 py-2'
              maxLength={50}
              required
            />
            <p className='text-xs text-gray-600'>
              하이브 ID 는 변경 불가능해요.
            </p>
            <button
              type='submit'
              disabled={saving}
              className='w-full border rounded px-3 py-2 cursor-pointer'
            >
              {saving ? '저장중…' : '저장하기'}
            </button>
            {error && <p className='text-red-600 text-sm'>{error}</p>}
          </form>
        </div>
      ) : (
        <div className='flex flex-col gap-4 min-h-screen items-center justify-center p-4'>
          <div className='text-center space-y-2'>
            {/* <p className='text-lg'>
              Welcome{user?.displayName ? `, ${user.displayName}` : ''}!
            </p> */}
            {!user?.displayName && saved && (
              <p className='text-sm text-green-700'>하이브 ID 저장되었어요.</p>
            )}
          </div>
          {user && <CouponHistory uid={user.uid} />}
        </div>
      )}
    </AuthGate>
  );
}
