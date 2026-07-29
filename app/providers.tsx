"use client"

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from 'next-themes'
import { useState } from 'react'

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        networkMode: 'offlineFirst',
        // 💡 오프라인 상태일 때: API 재시도(Retry)를 0회로 즉각 종료하여 초기 렌더링 무한 대기(스피너) 방지
        // 💡 온라인 상태일 때: 일반 네트워크 유실을 대비해 최대 2회까지 재시도 기능 유지
        retry: (failureCount, error) => {
          if (typeof window !== "undefined" && !navigator.onLine) {
            return false;
          }
          return failureCount < 2;
        },
        // 💡 중요: 다시 온라인 연결이 회복되는 시점에 즉각 중단된 쿼리를 재실행하여 데이터 완전 회복 보장
        refetchOnReconnect: true,
        refetchOnWindowFocus: true,
      },
    },
  }))

  return (
    <SessionProvider refetchInterval={5 * 60} refetchOnWindowFocus={true} refetchWhenOffline={false}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  )
}
