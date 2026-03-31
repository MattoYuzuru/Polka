# Roadmap

## Текущий статус
- Текущая ветка: `chore/lint-and-format-tooling`
- Текущая фаза: ESLint, Stylelint и Prettier tooling для frontend и root scripts
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
| 7. QA и delivery | in progress | lint/format tooling, unit tests, component tests, CI/CD, GHCR, deploy docs, Lighthouse | `.github/`, `docs/`, `README.md` |

## Ближайшие шаги
1. Перевести unit tests на Jest и собрать 10-15 покрывающих сценариев.
2. Добавить Playwright component/e2e сценарии под login, CRUD и фильтрацию.
3. Подготовить GitHub Actions: lint, test, build и публикация образов в GHCR.
4. Добавить production compose, deploy flow на VPS и Lighthouse-замеры.

## Последняя проверка
- `npm run lint:frontend`
- `npm run lint:styles`
- `npm run format:check`
- `npm run build:frontend`
- `npm run test:frontend`
- `npm run test:backend`

## Принципы итераций
- Один вертикальный срез на одну небольшую ветку.
- Каждый шаг должен оставлять проект в собираемом состоянии.
- После каждого заметного этапа обновлять этот файл, чтобы новый агент быстро входил в контекст.
