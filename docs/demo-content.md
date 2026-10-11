# Демо-библиотека

Профиль `yuzuru` содержит 24 книги: четыре исходные и 20 многоязычных карточек, по пять на японском, испанском, английском и русском. В публичном режиме видны 23 книги и шесть подборок; одна исходная книга остаётся личной.

У каждой многоязычной книги четыре отдельных мнения. Ещё 12 заметок дополняют исходные четыре книги; вместе с исходными записями в профиле 95 мнений. Это демонстрационный читательский дневник: размышления о форме, персонажах, языке, технических идеях и планах чтения. У книг со статусом «Хочу» заметки описывают ожидания, у книг на паузе — причины и планы возвращения.

Карточки показывают длинные заголовки, японскую типографику, диакритику, кириллицу, разные статусы и навигацию по нескольким мнениям. Полные тексты книг не распространяются. Мнения написаны для демонстрации; обложки — оригинальные макеты Polka. Год относится к произведению или явно указанному изданию: SICP — второе издание 1996 года, TAOCP Volume 1 — третье издание 1997 года.

| Язык    | Книга                                                                                                   | Источник метаданных                                                                                                                             |
| ------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 日本語  | こころ — 夏目 漱石                                                                                      | [Источник](https://www.aozora.gr.jp/cards/000148/card773.html)                                                                                  |
| 日本語  | 銀河鉄道の夜 — 宮沢 賢治                                                                                | [Источник](https://www.aozora.gr.jp/cards/000081/card43737.html)                                                                                |
| Español | Don Quijote de la Mancha — Miguel de Cervantes                                                          | [Источник](https://www.gutenberg.org/ebooks/2000)                                                                                               |
| Español | Niebla — Miguel de Unamuno                                                                              | [Источник](https://www.gutenberg.org/ebooks/49836)                                                                                              |
| English | Flatland — Edwin A. Abbott                                                                              | [Источник](https://www.gutenberg.org/ebooks/201)                                                                                                |
| English | Structure and Interpretation of Computer Programs — Harold Abelson · Gerald Jay Sussman · Julie Sussman | [Источник](https://mitpress.mit.edu/9780262510875/structure-and-interpretation-of-computer-programs/)                                           |
| Русский | Мы — Евгений Замятин                                                                                    | [Источник](https://www.gutenberg.org/ebooks/61963)                                                                                              |
| Русский | Евгений Онегин — Александр Пушкин                                                                       | [Источник](<https://ru.wikisource.org/wiki/Евгений_Онегин_(Пушкин)>)                                                                            |
| 日本語  | 羅生門 — 芥川 龍之介                                                                                    | [Источник](https://www.aozora.gr.jp/cards/000879/card127.html)                                                                                  |
| 日本語  | 人間失格 — 太宰 治                                                                                      | [Источник](https://www.aozora.gr.jp/cards/000035/card301.html)                                                                                  |
| 日本語  | 学問のすすめ — 福沢 諭吉                                                                                | [Источник](https://www.aozora.gr.jp/cards/000296/card47061.html)                                                                                |
| Español | Ficciones — Jorge Luis Borges                                                                           | [Источник](https://cvc.cervantes.es/actcult/Borges/obras/1944b.htm)                                                                             |
| Español | La invención de Morel — Adolfo Bioy Casares                                                             | [Источник](https://www.penguinrandomhouse.com/books/717728/la-invencion-de-morel--the-invention-of-morel-by-adolfo-bioy-casares/9788466360272/) |
| Español | Cuentos de la selva — Horacio Quiroga                                                                   | [Источник](https://es.wikisource.org/wiki/Cuentos_de_la_selva)                                                                                  |
| English | Frankenstein — Mary Shelley                                                                             | [Источник](https://www.gutenberg.org/ebooks/84)                                                                                                 |
| English | Alice’s Adventures in Wonderland — Lewis Carroll                                                        | [Источник](https://www.gutenberg.org/ebooks/11)                                                                                                 |
| English | The Art of Computer Programming · Volume 1 — Donald E. Knuth                                            | [Источник](https://cs.stanford.edu/~knuth/taocp.html)                                                                                           |
| Русский | Человек-амфибия — Александр Беляев                                                                      | [Источник](<https://ru.wikisource.org/wiki/Человек-амфибия_(Беляев)>)                                                                           |
| Русский | Записки из подполья — Фёдор Достоевский                                                                 | [Источник](<https://ru.wikisource.org/wiki/Записки_из_подполья_(Достоевский)>)                                                                  |
| Русский | Понедельник начинается в субботу — Аркадий и Борис Стругацкие                                           | [Источник](https://www.rusf.ru/abs/abs_meta/m_000932.htm)                                                                                       |

`demo/books.json` хранит карточки и мнения, `demo/notes.json` — дополнения к исходным книгам, `demo/collections.json` — четыре подборки, связанные со стабильными slug книг. `demo/covers/` содержит редактируемые SVG и готовые PNG 600×900. Скачанные исторические изображения для референса сохранены в `demo/sources/`: [геометрическая иллюстрация Flatland](https://www.gutenberg.org/files/201/201-h/images/ill_002.png), [титул Niebla 1914](https://www.gutenberg.org/cache/epub/49836/images/cover.jpg). Они не выдаются за новые обложки.

После запуска локального стека:

```bash
POLKA_DEMO_URL=http://127.0.0.1:14200 npm run demo:seed
```

Seeder входит в development demo-аккаунт, устанавливает nickname и displayName `yuzuru`, загружает обложки через API и добавляет отсутствующие книги и мнения. Подборки дополняются новыми книгами; вручную добавленные позиции сохраняются. Повторный запуск не дублирует книги, мнения или подборки, не перезаписывает существующие карточки и не удаляет контент. Скрипт разрешает только localhost. Другую локальную учётку можно выбрать через `POLKA_DEMO_EMAIL` / `POLKA_DEMO_PASSWORD`; её имя не меняется. Development-only миграция `010_seed_demo_profile.sql` переименовывает нетронутую исходную учётку при новом запуске backend; production эту миграцию пропускает.

Для пересборки PNG нужен установленный Playwright Chromium:

```bash
npm run playwright:install
npm run demo:covers
```

На macOS можно использовать установленный Chrome, без скачивания нового браузера:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run demo:covers
```

Скриншоты и запись реального взаимодействия создаёт `npm run demo:capture`. По умолчанию он использует `http://127.0.0.1:14200`; URL задаётся через `POLKA_DEMO_URL`, nickname — через `POLKA_DEMO_NICKNAME` (по умолчанию `yuzuru`). Результаты находятся в `docs/screenshots/`. Запись охватывает полку, переключение подборки, страницу книги и раскрытие заметки и переход между мнениями. `book-opinions-desktop.png` показывает второе из четырёх мнений. Для GIF используется установленный `ffmpeg`; исходное видео сохраняется отдельно.
