// =============================================================================
// VIZION — Serwist Service Worker
// Owner: frontend-react.
//
// Caching strategies per ARCHITECTURE §10.
// =============================================================================

import { Serwist } from "serwist";
import { defaultCache } from "@serwist/next/worker";
import {
  NetworkFirst,
  StaleWhileRevalidate,
  CacheFirst,
  NetworkOnly,
  ExpirationPlugin,
  CacheableResponsePlugin,
  BackgroundSyncPlugin,
} from "serwist";

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: Array<{ url: string; revision: string | null }>;
};

// ── Offline mutation queue ─────────────────────────────────────────────────────

const mutationQueue = new BackgroundSyncPlugin("vizion-mutations", {
  maxRetentionTime: 24 * 60, // 24 hours in minutes
});

// ── Serwist instance ──────────────────────────────────────────────────────────

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST ?? [],
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
  runtimeCaching: [
    // ── Marketing / legal — StaleWhileRevalidate ──────────────────────────
    {
      matcher: ({ url }) => {
        const marketing = ["/", "/pricing", "/legal"];
        return marketing.some((p) => url.pathname === p || url.pathname.startsWith(p + "/"));
      },
      handler: new StaleWhileRevalidate({
        cacheName: "vizion-marketing",
        plugins: [
          new CacheableResponsePlugin({ statuses: [0, 200] }),
          new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 7 * 24 * 60 * 60 }),
        ],
      }),
    },

    // ── App dashboards — NetworkFirst 3s timeout ──────────────────────────
    {
      matcher: ({ url }) => {
        const appRoutes = ["/inicio", "/perfil", "/trainer", "/admin"];
        return appRoutes.some((p) => url.pathname === p || url.pathname.startsWith(p + "/"));
      },
      handler: new NetworkFirst({
        cacheName: "vizion-app",
        networkTimeoutSeconds: 3,
        plugins: [
          new CacheableResponsePlugin({ statuses: [0, 200] }),
          new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 24 * 60 * 60 }),
        ],
      }),
    },

    // ── Sesión activa — NetworkFirst agresivo ─────────────────────────────
    {
      matcher: ({ url }) => url.pathname.startsWith("/client/sesion"),
      handler: new NetworkFirst({
        cacheName: "vizion-session",
        networkTimeoutSeconds: 2,
        plugins: [
          new CacheableResponsePlugin({ statuses: [0, 200] }),
          new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 48 * 60 * 60 }),
        ],
      }),
    },

    // ── Imágenes de ejercicio — CacheFirst 7d, max 100MB ─────────────────
    {
      matcher: ({ request, url }) =>
        request.destination === "image" &&
        (url.hostname === "raw.githubusercontent.com" ||
          url.hostname.endsWith(".r2.dev") ||
          url.hostname === "media.vizion.app"),
      handler: new CacheFirst({
        cacheName: "vizion-exercise-images",
        plugins: [
          new CacheableResponsePlugin({ statuses: [0, 200] }),
          new ExpirationPlugin({
            maxEntries: 500,
            maxAgeSeconds: 7 * 24 * 60 * 60,
            maxAgeFrom: "last-used",
          }),
        ],
      }),
    },

    // ── API mutations — NetworkOnly + offline queue ───────────────────────
    {
      matcher: ({ url, request }) =>
        url.pathname.startsWith("/api/") &&
        ["POST", "PUT", "PATCH", "DELETE"].includes(request.method),
      handler: new NetworkOnly({
        plugins: [mutationQueue],
      }),
    },

    // ── Static assets — CacheFirst with versioning ───────────────────────
    {
      matcher: ({ request }) =>
        request.destination === "script" ||
        request.destination === "style" ||
        request.destination === "font",
      handler: new CacheFirst({
        cacheName: "vizion-static",
        plugins: [
          new CacheableResponsePlugin({ statuses: [0, 200] }),
          new ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 365 * 24 * 60 * 60,
          }),
        ],
      }),
    },

    // ── Default cache from @serwist/next ──────────────────────────────────
    ...defaultCache,
  ],
});

serwist.addEventListeners();
