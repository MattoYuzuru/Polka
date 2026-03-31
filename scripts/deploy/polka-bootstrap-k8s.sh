#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
KUBECTL_BIN="${KUBECTL_BIN:-sudo k3s kubectl}"
NAMESPACE="polka"
IMAGE_TAG="${POLKA_IMAGE_TAG:-edge}"
FRONTEND_IMAGE="ghcr.io/mattoyuzuru/polka/frontend:${IMAGE_TAG}"
BACKEND_IMAGE="ghcr.io/mattoyuzuru/polka/backend:${IMAGE_TAG}"

POSTGRES_USER="${POLKA_POSTGRES_USER:-polka}"
POSTGRES_DB="${POLKA_POSTGRES_DB:-polka}"
POSTGRES_PASSWORD="${POLKA_POSTGRES_PASSWORD:-}"
JWT_SECRET="${POLKA_JWT_SECRET:-}"
STORAGE_ACCESS_KEY_ID="${POLKA_STORAGE_ACCESS_KEY_ID:-polka}"
STORAGE_SECRET_ACCESS_KEY="${POLKA_STORAGE_SECRET_ACCESS_KEY:-}"
STORAGE_BUCKET="${POLKA_STORAGE_BUCKET:-polka-covers}"
STORAGE_REGION="${POLKA_STORAGE_REGION:-us-east-1}"

if ! ${KUBECTL_BIN} get namespace "${NAMESPACE}" >/dev/null 2>&1; then
  ${KUBECTL_BIN} apply -f "${ROOT_DIR}/k8s/polka/namespace.yaml"
fi

if ${KUBECTL_BIN} -n "${NAMESPACE}" get secret polka-secrets >/dev/null 2>&1; then
  echo "Secret polka-secrets already exists in namespace ${NAMESPACE}, reusing it."
else
  if [[ -z "${POSTGRES_PASSWORD}" ]]; then
    POSTGRES_PASSWORD="$(openssl rand -hex 24)"
  fi

  if [[ -z "${JWT_SECRET}" ]]; then
    JWT_SECRET="$(openssl rand -hex 32)"
  fi

  if [[ -z "${STORAGE_SECRET_ACCESS_KEY}" ]]; then
    STORAGE_SECRET_ACCESS_KEY="$(openssl rand -hex 24)"
  fi

  ${KUBECTL_BIN} -n "${NAMESPACE}" create secret generic polka-secrets \
    --from-literal=postgres-user="${POSTGRES_USER}" \
    --from-literal=postgres-password="${POSTGRES_PASSWORD}" \
    --from-literal=postgres-database="${POSTGRES_DB}" \
    --from-literal=jwt-secret="${JWT_SECRET}" \
    --from-literal=storage-access-key-id="${STORAGE_ACCESS_KEY_ID}" \
    --from-literal=storage-secret-access-key="${STORAGE_SECRET_ACCESS_KEY}" \
    --from-literal=storage-bucket="${STORAGE_BUCKET}" \
    --from-literal=storage-region="${STORAGE_REGION}" \
    --dry-run=client \
    -o yaml | ${KUBECTL_BIN} apply -f -
fi

${KUBECTL_BIN} apply -k "${ROOT_DIR}/k8s/polka"
${KUBECTL_BIN} -n "${NAMESPACE}" set image deployment/backend backend="${BACKEND_IMAGE}"
${KUBECTL_BIN} -n "${NAMESPACE}" set image deployment/frontend frontend="${FRONTEND_IMAGE}"

${KUBECTL_BIN} -n "${NAMESPACE}" rollout status statefulset/postgres --timeout=180s
${KUBECTL_BIN} -n "${NAMESPACE}" rollout status statefulset/minio --timeout=180s
${KUBECTL_BIN} -n "${NAMESPACE}" rollout status deployment/backend --timeout=180s
${KUBECTL_BIN} -n "${NAMESPACE}" rollout status deployment/frontend --timeout=180s
${KUBECTL_BIN} -n "${NAMESPACE}" get ingress,svc,pods
