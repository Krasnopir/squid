import type { DilemmaChoice, RoomPlayer, RpsChoice } from '@/types';

const BOT_NAMES = [
  'CryptoNinja',
  'DarkLord',
  'Shadow',
  'NeonFox',
  'TrustNo1',
  'Viper',
  'Ghost',
  'Raven',
];

export function randomBotName(used: Set<string>): string {
  const available = BOT_NAMES.filter(n => !used.has(n));
  const name = available[Math.floor(Math.random() * available.length)] ?? `Bot${used.size}`;
  used.add(name);
  return name;
}

export function botVoteTarget(bot: RoomPlayer, alive: RoomPlayer[]): number {
  const others = alive.filter(p => p.isAlive && p.userId !== bot.userId);
  if (!others.length) return 0;
  return others[Math.floor(Math.random() * others.length)]!.userId;
}

export function botDilemmaChoice(): DilemmaChoice {
  return Math.random() < 0.4 ? 'risk' : 'split';
}

export function botRpsChoice(): RpsChoice {
  const choices: RpsChoice[] = ['rock', 'paper', 'scissors'];
  return choices[Math.floor(Math.random() * choices.length)]!;
}

export function botUserId(index: number): number {
  return -(index + 1);
}
