import { PHASE_DURATIONS, ROOM_ENTRY_FEE } from '@/lib/config';
import { getTelegramUser } from '@/lib/telegram';
import {
  botDilemmaChoice,
  botRpsChoice,
  botUserId,
  botVoteTarget,
  nextPhase,
  randomBotName,
  resolveDilemma,
  resolveRps,
  resolveVote,
} from '@/game-engine';
import type { DilemmaChoice, Phase, Room, RoomPlayer, RpsChoice } from '@/types';

let roomCounter = 0;

function genCode(): string {
  return String(10000 + Math.floor(Math.random() * 90000));
}

function phaseEnd(seconds: number): string {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

export function createMockRoom(maxPlayers: number, isPrivate = false): Room {
  const human = getTelegramUser();
  roomCounter++;
  const id = `mock-${roomCounter}`;
  const host: RoomPlayer = {
    userId: human.id,
    displayName: human.first_name,
    username: human.username,
    seat: 0,
    isReady: true,
    isAlive: true,
    isBot: false,
  };
  return {
    id,
    code: genCode(),
    hostId: human.id,
    status: 'waiting',
    maxPlayers,
    mode: maxPlayers <= 2 ? 'duel' : 'classic',
    pot: 0,
    phase: 'lobby',
    roundIndex: 0,
    phaseEndsAt: null,
    entryFee: ROOM_ENTRY_FEE,
    players: [host],
  };
}

export function fillBots(room: Room, count: number): Room {
  const used = new Set(room.players.map(p => p.displayName));
  const bots: RoomPlayer[] = [];
  for (let i = 0; i < count; i++) {
    const name = randomBotName(used);
    bots.push({
      userId: botUserId(room.players.length + i),
      displayName: name,
      username: name.toLowerCase(),
      seat: room.players.length + i,
      isReady: true,
      isAlive: true,
      isBot: true,
    });
  }
  return { ...room, players: [...room.players, ...bots] };
}

export function joinMockRoom(room: Room): Room {
  const human = getTelegramUser();
  if (room.players.some(p => p.userId === human.id)) return room;
  if (room.players.length >= room.maxPlayers) return room;
  return {
    ...room,
    players: [
      ...room.players,
      {
        userId: human.id,
        displayName: human.first_name,
        username: human.username,
        seat: room.players.length,
        isReady: false,
        isAlive: true,
        isBot: false,
      },
    ],
  };
}

export function setReady(room: Room, userId: number, ready: boolean): Room {
  return {
    ...room,
    players: room.players.map(p => (p.userId === userId ? { ...p, isReady: ready } : p)),
  };
}

export function startMockRoom(room: Room): Room {
  const alive = room.players.filter(p => p.isAlive);
  const fee = room.entryFee * alive.length;
  const phase: Phase = room.mode === 'duel' ? 'finals' : 'vote';
  return {
    ...room,
    status: 'playing',
    pot: fee,
    phase,
    roundIndex: 0,
    phaseEndsAt: phaseEnd(PHASE_DURATIONS[phase]),
  };
}

function alivePlayers(room: Room): RoomPlayer[] {
  return room.players.filter(p => p.isAlive);
}

function autofillBots(room: Room): Room {
  const phase = room.phase;
  return {
    ...room,
    players: room.players.map(p => {
      if (!p.isBot || !p.isAlive) return p;
      if (phase === 'vote' && !p.voteTarget) {
        return { ...p, voteTarget: botVoteTarget(p, alivePlayers(room)) };
      }
      if (phase === 'dilemma' && !p.dilemmaChoice) {
        return { ...p, dilemmaChoice: botDilemmaChoice() };
      }
      if (phase === 'finals' && !p.rpsChoice) {
        return { ...p, rpsChoice: botRpsChoice() };
      }
      return p;
    }),
  };
}

export function submitVote(room: Room, userId: number, targetId: number): Room {
  let r = {
    ...room,
    players: room.players.map(p =>
      p.userId === userId ? { ...p, voteTarget: targetId } : p,
    ),
  };
  r = autofillBots(r);
  const allVoted = alivePlayers(r).every(p => p.voteTarget);
  if (allVoted) return advancePhase(r);
  return r;
}

export function submitDilemma(room: Room, userId: number, choice: DilemmaChoice): Room {
  let r = {
    ...room,
    players: room.players.map(p =>
      p.userId === userId ? { ...p, dilemmaChoice: choice } : p,
    ),
  };
  r = autofillBots(r);
  const allChose = alivePlayers(r).every(p => p.dilemmaChoice);
  if (allChose) return advancePhase(r);
  return r;
}

export function submitRps(room: Room, userId: number, choice: RpsChoice): Room {
  let r = {
    ...room,
    players: room.players.map(p =>
      p.userId === userId ? { ...p, rpsChoice: choice } : p,
    ),
  };
  r = autofillBots(r);
  const alive = alivePlayers(r);
  if (alive.length === 2 && alive.every(p => p.rpsChoice)) return advancePhase(r);
  return r;
}

export function tickRoom(room: Room): Room {
  if (room.status !== 'playing' || !room.phaseEndsAt) return room;
  if (new Date(room.phaseEndsAt).getTime() > Date.now()) return autofillBots(room);
  return advancePhase(autofillBots(room));
}

export function advancePhase(room: Room): Room {
  const alive = alivePlayers(room);

  if (room.phase === 'vote') {
    const votes = new Map<number, number>();
    for (const p of alive) {
      if (p.voteTarget) votes.set(p.userId, p.voteTarget);
    }
    const { eliminated } = resolveVote(alive, votes);
    const eliminatedIds = new Set(eliminated.map(e => e.userId));
    let r: Room = {
      ...room,
      players: room.players.map(p => ({
        ...p,
        isAlive: eliminatedIds.has(p.userId) ? false : p.isAlive,
        voteTarget: undefined,
      })),
      lastEliminated: eliminated[0],
      phase: 'reveal_elimination',
      phaseEndsAt: phaseEnd(PHASE_DURATIONS.reveal_elimination),
    };
    return r;
  }

  if (room.phase === 'reveal_elimination') {
    const stillAlive = alivePlayers(room);
    const roundIndex = room.roundIndex + 1;
    const phase = nextPhase({
      aliveCount: stillAlive.length,
      roundIndex,
      mode: room.mode,
    });
    return {
      ...room,
      roundIndex,
      phase,
      phaseEndsAt: phaseEnd(PHASE_DURATIONS[phase]),
      lastEliminated: undefined,
      players: room.players.map(p => ({
        ...p,
        dilemmaChoice: undefined,
        rpsChoice: undefined,
      })),
    };
  }

  if (room.phase === 'dilemma') {
    const choices = new Map<number, DilemmaChoice>();
    for (const p of alive) {
      if (p.dilemmaChoice) choices.set(p.userId, p.dilemmaChoice);
    }
    const { outcome, endMatch } = resolveDilemma(alive, choices);
    if (endMatch && outcome === 'split') {
      const share = Math.floor(room.pot / alive.length);
      return {
        ...room,
        status: 'finished',
        phase: 'results',
        phaseEndsAt: phaseEnd(PHASE_DURATIONS.results),
        winnerId: undefined,
        pot: share * alive.length,
        players: room.players.map(p => ({ ...p, dilemmaChoice: undefined })),
      };
    }
    const newPot = outcome === 'risk' ? room.pot + room.entryFee * alive.length : room.pot;
    const roundIndex = room.roundIndex + 1;
    const phase = nextPhase({
      aliveCount: alive.length,
      roundIndex,
      mode: room.mode,
    });
    return {
      ...room,
      pot: newPot,
      roundIndex,
      phase,
      phaseEndsAt: phaseEnd(PHASE_DURATIONS[phase]),
      players: room.players.map(p => ({ ...p, dilemmaChoice: undefined })),
    };
  }

  if (room.phase === 'finals') {
    if (alive.length < 2) {
      return {
        ...room,
        status: 'finished',
        phase: 'results',
        winnerId: alive[0]?.userId,
        phaseEndsAt: phaseEnd(PHASE_DURATIONS.results),
      };
    }
    const [p1, p2] = alive;
    const c1 = p1.rpsChoice ?? botRpsChoice();
    const c2 = p2.rpsChoice ?? botRpsChoice();
    const { winner, draw } = resolveRps(p1, c1, p2, c2);
    if (draw) {
      return {
        ...room,
        players: room.players.map(p => ({ ...p, rpsChoice: undefined })),
        phaseEndsAt: phaseEnd(PHASE_DURATIONS.finals),
      };
    }
    return {
      ...room,
      status: 'finished',
      phase: 'results',
      winnerId: winner?.userId,
      phaseEndsAt: phaseEnd(PHASE_DURATIONS.results),
      players: room.players.map(p => ({ ...p, rpsChoice: undefined })),
    };
  }

  return room;
}
