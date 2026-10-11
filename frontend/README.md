# Frontend Polka

Angular 21 / Taiga UI 4 / NgRx Signal Store. Зависимости управляются корневым npm workspace; устанавливайте их через `npm ci` в корне репозитория.

```bash
npm run start:frontend
npm run lint
npm run format:check
npm run test:frontend
npm run build:frontend
```

Dev server проксирует `/api/**` на локальный backend, порт задаётся `BACKEND_PORT` (8080 по умолчанию). Например, `BACKEND_PORT=18081 npm run start:frontend -- --port 14201`.

Unit runner — Jest. Browser/flow tests — Playwright: `npm run test:component` из корня. Для действующего runtime задайте `POLKA_REUSE_STACK=1`, `FRONTEND_PORT`, `BACKEND_PORT`.

Текстовые черновики привязаны к аккаунту. Приватные обложки загружаются через авторизованные HTTP-запросы, blob URLs освобождаются при смене книги/сессии. Состояния ошибок сохраняют уже загруженную страницу; переключение полки отменяет старый запрос. Typewriter ограничен по времени, корректно работает с Unicode и отключается при reduced motion.

Демо-контент, запуск всего стека и снимки интерфейса описаны в [корневом README](../README.md).
