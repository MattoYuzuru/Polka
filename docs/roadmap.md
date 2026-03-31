# Roadmap

## Текущий статус
- Текущая ветка: `feat/recommendation-lists-owner-actions`
- Текущая фаза: owner actions для recommendation lists, edit mode и управление публичностью
- Последнее обновление: 2026-03-31

## Этапы
| Этап | Статус | Содержимое | Артефакты |
|------|--------|------------|-----------|
| 0. Discovery и правила работы | completed | Анализ требований, документы, правила для агентов, стартовый README | `docs/plan.md`, `docs/ux.md`, `AGENTS.md`, `README.md` |
| 1. Monorepo bootstrap | completed | Angular 21, Taiga UI 4, Signal Store, lazy routes, root scripts, Dockerfiles | `frontend/`, root config |
| 2. Backend foundation | completed | Go API, Postgres, Docker Compose, startup migrations, seeded auth/profile persistence | `backend/`, `compose.yaml` |
| 3. Auth и app shell | completed | JWT login/register, token storage, guards, interceptors, profile edit, owner/guest profile visibility | frontend + backend auth modules |
| 4. Books domain | in progress | create/get/update/delete книг, edit mode, публичность, цитаты, мнения | books feature |
| 5. Recommendation lists | in progress | create/get/update/delete списков, edit mode, публичность, owner/guest visibility | recommendation-lists feature |
| 6. Public profile и статистика | in progress | owner/guest режимы, фильтры, сортировка, метрики | profile feature |
| 7. QA и delivery | pending | unit tests, component tests, CI/CD, GHCR, deploy docs, Lighthouse | `.github/`, `docs/`, `README.md` |

## Ближайшие шаги
1. Добавить reorder/top mechanics и более богатые owner actions в библиотеке.
2. Настроить ESLint, Stylelint, Jest, Playwright component tests и GitHub Actions.
3. Подготовить публикацию контейнеров в GHCR и production compose для VPS.
4. Добавить фильтры, сортировку и вычисляемую статистику чтения за период.

## Последняя проверка
- `npm run test:backend`
- `npm run build:frontend`
- `npm run test:frontend`
- `docker compose up -d --build postgres backend`
- `POST /api/v1/recommendation-lists`
- `PATCH /api/v1/recommendation-lists/:id`
- `PATCH /api/v1/recommendation-lists/:id/visibility`
- `DELETE /api/v1/recommendation-lists/:id`
- `GET /api/v1/profiles/mattoy` после owner mutations

## Принципы итераций
- Один вертикальный срез на одну небольшую ветку.
- Каждый шаг должен оставлять проект в собираемом состоянии.
- После каждого заметного этапа обновлять этот файл, чтобы новый агент быстро входил в контекст.
