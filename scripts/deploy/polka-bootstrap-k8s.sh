#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
KUBECTL_BIN="${KUBECTL_BIN:-sudo k3s kubectl}"
NAMESPACE="polka"
IMAGE_TAG="${POLKA_IMAGE_TAG:-main}"
FRONTEND_IMAGE="ghcr.io/mattoyuzuru/polka/frontend:${IMAGE_TAG}"
BACKEND_IMAGE="ghcr.io/mattoyuzuru/polka/backend:${IMAGE_TAG}"

POSTGRES_USER="${POLKA_POSTGRES_USER:-polka}"
POSTGRES_DB="${POLKA_POSTGRES_DB:-polka}"
POSTGRES_PASSWORD="${POLKA_POSTGRES_PASSWORD:-}"
JWT_SECRET="${POLKA_JWT_SECRET:-}"

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

  ${KUBECTL_BIN} -n "${NAMESPACE}" create secret generic polka-secrets \
    --from-literal=postgres-user="${POSTGRES_USER}" \
    --from-literal=postgres-password="${POSTGRES_PASSWORD}" \
    --from-literal=postgres-database="${POSTGRES_DB}" \
    --from-literal=jwt-secret="${JWT_SECRET}" \
    --dry-run=client \
    -o yaml | ${KUBECTL_BIN} apply -f -
fi

${KUBECTL_BIN} apply -k "${ROOT_DIR}/k8s/polka"
${KUBECTL_BIN} -n "${NAMESPACE}" set image deployment/backend backend="${BACKEND_IMAGE}"
${KUBECTL_BIN} -n "${NAMESPACE}" set image deployment/frontend frontend="${FRONTEND_IMAGE}"

${KUBECTL_BIN} -n "${NAMESPACE}" rollout status statefulset/postgres --timeout=180s
${KUBECTL_BIN} -n "${NAMESPACE}" rollout status deployment/backend --timeout=180s
${KUBECTL_BIN} -n "${NAMESPACE}" rollout status deployment/frontend --timeout=180s
${KUBECTL_BIN} -n "${NAMESPACE}" get ingress,svc,pods
