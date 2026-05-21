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

export async function fetchRoom(roomId: string): Promise<Room | null> {
  if (useMock) return getCached(roomId);
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.rpc('get_room_state', { p_room_id: roomId });
  if (error) throw error;
  return mapRoom(data as Record<string, unknown>);
}

export async function createRoom(maxPlayers: number, isPrivate = false): Promise<Room> {
  if (useMock) {
    const room = cacheRoom(createMockRoom(maxPlayers, isPrivate));
    return room;
  }
  const sb = getSupabase()!;
  const u = getTelegramUser();
  const { data, error } = await sb.rpc('create_room', {
    p_user_id: u.id,
    p_max_players: maxPlayers,
    p_is_private: isPrivate,
  });
  if (error) throw error;
  return mapRoom(data as Record<string, unknown>)!;
}

export async function joinRoomByCode(code: string): Promise<Room> {
  if (useMock) {
    const existing = [...rooms.values()].find(r => r.code === code);
    if (existing) return cacheRoom(joinMockRoom(existing));
    throw new Error('Комната не найдена');
  }
  const sb = getSupabase()!;
  const u = getTelegramUser();
  const { data, error } = await sb.rpc('join_room', { p_user_id: u.id, p_code: code });
  if (error) throw error;
  return mapRoom(data as Record<string, unknown>)!;
}

export async function joinRoom(roomId: string): Promise<Room> {
  if (useMock) {
    const r = getCached(roomId);
    if (!r) throw new Error('Комната не найдена');
    return cacheRoom(joinMockRoom(r));
  }
  const sb = getSupabase()!;
  const u = getTelegramUser();
  const { data, error } = await sb.rpc('join_room', { p_user_id: u.id, p_room_id: roomId });
  if (error) throw error;
  return mapRoom(data as Record<string, unknown>)!;
}

export async function setRoomReady(roomId: string, ready: boolean): Promise<Room> {
  if (useMock) {
    const r = getCached(roomId)!;
    const u = getTelegramUser();
    return cacheRoom(setReady(r, u.id, ready));
  }
  const sb = getSupabase()!;
  const { data, error } = await sb.rpc('set_ready', {
    p_room_id: roomId,
    p_user_id: getTelegramUser().id,
    p_ready: ready,
  });
  if (error) throw error;
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
  const sb = getSupabase()!;
  const { data, error } = await sb.rpc('start_room', {
    p_room_id: roomId,
    p_user_id: getTelegramUser().id,
  });
  if (error) throw error;
  return mapRoom(data as Record<string, unknown>)!;
}

export async function castVote(roomId: string, targetId: number): Promise<Room> {
  if (useMock) {
    const r = submitVote(getCached(roomId)!, getTelegramUser().id, targetId);
    return cacheRoom(r);
  }
  const sb = getSupabase()!;
  const { data, error } = await sb.rpc('submit_vote', {
    p_room_id: roomId,
    p_user_id: getTelegramUser().id,
    p_target_id: targetId,
  });
  if (error) throw error;
  return mapRoom(data as Record<string, unknown>)!;
}

export async function castDilemma(roomId: string, choice: DilemmaChoice): Promise<Room> {
  if (useMock) {
    return cacheRoom(submitDilemma(getCached(roomId)!, getTelegramUser().id, choice));
  }
  const sb = getSupabase()!;
  const { data, error } = await sb.rpc('submit_dilemma', {
    p_room_id: roomId,
    p_user_id: getTelegramUser().id,
    p_choice: choice,
  });
  if (error) throw error;
  return mapRoom(data as Record<string, unknown>)!;
}

export async function castRps(roomId: string, choice: RpsChoice): Promise<Room> {
  if (useMock) {
    return cacheRoom(submitRps(getCached(roomId)!, getTelegramUser().id, choice));
  }
  const sb = getSupabase()!;
  const { data, error } = await sb.rpc('submit_rps', {
    p_room_id: roomId,
    p_user_id: getTelegramUser().id,
    p_choice: choice,
  });
  if (error) throw error;
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
  const sb = getSupabase()!;
  const u = getTelegramUser();
  const { data, error } = await sb.functions.invoke('match-queue', {
    body: { user_id: u.id, desired },
  });
  if (error) throw error;
  const room = mapRoom(data as Record<string, unknown>);
  if (room?.id) return room;
  await new Promise(r => setTimeout(r, 3000));
  throw new Error('Очередь: недостаточно игроков, попробуйте снова');
}

export { advancePhase };
