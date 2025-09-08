// src/components/AuthGate.tsx
'use client';

import { signOut } from 'firebase/auth';
import PhoneAuth from './PhoneAuth';
import { useAuth } from '@/component/AuthProvider';

type Props = { children: React.ReactNode };

export default function AuthGate({ children }: Props) {
  const { user, loading, auth } = useAuth();

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <span>Loading...</span>
      </div>
    );
  }

  if (!user) {
    return <PhoneAuth />;
  }

  return (
    <div className='w-full'>
      <div className='fixed top-2 right-2 flex items-center gap-2'>
        <span className='text-sm'>{user.displayName ?? 'Signed in'}</span>
        <button
          className='text-sm rounded px-2 py-1 border'
          onClick={() => signOut(auth)}
        >
          로그아웃
        </button>
      </div>
      {children}
    </div>
  );
}
