import { useMock } from '@/lib/config';
import {
  advancePhase,
  createMockRoom,
  fillBots,
  joinMockRoom,
  setReady,
  startMockRoom,
  submitDilemma,
  submitRps,
  submitVote,
  tickRoom,
} from '@/lib/mock/mockEngine';
import { mapRoom } from '@/api/mapRoom';
import { ensureRemoteUser } from '@/api/sessionApi';
import { getSupabase } from '@/lib/supabase';
import { getTelegramUser } from '@/lib/telegram';
import type { DilemmaChoice, Room, RpsChoice } from '@/types';

const rooms = new Map<string, Room>();

function cacheRoom(room: Room) {
  rooms.set(room.id, room);
  return room;
}

function getCached(id: string): Room | null {
  return rooms.get(id) ?? null;
}

function requireSupabase() {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase не настроен. Включите VITE_USE_MOCK=true или добавьте env.');
  return sb;
}

function roomError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  const known: Record<string, string> = {
    room_not_found: 'Комната не найдена',
    room_full: 'Комната уже заполнена',
    room_started: 'Игра уже началась',
    insufficient_coins: 'Недостаточно монет',
    not_host: 'Начать игру может только создатель комнаты',
    not_enough_players: 'Нужно минимум 2 игрока',
  };
  if (message.includes('Failed to send a request to the Edge Function')) {
    return new Error('Edge Function match-queue недоступна. Проверь deploy функции и SUPABASE_SERVICE_ROLE_KEY.');
  }
  return new Error(known[message] ?? message);
}

export async function fetchRoom(roomId: string): Promise<Room | null> {
  if (useMock) return getCached(roomId);
  const sb = requireSupabase();
  const { data, error } = await sb.rpc('get_room_state', { p_room_id: roomId });
  if (error) throw roomError(error);
  return mapRoom(data as Record<string, unknown>);
}

export async function createRoom(maxPlayers: number, isPrivate = false): Promise<Room> {
  if (useMock) {
    const room = cacheRoom(createMockRoom(maxPlayers, isPrivate));
    return room;
  }
  await ensureRemoteUser();
  const sb = requireSupabase();
  const u = getTelegramUser();
  const { data, error } = await sb.rpc('create_room', {
    p_user_id: u.id,
    p_max_players: maxPlayers,
    p_is_private: isPrivate,
  });
  if (error) throw roomError(error);
  return mapRoom(data as Record<string, unknown>)!;
}

export async function joinRoomByCode(code: string): Promise<Room> {
  if (useMock) {
    const existing = [...rooms.values()].find(r => r.code === code);
    if (existing) return cacheRoom(joinMockRoom(existing));
    throw new Error('Комната не найдена');
  }
  await ensureRemoteUser();
  const sb = requireSupabase();
  const u = getTelegramUser();
  const { data, error } = await sb.rpc('join_room', { p_user_id: u.id, p_code: code });
  if (error) throw roomError(error);
  return mapRoom(data as Record<string, unknown>)!;
}

export async function joinRoom(roomId: string): Promise<Room> {
  if (useMock) {
    const r = getCached(roomId);
    if (!r) throw new Error('Комната не найдена');
    return cacheRoom(joinMockRoom(r));
  }
  await ensureRemoteUser();
  const sb = requireSupabase();
  const u = getTelegramUser();
  const { data, error } = await sb.rpc('join_room', { p_user_id: u.id, p_room_id: roomId });
  if (error) throw roomError(error);
  return mapRoom(data as Record<string, unknown>)!;
}

export async function setRoomReady(roomId: string, ready: boolean): Promise<Room> {
  if (useMock) {
    const r = getCached(roomId)!;
    const u = getTelegramUser();
    return cacheRoom(setReady(r, u.id, ready));
  }
  await ensureRemoteUser();
  const sb = requireSupabase();
  const { data, error } = await sb.rpc('set_ready', {
    p_room_id: roomId,
    p_user_id: getTelegramUser().id,
    p_ready: ready,
  });
  if (error) throw roomError(error);
  return mapRoom(data as Record<string, unknown>)!;
}

export async function startRoom(roomId: string): Promise<Room> {
  if (useMock) {
    let r = getCached(roomId)!;
    while (r.players.length < Math.min(3, r.maxPlayers) && r.maxPlayers > 2) {
      r = fillBots(r, 1);
    }
    return cacheRoom(startMockRoom(r));
  }
  await ensureRemoteUser();
  const sb = requireSupabase();
  const { data, error } = await sb.rpc('start_room', {
    p_room_id: roomId,
    p_user_id: getTelegramUser().id,
  });
  if (error) throw roomError(error);
  return mapRoom(data as Record<string, unknown>)!;
}

export async function castVote(roomId: string, targetId: number): Promise<Room> {
  if (useMock) {
    const r = submitVote(getCached(roomId)!, getTelegramUser().id, targetId);
    return cacheRoom(r);
  }
  await ensureRemoteUser();
  const sb = requireSupabase();
  const { data, error } = await sb.rpc('submit_vote', {
    p_room_id: roomId,
    p_user_id: getTelegramUser().id,
    p_target_id: targetId,
  });
  if (error) throw roomError(error);
  return mapRoom(data as Record<string, unknown>)!;
}

export async function castDilemma(roomId: string, choice: DilemmaChoice): Promise<Room> {
  if (useMock) {
    return cacheRoom(submitDilemma(getCached(roomId)!, getTelegramUser().id, choice));
  }
  await ensureRemoteUser();
  const sb = requireSupabase();
  const { data, error } = await sb.rpc('submit_dilemma', {
    p_room_id: roomId,
    p_user_id: getTelegramUser().id,
    p_choice: choice,
  });
  if (error) throw roomError(error);
  return mapRoom(data as Record<string, unknown>)!;
}

export async function castRps(roomId: string, choice: RpsChoice): Promise<Room> {
  if (useMock) {
    return cacheRoom(submitRps(getCached(roomId)!, getTelegramUser().id, choice));
  }
  await ensureRemoteUser();
  const sb = requireSupabase();
  const { data, error } = await sb.rpc('submit_rps', {
    p_room_id: roomId,
    p_user_id: getTelegramUser().id,
    p_choice: choice,
  });
  if (error) throw roomError(error);
  return mapRoom(data as Record<string, unknown>)!;
}

export async function tickRoomState(roomId: string): Promise<Room> {
  if (useMock) {
    return cacheRoom(tickRoom(getCached(roomId)!));
  }
  return (await fetchRoom(roomId))!;
}

export async function enqueueQuickGame(desired = 6): Promise<Room> {
  if (useMock) {
    await new Promise(r => setTimeout(r, 1500));
    let room = cacheRoom(createMockRoom(desired));
    const need = Math.max(0, 3 - room.players.length);
    if (need > 0) room = cacheRoom(fillBots(room, need + 2));
    room = cacheRoom(startMockRoom(room));
    return room;
  }
  await ensureRemoteUser();
  const sb = requireSupabase();
  const u = getTelegramUser();
  const { data, error } = await sb.functions.invoke('match-queue', {
    body: { user_id: u.id, desired },
  });
  if (error) throw roomError(error);
  const room = mapRoom(data as Record<string, unknown>);
  if (room?.id) return room;
  await new Promise(r => setTimeout(r, 3000));
  throw new Error('Очередь: недостаточно игроков, попробуйте снова');
}

export { advancePhase };
