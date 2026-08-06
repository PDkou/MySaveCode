/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

import { APP_MODE } from './lib/appMode';

declare const self: ServiceWorkerGlobalScope;

// Only a fallback for the rare case a push payload fails to parse as JSON
// or omits a title -- see lib/appMode.ts's header comment for the
// family-quest-app vs business-quest-app split this serves.
const APP_NAME = APP_MODE === 'business' ? 'Company Quest' : 'Family Quest';

self.skipWaiting();
clientsClaim();

precacheAndRoute(self.__WB_MANIFEST);

registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')));

interface PushPayload {
  title?: string;
  body?: string;
  taskId?: string;
}

self.addEventListener('push', (event: PushEvent) => {
  let payload: PushPayload = {};
  try {
    payload = event.data?.json() ?? {};
  } catch {
    payload = { title: APP_NAME, body: event.data?.text() };
  }

  const url = payload.taskId ? `/task/${payload.taskId}` : '/';

  event.waitUntil(
    self.registration.showNotification(payload.title ?? APP_NAME, {
      body: payload.body ?? '',
      icon: '/icons/icon-192.png',
      // Android draws the status-bar/badge icon from the alpha channel only
      // (a transparent-background white silhouette) -- reusing the full-color
      // app icon here (opaque background, no transparency) rendered as a
      // solid broken-looking blob. badge-96.png is a dedicated monochrome cutout.
      badge: '/icons/badge-96.png',
      data: { url },
    }),
  );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string } | undefined)?.url ?? '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client && 'url' in client) {
          void (client as WindowClient).navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
