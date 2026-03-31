# Deploy

## Что обнаружено на VPS
- На сервере поднят `k3s` с namespace-ами `prod`, `aerochat-edge`, `observability`, `cert-manager`.
- В кластере уже работают `traefik` и `cert-manager`, есть `ClusterIssuer`-ы `letsencrypt-prod` и `letsencrypt-staging`.
- `polka.keykomi.com` уже приходит в `traefik`: до добавления ingress домен отвечает его дефолтным `404`.
- Хостовый `nginx` на VPS слушает `:80`, но текущий публичный `404` для `polka.keykomi.com` приходит именно из `traefik`, поэтому для Polka безопаснее не трогать `nginx` и не вмешиваться в существующие host-level конфиги.

## Что добавлено в репозиторий
- GitHub Actions workflow: `.github/workflows/ci-cd.yml`
- Kubernetes-манифесты Polka: `k8s/polka/`
- Bootstrap/rollout script: `scripts/deploy/polka-bootstrap-k8s.sh`

## GHCR образы
- `ghcr.io/mattoyuzuru/polka/frontend`
- `ghcr.io/mattoyuzuru/polka/backend`

Workflow публикует теги:
- `sha-<short-sha>` для каждого push
- `branch-<branch-name>` для push в ветки
- `edge` для default branch
- `main` для default branch

## Первый deploy на VPS
```bash
ssh -i ~/sshKeysDir/id_ed25519_hse matto@158.160.66.87
cd /opt
sudo mkdir -p /opt/polka
sudo chown matto:matto /opt/polka
git clone git@github.com:MattoYuzuru/Polka.git /opt/polka || true
cd /opt/polka
git fetch --all --prune
git checkout main
git pull --ff-only
POLKA_IMAGE_TAG=edge ./scripts/deploy/polka-bootstrap-k8s.sh
```

Если нужно задеплоить конкретный branch build до merge в `main`:
```bash
POLKA_IMAGE_TAG=sha-<short-sha> ./scripts/deploy/polka-bootstrap-k8s.sh
```

## Обычный rollout после нового merge в main
```bash
ssh -i ~/sshKeysDir/id_ed25519_hse matto@158.160.66.87
cd /opt/polka
git fetch --all --prune
git checkout main
git pull --ff-only
POLKA_IMAGE_TAG=edge ./scripts/deploy/polka-bootstrap-k8s.sh
```

Скрипт:
- не трогает чужие namespace-ы;
- создаёт только namespace `polka` и secret `polka-secrets`, если их ещё нет;
- применяет манифесты Polka;
- обновляет образы frontend/backend;
- поднимает `postgres`, `minio`, `backend`, `frontend`;
- ждёт rollout `postgres`, `minio`, `backend`, `frontend`.

Сейчас деплой на VPS не происходит автоматически после merge. После того как GitHub Actions закончит `publish`, нужно зайти по SSH и выполнить rollout-команду вручную.

## Текущее состояние production

- Домен `https://polka.keykomi.com` уже задеплоен в namespace `polka`.
- На 2026-03-31 в `polka` работают `postgres`, `minio`, `backend`, `frontend`.
- TLS сертификат для `polka.keykomi.com` выдан и находится в `Ready=True`.
- Production smoke после rollout прошёл:
  - `GET /api/v1/health`
  - `POST /api/v1/auth/login`
  - `POST /api/v1/books/cover-upload`
  - `POST /api/v1/books`
  - `GET /api/v1/books/:id`
  - `DELETE /api/v1/books/:id`
- Если после обновления секретов хранилища `backend` был поднят раньше `minio`, достаточно повторить:

```bash
echo 123456 | sudo -S k3s kubectl rollout restart deployment/backend -n polka
echo 123456 | sudo -S k3s kubectl rollout status deployment/backend -n polka --timeout=120s
```

## Что проверять после rollout
```bash
echo 123456 | sudo -S k3s kubectl get ingress,svc,pods -n polka
echo 123456 | sudo -S k3s kubectl get certificate -n polka
curl -I https://polka.keykomi.com
```

## Важное ограничение
- Не менять существующие namespace-ы `prod`, `aerochat-edge`, `observability`.
- Не перезапускать `traefik`, `cert-manager`, `nginx` на хосте и чужие deployment-ы.
