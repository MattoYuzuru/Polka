# Roadmap

## Текущий статус
- Текущая ветка: `test/jest-and-playwright-foundation`
- Текущая фаза: Jest unit tests и Playwright browser scenarios для ключевых user flows
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
| 7. QA и delivery | in progress | lint/format tooling, Jest unit tests, Playwright browser scenarios, CI/CD, GHCR, deploy docs, Lighthouse | `.github/`, `docs/`, `README.md`, `playwright/` |

## Ближайшие шаги
1. Подготовить GitHub Actions: lint, test, build и публикация образов в GHCR.
2. Добавить production compose, deploy flow на VPS и handoff-команды для VPS.
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

## Принципы итераций
- Один вертикальный срез на одну небольшую ветку.
- Каждый шаг должен оставлять проект в собираемом состоянии.
- После каждого заметного этапа обновлять этот файл, чтобы новый агент быстро входил в контекст.
