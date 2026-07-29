/// <reference lib="webworker" />
import type { PrecacheEntry, SerwistGlobalConfig, RuntimeCaching } from "serwist";
import { Serwist, CacheFirst, StaleWhileRevalidate, NetworkFirst, ExpirationPlugin, CacheableResponsePlugin } from "serwist";

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
  // 4. 구글 폰트 및 아이콘 스타일시트 (Google Fonts & Material Symbols): StaleWhileRevalidate (Opaque 응답 허용)
  {
    matcher: ({ url }) => url.origin.includes("fonts.googleapis.com") || url.origin.includes("fonts.gstatic.com"),
    handler: new StaleWhileRevalidate({
      cacheName: "google-fonts-stylesheets",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 32,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30일
        }),
        new CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    }),
  },
  // 5. 외부(Cross-Origin) 도메인 이미지 (구글 OAuth 프로필, CDN 등): StaleWhileRevalidate (30일, Opaque 응답 허용)
  {
    matcher: ({ request, url }) => request.destination === "image" && url.origin !== self.location.origin,
    handler: new StaleWhileRevalidate({
      cacheName: "external-images-cache",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 64,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30일
        }),
        new CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    }),
  },
  // 6. 내부(Self Origin) 불변 고정 정적 자산 (JS/CSS/폰트/앱 내부 로컬 정적 이미지)
  {
    matcher: ({ request, url }) =>
      request.destination === "style" ||
      request.destination === "script" ||
      request.destination === "font" ||
      (request.destination === "image" && url.origin === self.location.origin) ||
      url.pathname.startsWith("/_next/static/"),
    handler: new CacheFirst({
      cacheName: "static-assets-cache",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 128,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1년
        }),
        new CacheableResponsePlugin({
          statuses: [0, 200],
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
