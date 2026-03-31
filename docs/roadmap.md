# Roadmap

## Текущий статус

- Текущая ветка: `feat/minimal-ui-redesign`
- Текущая фаза: UI/UX redesign основного пользовательского пути
- Последнее обновление: 2026-03-31

## Этапы

| Этап                           | Статус      | Содержимое                                                                                                                                          | Артефакты                                               |
| ------------------------------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 0. Discovery и правила работы  | completed   | Анализ требований, документы, правила для агентов, стартовый README                                                                                 | `docs/plan.md`, `docs/ux.md`, `AGENTS.md`, `README.md`  |
| 1. Monorepo bootstrap          | completed   | Angular 21, Taiga UI 4, Signal Store, lazy routes, root scripts, Dockerfiles                                                                        | `frontend/`, root config                                |
| 2. Backend foundation          | completed   | Go API, Postgres, Docker Compose, startup migrations, seeded auth/profile persistence                                                               | `backend/`, `compose.yaml`                              |
| 3. Auth и app shell            | completed   | JWT login/register, token storage, guards, interceptors, profile edit, owner/guest profile visibility                                               | frontend + backend auth modules                         |
| 4. Books domain                | completed   | create/get/update/delete книг, edit mode, публичность, цитаты, мнения, reorder/top order, cover upload через S3-compatible storage                  | books feature                                           |
| 5. Recommendation lists        | completed   | create/get/update/delete списков, edit mode, публичность, owner/guest visibility                                                                    | recommendation-lists feature                            |
| 6. Public profile и статистика | completed   | owner/guest режимы, фильтры, сортировка, метрики, reading analytics                                                                                 | profile feature                                         |
| 7. QA и delivery               | completed   | lint/format tooling, Jest unit tests, Playwright browser scenarios, CI/CD, GHCR, Kubernetes manifests, deploy docs, `edge` rollout flow, Lighthouse | `.github/`, `docs/`, `README.md`, `playwright/`, `k8s/` |

## Ближайшие шаги

1. Провести ручной визуальный smoke-pass на мобильных брейкпоинтах и длинных библиотеках.
2. При необходимости расширить browser e2e на owner CRUD рекомендательных списков.
3. При желании вынести новые UI-паттерны в переиспользуемые shared-компоненты, если редизайн пойдёт дальше.

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
- `npm run build:frontend` после UI redesign
- `npm run lint:frontend` после UI redesign
- `npm run lint:styles` после UI redesign
- `npm run test:frontend` после UI redesign
- `npm run test:component` после UI redesign
- `POST https://polka.keykomi.com/api/v1/auth/login`
- `POST https://polka.keykomi.com/api/v1/books/cover-upload`
- `POST https://polka.keykomi.com/api/v1/books`
- `GET https://polka.keykomi.com/api/v1/books/:id`
- `DELETE https://polka.keykomi.com/api/v1/books/:id`
- Lighthouse mobile report: `docs/lighthouse/polka-mobile.report.html`

## Принципы итераций

- Один вертикальный срез на одну небольшую ветку.
- Каждый шаг должен оставлять проект в собираемом состоянии.
- После каждого заметного этапа обновлять этот файл, чтобы новый агент быстро входил в контекст.
