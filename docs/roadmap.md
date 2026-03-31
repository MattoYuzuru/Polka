# Roadmap

## Текущий статус
- Текущая ветка: `chore/project-bootstrap`
- Текущая фаза: bootstrap инфраструктуры и архитектурного каркаса
- Последнее обновление: 2026-03-31

## Этапы
| Этап | Статус | Содержимое | Артефакты |
|------|--------|------------|-----------|
| 0. Discovery и правила работы | completed | Анализ требований, документы, правила для агентов, стартовый README | `docs/plan.md`, `docs/ux.md`, `AGENTS.md`, `README.md` |
| 1. Monorepo bootstrap | completed | Angular 21, Taiga UI 4, Signal Store, lazy routes, root scripts, Dockerfiles | `frontend/`, root config |
| 2. Backend foundation | in progress | Go API, Postgres, Docker Compose, healthcheck, mock auth/profile endpoints | `backend/`, `compose.yaml` |
| 3. Auth и app shell | pending | login/register, token storage, guards, interceptors, protected routes | frontend + backend auth modules |
| 4. Books domain | pending | CRUD книг, форма, статусы, рейтинг, цитаты, мнения | books feature |
| 5. Recommendation lists | pending | CRUD списков, выбор книг, публичность, шаринг | recommendation-lists feature |
| 6. Public profile и статистика | pending | owner/guest режимы, фильтры, сортировка, метрики | profile feature |
| 7. QA и delivery | pending | unit tests, component tests, CI/CD, GHCR, deploy docs, Lighthouse | `.github/`, `docs/`, `README.md` |

## Ближайшие шаги
1. Подключить PostgreSQL к backend и перевести auth/profile на реальные репозитории и миграции.
2. Добавить регистрацию, owner/guest режим, logout UI и редактирование профиля.
3. Реализовать backend CRUD книг, цитат, мнений и рекомендательных списков.
4. Настроить ESLint, Stylelint, Jest, Playwright component tests и GitHub Actions.

## Принципы итераций
- Один вертикальный срез на одну небольшую ветку.
- Каждый шаг должен оставлять проект в собираемом состоянии.
- После каждого заметного этапа обновлять этот файл, чтобы новый агент быстро входил в контекст.
