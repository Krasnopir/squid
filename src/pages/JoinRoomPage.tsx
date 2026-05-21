import { useNavigate } from '@tanstack/react-router';
import { Button, Input } from '@telegram-apps/telegram-ui';
import { useState } from 'react';

import { joinRoomByCode } from '@/api/roomApi';
import { useRoomStore } from '@/store/roomStore';

export function JoinRoomPage() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const setRoom = useRoomStore(s => s.setRoom);

  const join = async () => {
    setError('');
    try {
      const room = await joinRoomByCode(code.trim());
      setRoom(room);
      navigate({ to: '/room/$roomId', params: { roomId: room.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка входа');
    }
  };

  return (
    <div className="page-scroll page-pad flex flex-col gap-4">
      <h1 className="text-xl font-bold">Приватная комната</h1>
      <p className="text-sm text-[var(--app-hint)]">Введите 5-значный код</p>
      <Input
        value={code}
        onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
        placeholder="78421"
        inputMode="numeric"
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <Button stretched size="l" onClick={join} disabled={code.length < 4}>
        Войти
      </Button>
    </div>
  );
}
