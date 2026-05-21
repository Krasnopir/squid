import type { TelegramUser } from '@/types';

export const BOT_USERNAME = 'bro_squid_bot';
export const MINI_APP_NAME = 'app';
export const MINI_APP_PATH = `https://t.me/${BOT_USERNAME}/${MINI_APP_NAME}`;

export const MOCK_USER: TelegramUser = {
  id: 123456789,
  first_name: 'Алекс',
  last_name: 'Крипто',
  username: 'alexcrypto',
};

const isTelegramWebApp = (): boolean =>
  typeof window !== 'undefined' &&
  !!(window as unknown as Record<string, unknown>)['Telegram'];

export const isTMA = isTelegramWebApp;

export const getTelegramUser = (): TelegramUser => {
  if (isTelegramWebApp()) {
    const tg = (
      window as unknown as { Telegram: { WebApp: { initDataUnsafe: { user: TelegramUser } } } }
    ).Telegram.WebApp;
    if (tg.initDataUnsafe?.user) return tg.initDataUnsafe.user;
  }
  return MOCK_USER;
};

export const getInitData = (): string => {
  try {
    if (isTelegramWebApp()) {
      return (
        window as unknown as { Telegram: { WebApp: { initData: string } } }
      ).Telegram.WebApp.initData;
    }
  } catch {
    /* noop */
  }
  return '';
};

export const getStartParam = (): string | null => {
  try {
    if (isTelegramWebApp()) {
      const tg = (
        window as unknown as { Telegram: { WebApp: { initDataUnsafe: { start_param?: string } } } }
      ).Telegram.WebApp;
      return tg.initDataUnsafe?.start_param ?? null;
    }
  } catch {
    /* noop */
  }
  const params = new URLSearchParams(window.location.search);
  return params.get('startapp') ?? params.get('tgWebAppStartParam');
};

export const expandWebApp = () => {
  try {
    if (isTelegramWebApp()) {
      (window as unknown as { Telegram: { WebApp: { expand: () => void } } }).Telegram.WebApp.expand();
    }
  } catch {
    /* noop */
  }
};

export const hapticImpact = (style: 'light' | 'medium' | 'heavy' = 'medium') => {
  try {
    if (isTelegramWebApp()) {
      (
        window as unknown as {
          Telegram: { WebApp: { HapticFeedback: { impactOccurred: (s: string) => void } } };
        }
      ).Telegram.WebApp.HapticFeedback.impactOccurred(style);
    }
  } catch {
    /* noop */
  }
};

export const hapticNotification = (type: 'success' | 'warning' | 'error' = 'success') => {
  try {
    if (isTelegramWebApp()) {
      (
        window as unknown as {
          Telegram: { WebApp: { HapticFeedback: { notificationOccurred: (t: string) => void } } };
        }
      ).Telegram.WebApp.HapticFeedback.notificationOccurred(type);
    }
  } catch {
    /* noop */
  }
};

export const shareResult = (text: string) => {
  try {
    if (isTelegramWebApp()) {
      const tg = (
        window as unknown as {
          Telegram: { WebApp: { switchInlineQuery: (q: string, choose?: string[]) => void } };
        }
      ).Telegram.WebApp;
      tg.switchInlineQuery(text, ['users', 'groups']);
    }
  } catch {
    /* noop */
  }
};
