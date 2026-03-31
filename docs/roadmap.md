# Roadmap

## Текущий статус
- Текущая ветка: `feat/recommendation-lists`
- Текущая фаза: реальные recommendation lists с выбором книг из библиотеки и публичной страницей списка
- Последнее обновление: 2026-03-31

## Этапы
| Этап | Статус | Содержимое | Артефакты |
|------|--------|------------|-----------|
| 0. Discovery и правила работы | completed | Анализ требований, документы, правила для агентов, стартовый README | `docs/plan.md`, `docs/ux.md`, `AGENTS.md`, `README.md` |
| 1. Monorepo bootstrap | completed | Angular 21, Taiga UI 4, Signal Store, lazy routes, root scripts, Dockerfiles | `frontend/`, root config |
| 2. Backend foundation | completed | Go API, Postgres, Docker Compose, startup migrations, seeded auth/profile persistence | `backend/`, `compose.yaml` |
| 3. Auth и app shell | completed | JWT login/register, token storage, guards, interceptors, profile edit, owner/guest profile visibility | frontend + backend auth modules |
| 4. Books domain | in progress | create/get/update/delete книг, edit mode, публичность, цитаты, мнения | books feature |
| 5. Recommendation lists | in progress | create/get списков, выбор книг, публичная страница списка, owner/guest visibility | recommendation-lists feature |
| 6. Public profile и статистика | in progress | owner/guest режимы, фильтры, сортировка, метрики | profile feature |
| 7. QA и delivery | pending | unit tests, component tests, CI/CD, GHCR, deploy docs, Lighthouse | `.github/`, `docs/`, `README.md` |

## Ближайшие шаги
1. Добавить update/delete/toggle visibility для recommendation lists и owner actions на профиле.
2. Добавить reorder/top mechanics и более богатые owner actions в библиотеке.
3. Настроить ESLint, Stylelint, Jest, Playwright component tests и GitHub Actions.
4. Подготовить публикацию контейнеров в GHCR и production compose для VPS.

## Последняя проверка
- `npm run test:backend`
- `npm run build:frontend`
- `npm run test:frontend`
- `docker compose up -d --build postgres backend`
- `POST /api/v1/recommendation-lists`
- `GET /api/v1/recommendation-lists/:id` как гость
- `GET /api/v1/recommendation-lists/:id` как владелец
- `GET /api/v1/profiles/mattoy` после создания списка

## Принципы итераций
- Один вертикальный срез на одну небольшую ветку.
- Каждый шаг должен оставлять проект в собираемом состоянии.
- После каждого заметного этапа обновлять этот файл, чтобы новый агент быстро входил в контекст.
