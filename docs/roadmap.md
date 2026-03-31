# Roadmap

## Текущий статус
- Текущая ветка: `ci/ghcr-and-vps-deploy`
- Текущая фаза: GitHub Actions, GHCR и безопасный Kubernetes deploy для `polka.keykomi.com`
- Последнее обновление: 2026-03-31

## Этапы
| Этап | Статус | Содержимое | Артефакты |
|------|--------|------------|-----------|
| 0. Discovery и правила работы | completed | Анализ требований, документы, правила для агентов, стартовый README | `docs/plan.md`, `docs/ux.md`, `AGENTS.md`, `README.md` |
| 1. Monorepo bootstrap | completed | Angular 21, Taiga UI 4, Signal Store, lazy routes, root scripts, Dockerfiles | `frontend/`, root config |
| 2. Backend foundation | completed | Go API, Postgres, Docker Compose, startup migrations, seeded auth/profile persistence | `backend/`, `compose.yaml` |
| 3. Auth и app shell | completed | JWT login/register, token storage, guards, interceptors, profile edit, owner/guest profile visibility | frontend + backend auth modules |
| 4. Books domain | in progress | create/get/update/delete книг, edit mode, публичность, цитаты, мнения, reorder/top order | books feature |
| 5. Recommendation lists | in progress | create/get/update/delete списков, edit mode, публичность, owner/guest visibility | recommendation-lists feature |
| 6. Public profile и статистика | in progress | owner/guest режимы, фильтры, сортировка, метрики, reading analytics | profile feature |
| 7. QA и delivery | in progress | lint/format tooling, Jest unit tests, Playwright browser scenarios, CI/CD, GHCR, Kubernetes manifests, deploy docs, Lighthouse | `.github/`, `docs/`, `README.md`, `playwright/`, `k8s/` |

## Ближайшие шаги
1. Дождаться branch publish в GHCR и проверить, что `sha-` теги доступны для pull.
2. Применить namespace `polka` на VPS и проверить ingress/certificate для `polka.keykomi.com`.
3. Расширить Playwright-сценарии до CRUD книг/списков на owner-flow.
4. Подготовить Lighthouse-замеры, production polish и финальный deploy handoff.

## Последняя проверка
- `npm run lint`
- `npm run format:check`
- `npm run lint:frontend`
- `npm run lint:styles`
- `npm run build:frontend`
- `npm run test:frontend`
- `npm run test:component`
- `npm run test:backend`
- `npm run compose:check`
- `ssh ... sudo k3s kubectl get ns/ingress/svc`

## Принципы итераций
- Один вертикальный срез на одну небольшую ветку.
- Каждый шаг должен оставлять проект в собираемом состоянии.
- После каждого заметного этапа обновлять этот файл, чтобы новый агент быстро входил в контекст.
