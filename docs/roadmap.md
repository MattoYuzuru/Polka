# Roadmap

## Текущий статус

- Текущая ветка: `fix/minimal-ui-book-list-pass`
- Текущая фаза: минималистичный UI-pass профиля, страницы книги и форм создания книги/подборки с отдельным CRUD для цитат и мнений
- Последнее обновление: 2026-04-01

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

1. Провести ручной визуальный smoke-pass профиля, страницы книги и обеих form-страниц на мобильных брейкпоинтах.
2. Решить, выносить ли минималистичные `form-action`, checkbox и card-selection паттерны в shared-слой.
3. Отдельно зафиксировать серверный алгоритм сессионного градиента по палитрам обложек, если он должен вычисляться автоматически, а не храниться как preset.

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
- `npm run lint:frontend` после profile/book pass 2
- `npm run lint:styles` после profile/book pass 2
- `npm run build:frontend` после profile/book pass 2
- `npm run test:frontend` после profile/book pass 2
- `npx playwright test playwright/tests/auth-and-profile.spec.ts`
- `POST https://polka.keykomi.com/api/v1/auth/login`
- `POST https://polka.keykomi.com/api/v1/books/cover-upload`
- `POST https://polka.keykomi.com/api/v1/books`
- `GET https://polka.keykomi.com/api/v1/books/:id`
- `DELETE https://polka.keykomi.com/api/v1/books/:id`
- Lighthouse mobile report: `docs/lighthouse/polka-mobile.report.html`
- `npm run lint` после minimal UI/book/list pass
- `npm run format:check` после minimal UI/book/list pass
- `npm run test:frontend` после minimal UI/book/list pass
- `npm run test:backend` после minimal UI/book/list pass
- `npm run build:frontend` после minimal UI/book/list pass
- `npm run compose:check` после minimal UI/book/list pass
- `npm run test:component` после minimal UI/book/list pass

## Принципы итераций

- Один вертикальный срез на одну небольшую ветку.
- Каждый шаг должен оставлять проект в собираемом состоянии.
- После каждого заметного этапа обновлять этот файл, чтобы новый агент быстро входил в контекст.
