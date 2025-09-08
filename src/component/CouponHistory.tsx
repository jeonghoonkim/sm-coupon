'use client';

import { db } from '@/lib/firestore';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';

type CouponHistoryItem = {
  id: string;
  created?: string | number | null;
  code: string;
  msg?: string;
};

type CouponHistoryProps = {
  uid: string;
};

function formatCreated(created: CouponHistoryItem['created']) {
  if (created == null) return '';
  // Try number (unix ms), then ISO/date string
  if (typeof created === 'number') {
    try {
      return new Date(created).toLocaleString();
    } catch {
      return String(created);
    }
  }
  const ms = Date.parse(created);
  if (!Number.isNaN(ms)) return new Date(ms).toLocaleString();
  return String(created);
}

const CouponHistory = ({ uid }: CouponHistoryProps) => {
  const [histories, setHistories] = useState<CouponHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const q = query(collection(db, 'user', uid, 'coupon'));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const items: CouponHistoryItem[] = snapshot.docs.map((doc) => {
          const data = doc.data() as any;
          return {
            id: doc.id,
            code: data?.code ?? '',
            msg: data?.msg ?? '',
            created: data?.created ?? data?.createdAt ?? null,
          };
        });

        // Client-side sort by created desc when possible
        items.sort((a, b) => {
          const aNum =
            typeof a.created === 'number'
              ? a.created
              : typeof a.created === 'string'
              ? Date.parse(a.created)
              : 0;
          const bNum =
            typeof b.created === 'number'
              ? b.created
              : typeof b.created === 'string'
              ? Date.parse(b.created)
              : 0;
          return (bNum || 0) - (aNum || 0);
        });

        setHistories(items);
        setLoading(false);
      },
      (err) => {
        setError(err?.message ?? String(err));
        setLoading(false);
      }
    );

    return () => {
      unsub();
    };
  }, [uid]);

  const count = histories.length;
  const title = useMemo(
    () => (count > 0 ? `쿠폰 내역 (${count})` : '쿠폰 내역'),
    [count]
  );

  const copyCode = async (id: string, code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1200);
    } catch {
      // no-op
    }
  };

  return (
    <section className='w-full max-w-xl'>
      <div className='border rounded-lg overflow-hidden shadow-sm bg-white/70 dark:bg-black/20'>
        <header className='px-4 py-3 border-b flex items-center justify-between'>
          <h2 className='text-base font-semibold'>{title}</h2>
          {loading ? (
            <span className='text-xs text-gray-500'>불러오는 중…</span>
          ) : (
            <span className='text-xs text-gray-500'>
              {count > 0 ? '최신순' : ''}
            </span>
          )}
        </header>

        {error && <div className='px-4 py-3 text-sm text-red-600'>{error}</div>}

        {loading ? (
          <ul className='divide-y'>
            {[0, 1, 2].map((i) => (
              <li key={i} className='p-4 animate-pulse space-y-2'>
                <div className='h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded' />
                <div className='h-3 w-56 bg-gray-200 dark:bg-gray-700 rounded' />
                <div className='h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded' />
              </li>
            ))}
          </ul>
        ) : count === 0 ? (
          <div className='px-6 py-10 text-center'>
            <div className='mx-auto mb-3 h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center'>
              <span className='text-lg'>🎟️</span>
            </div>
            <p className='text-sm text-gray-600'>
              아직 사용된 쿠폰 내역이 없어요.
            </p>
          </div>
        ) : (
          <ul className='divide-y'>
            {histories.map((h) => (
              <li
                key={h.id}
                className='p-4 flex items-start justify-between gap-4'
              >
                <div className='min-w-0'>
                  <div className='flex items-center gap-2'>
                    <span className='text-sm font-medium text-gray-900'>
                      {h.code || '-'}
                    </span>
                    <button
                      type='button'
                      onClick={() => copyCode(h.id, h.code)}
                      className='text-xs text-gray-600 hover:text-gray-900 border rounded px-2 py-0.5'
                    >
                      {copiedId === h.id ? '복사됨' : '복사'}
                    </button>
                  </div>
                  {h.msg ? (
                    <p className='text-sm text-gray-700 mt-1 break-words'>
                      {h.msg}
                    </p>
                  ) : null}
                  <p className='text-xs text-gray-500 mt-1'>
                    {formatCreated(h.created)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

export default CouponHistory;
