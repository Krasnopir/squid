import { AppRoot } from '@telegram-apps/telegram-ui';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { RouterProvider, type AnyRouter } from '@tanstack/react-router';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { useEffect } from 'react';

import { joinRoomByCode } from '@/api/roomApi';
import { ensureRemoteUser } from '@/api/sessionApi';
import { hasSupabase } from '@/lib/config';
import { getSupabase } from '@/lib/supabase';
import { expandWebApp, getInitData, getStartParam } from '@/lib/telegram';
import { TON_CONNECT_MANIFEST_URL } from '@/lib/ton';
import { useRoomStore } from '@/store/roomStore';
import { useSessionStore } from '@/store/sessionStore';

export function Bootstrap({ queryClient, router }: { queryClient: QueryClient; router: AnyRouter }) {
  useEffect(() => {
    expandWebApp();
    useSessionStore.getState().setLoading(false);

    if (hasSupabase) {
      const sb = getSupabase();
      const initData = getInitData();
      void ensureRemoteUser()
        .then(profile => {
          if (profile) useSessionStore.getState().setProfile(profile);
        })
        .catch(() => {
          useSessionStore.getState().setLoading(false);
        });
      if (sb && initData) {
        void sb.functions.invoke('verify-init-data', { body: { initData } });
      }
    }

    const start = getStartParam();
    if (start?.startsWith('room_')) {
      const code = start.replace('room_', '');
      void joinRoomByCode(code).then(room => {
        useRoomStore.getState().setRoom(room);
        router.navigate({ to: '/room/$roomId', params: { roomId: room.id } });
      });
    }
  }, [router]);

  return (
    <TonConnectUIProvider manifestUrl={TON_CONNECT_MANIFEST_URL}>
      <AppRoot appearance="dark">
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </AppRoot>
    </TonConnectUIProvider>
  );
}
