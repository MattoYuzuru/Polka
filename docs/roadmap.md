# Roadmap

## Текущий статус
- Текущая ветка: `feat/postgres-auth-persistence`
- Текущая фаза: backend persistence для auth/profile и реальная owner/guest выборка
- Последнее обновление: 2026-03-31

## Этапы
| Этап | Статус | Содержимое | Артефакты |
|------|--------|------------|-----------|
| 0. Discovery и правила работы | completed | Анализ требований, документы, правила для агентов, стартовый README | `docs/plan.md`, `docs/ux.md`, `AGENTS.md`, `README.md` |
| 1. Monorepo bootstrap | completed | Angular 21, Taiga UI 4, Signal Store, lazy routes, root scripts, Dockerfiles | `frontend/`, root config |
| 2. Backend foundation | completed | Go API, Postgres, Docker Compose, startup migrations, seeded auth/profile persistence | `backend/`, `compose.yaml` |
| 3. Auth и app shell | in progress | JWT login, token storage, guards, interceptors, owner/guest profile visibility | frontend + backend auth modules |
| 4. Books domain | pending | CRUD книг, форма, статусы, рейтинг, цитаты, мнения | books feature |
| 5. Recommendation lists | pending | CRUD списков, выбор книг, публичность, шаринг | recommendation-lists feature |
| 6. Public profile и статистика | pending | owner/guest режимы, фильтры, сортировка, метрики | profile feature |
| 7. QA и delivery | pending | unit tests, component tests, CI/CD, GHCR, deploy docs, Lighthouse | `.github/`, `docs/`, `README.md` |

## Ближайшие шаги
1. Добавить регистрацию, owner/guest режим, logout UI и редактирование профиля.
2. Реализовать backend CRUD книг, цитат, мнений и рекомендательных списков.
3. Настроить ESLint, Stylelint, Jest, Playwright component tests и GitHub Actions.
4. Подготовить публикацию контейнеров в GHCR и production compose для VPS.

## Последняя проверка
- `npm run test:backend`
- `npm run compose:check`
- `docker compose up -d --build postgres backend`
- `curl http://localhost:8080/api/v1/health`
- `POST /api/v1/auth/login`
- `GET /api/v1/profiles/mattoy` как гость и как владелец

## Принципы итераций
- Один вертикальный срез на одну небольшую ветку.
- Каждый шаг должен оставлять проект в собираемом состоянии.
- После каждого заметного этапа обновлять этот файл, чтобы новый агент быстро входил в контекст.
