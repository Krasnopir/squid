# Deploy key для Krasnopir/squid

Отдельный ключ — **не заменяет** `id_ed25519_github_krasnopir` и `whip_deploy`.

| Host (SSH) | Ключ | Репозиторий |
|------------|------|-------------|
| `github-krasnopir` | `~/.ssh/id_ed25519_github_krasnopir` | личные репо |
| `github-whip` | `~/.ssh/whip_deploy` | whip |
| **`github-squid`** | **`~/.ssh/id_ed25519_github_squid`** | **Krasnopir/squid** |

## Добавить ключ в GitHub (один раз)

1. Открой https://github.com/Krasnopir/squid/settings/keys
2. **Add deploy key**
3. Title: `squid-mac-deploy`
4. Key (скопируй целиком):

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBk7GPapbf9li9UnqWJAny9Yd42wKoln5oUQy177MC5E github-deploy Krasnopir/squid
```

5. **Allow write access** — включи, если будешь пушить с этой машины через deploy key.

## Клон / push с этой машины

```bash
git remote add origin git@github-squid:Krasnopir/squid.git
git push -u origin main
```

Проверка SSH:

```bash
ssh -T git@github-squid
```

Ожидаемо: `Hi Krasnopir/squid! You've successfully authenticated...`
