/// <reference lib="webworker" />
import type { PrecacheEntry, SerwistGlobalConfig, RuntimeCaching } from "serwist";
import { Serwist, CacheFirst, StaleWhileRevalidate, NetworkFirst, ExpirationPlugin } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const runtimeCaching: RuntimeCaching[] = [
  // 1. API 호출 (/api/*): NetworkFirst (5초 타임아웃)
  {
    matcher: ({ url }) => url.pathname.startsWith("/api/"),
    handler: new NetworkFirst({
      cacheName: "api-cache",
      networkTimeoutSeconds: 5,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 64,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30일
        }),
      ],
    }),
  },
  // 2. HTML 문서 (request.mode === 'navigate')
  {
    matcher: ({ request }) => request.mode === "navigate",
    handler: new StaleWhileRevalidate({
      cacheName: "html-cache",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 32,
          maxAgeSeconds: 30 * 24 * 60 * 60,
        }),
      ],
    }),
  },
  // 3. Next.js RSC 데이터 (_rsc, _next/data)
  {
    matcher: ({ url }) => url.searchParams.has("_rsc") || url.pathname.includes("/_next/data/"),
    handler: new StaleWhileRevalidate({
      cacheName: "rsc-cache",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 64,
          maxAgeSeconds: 30 * 24 * 60 * 60,
        }),
      ],
    }),
  },
  // 4. 정적 자산 (JS/CSS/폰트/이미지)
  {
    matcher: ({ request, url }) =>
      request.destination === "style" ||
      request.destination === "script" ||
      request.destination === "font" ||
      request.destination === "image" ||
      url.pathname.startsWith("/_next/static/"),
    handler: new CacheFirst({
      cacheName: "static-assets-cache",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 128,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1년
        }),
      ],
    }),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
});

serwist.addEventListeners();
