'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from 'firebase/auth';
import { useAuth } from '@/component/AuthProvider';

function formatKRMobile(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 11); // 최대 11자리
  const p1 = digits.slice(0, 3);
  const p2 = digits.slice(3, 7);
  const p3 = digits.slice(7, 11);
  return [p1, p2, p3].filter(Boolean).join(' ');
}

function toE164KR(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.length < 10) {
    throw new Error('유효한 휴대폰 번호를 입력해주세요.');
  }
  if (digits.startsWith('0')) {
    return '+82' + digits.slice(1);
  }
  if (digits.startsWith('82')) {
    return '+' + digits;
  }
  // 붙여쓴 국내번호(선행 0 없음) 등은 국내번호로 간주
  return '+82' + digits;
}

export default function PhoneAuth() {
  const { auth } = useAuth();

  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(
    null
  );
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const digitsOnlyLength = phone.replace(/\D/g, '').length;

  // Setup invisible reCAPTCHA on mount
  useEffect(() => {
    if (!recaptchaRef.current && typeof window !== 'undefined') {
      recaptchaRef.current = new RecaptchaVerifier(
        auth,
        'recaptcha-container',
        {
          size: 'invisible',
        }
      );
      // Render to load the widget
      void recaptchaRef.current.render();
    }
    return () => {
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
    };
  }, [auth]);

  const sendCode = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSending(true);
    try {
      const appVerifier = recaptchaRef.current;
      if (!appVerifier) {
        throw new Error('reCAPTCHA not ready. Please retry.');
      }

      const e164 = toE164KR(phone);
      const conf = await signInWithPhoneNumber(auth, e164, appVerifier);
      setConfirmation(conf);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message ?? String(err));
        // Reset reCAPTCHA to allow retry
        recaptchaRef.current?.clear();
        recaptchaRef.current = null;
        // Recreate the verifier
        recaptchaRef.current = new RecaptchaVerifier(
          auth,
          'recaptcha-container',
          { size: 'invisible' }
        );
        void recaptchaRef.current.render();
      }
    } finally {
      setSending(false);
    }
  };

  const verifyCode = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setVerifying(true);
    try {
      if (!confirmation) throw new Error('No verification in progress.');
      await confirmation.confirm(code);
      // onAuthStateChanged in AuthProvider/AuthGate will render the app after success
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setVerifying(false);
    }
  };

  const resetToPhone = () => {
    setConfirmation(null);
    setCode('');
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-zinc-950 dark:to-black flex items-center justify-center p-4'>
      <div className='w-full max-w-md'>
        <div className='mb-4 flex items-center justify-center gap-2'>
          {!confirmation ? (
            <span className='inline-flex items-center rounded-full bg-white/60 dark:bg-zinc-900/60 px-3 py-1 text-xs font-medium text-slate-700 dark:text-zinc-300 ring-1 ring-slate-200 dark:ring-zinc-800'>
              1단계 · 번호 입력
            </span>
          ) : (
            <span className='inline-flex items-center rounded-full bg-white/60 dark:bg-zinc-900/60 px-3 py-1 text-xs font-medium text-slate-700 dark:text-zinc-300 ring-1 ring-slate-200 dark:ring-zinc-800'>
              2단계 · 코드 인증
            </span>
          )}
        </div>

        <div className='rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/60 shadow-lg backdrop-blur p-6 md:p-7 space-y-6'>
          {!confirmation ? (
            <form onSubmit={sendCode} className='space-y-5'>
              <div className='space-y-1'>
                <h2 className='text-xl font-semibold tracking-tight'>
                  휴대폰 번호로 로그인
                </h2>
                <p className='text-sm text-slate-500 dark:text-zinc-400'>
                  본인 명의 휴대폰 번호를 입력하면 SMS로 인증 코드를 보내드려요.
                </p>
              </div>

              <div className='space-y-2'>
                <label
                  htmlFor='phone'
                  className='text-sm font-medium text-slate-700 dark:text-zinc-300'
                >
                  휴대폰 번호
                </label>
                <input
                  id='phone'
                  type='tel'
                  inputMode='tel'
                  required
                  value={phone}
                  onChange={(e) => setPhone(formatKRMobile(e.target.value))}
                  placeholder='010 1234 5678'
                  className='w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60'
                  aria-label='휴대폰 번호'
                />
                <p className='text-xs text-slate-500 dark:text-zinc-500'>
                  하이픈/띄어쓰기 상관없이 입력 가능해요.
                </p>
              </div>

              <button
                type='submit'
                disabled={sending || digitsOnlyLength < 10}
                className='w-full inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 text-white px-4 py-2.5 font-medium shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-indigo-500'
              >
                {sending ? (
                  <>
                    <span className='inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white' />
                    보내는 중…
                  </>
                ) : (
                  '인증 코드 보내기'
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyCode} className='space-y-5'>
              <div className='space-y-1'>
                <h2 className='text-xl font-semibold tracking-tight'>
                  인증 코드 입력
                </h2>
                <div className='text-sm text-slate-500 dark:text-zinc-400'>
                  입력한 번호{' '}
                  <span className='font-medium text-slate-700 dark:text-zinc-200'>
                    {phone || '—'}
                  </span>
                  로 전송된 6자리 코드를 입력하세요.
                </div>
              </div>

              <div className='space-y-2'>
                <label
                  htmlFor='code'
                  className='text-sm font-medium text-slate-700 dark:text-zinc-300'
                >
                  인증 코드
                </label>
                <input
                  id='code'
                  type='text'
                  inputMode='numeric'
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder='123456'
                  className='w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500'
                />
                <div className='flex items-center justify-between text-xs'>
                  <button
                    type='button'
                    onClick={resetToPhone}
                    className='text-slate-600 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 underline underline-offset-4'
                  >
                    번호 변경
                  </button>
                </div>
              </div>

              <button
                type='submit'
                disabled={verifying}
                className='w-full inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 text-white px-4 py-2.5 font-medium shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-indigo-500'
              >
                {verifying ? (
                  <>
                    <span className='inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white' />
                    인증 중…
                  </>
                ) : (
                  '인증 완료'
                )}
              </button>
            </form>
          )}

          {!!error && (
            <div className='rounded-lg border border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 p-3 text-sm'>
              {error.replace('Firebase: Error', '').trim()}
            </div>
          )}

          {/* reCAPTCHA widget (invisible) */}
          <div id='recaptcha-container' />
        </div>

        <p className='mt-4 text-center text-xs text-slate-500 dark:text-zinc-500'>
          SMS 수신이 어려우신가요? 통신사 스팸 설정을 확인하거나 잠시 후 다시
          시도해 보세요.
        </p>
      </div>
    </div>
  );
}
