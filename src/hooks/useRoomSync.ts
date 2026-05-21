import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { fetchRoom, heartbeatRoom, tickRoomState } from '@/api/roomApi';
import { queryKeys } from '@/api/queryKeys';
import { useMock } from '@/lib/config';
import { getSupabase } from '@/lib/supabase';
import { useRoomStore } from '@/store/roomStore';
import type { Room } from '@/types';

export function useRoomSync(roomId: string | undefined) {
  const queryClient = useQueryClient();
  const setRoom = useRoomStore(s => s.setRoom);

  const query = useQuery({
    queryKey: queryKeys.room(roomId ?? ''),
    queryFn: () => fetchRoom(roomId!),
    enabled: !!roomId,
    refetchInterval: useMock ? false : 2000,
  });

  useEffect(() => {
    if (query.data) setRoom(query.data);
  }, [query.data, setRoom]);

  useEffect(() => {
    if (!roomId || !useMock) return;
    const id = setInterval(async () => {
      const r = await tickRoomState(roomId);
      if (r) {
        queryClient.setQueryData(queryKeys.room(roomId), r);
        setRoom(r);
      }
    }, 500);
    return () => clearInterval(id);
  }, [roomId, queryClient, setRoom]);

  useEffect(() => {
    if (!roomId || useMock || !query.data?.phaseEndsAt) return;
    const delay = new Date(query.data.phaseEndsAt).getTime() - Date.now() + 250;
    const id = setTimeout(async () => {
      try {
        const r = await tickRoomState(roomId);
        queryClient.setQueryData(queryKeys.room(roomId), r);
        setRoom(r);
      } catch {
        await queryClient.invalidateQueries({ queryKey: queryKeys.room(roomId) });
      }
    }, Math.max(250, delay));
    return () => clearTimeout(id);
  }, [query.data?.phase, query.data?.phaseEndsAt, queryClient, roomId, setRoom]);

  useEffect(() => {
    if (!roomId || useMock) return;
    const beat = () => {
      void heartbeatRoom(roomId)
        .then(r => {
          if (r) {
            queryClient.setQueryData(queryKeys.room(roomId), r);
            setRoom(r);
          }
        })
        .catch(() => {});
    };
    beat();
    const id = setInterval(beat, 10000);
    return () => clearInterval(id);
  }, [roomId, queryClient, setRoom]);

  useEffect(() => {
    if (!roomId || useMock) return;
    const sb = getSupabase();
    if (!sb) return;
    const channel = sb
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        () => queryClient.invalidateQueries({ queryKey: queryKeys.room(roomId) }),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${roomId}` },
        () => queryClient.invalidateQueries({ queryKey: queryKeys.room(roomId) }),
      )
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, [roomId, queryClient]);

  return { room: query.data as Room | undefined, isLoading: query.isLoading, refetch: query.refetch };
}
