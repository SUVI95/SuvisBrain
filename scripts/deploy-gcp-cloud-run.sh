#!/usr/bin/env bash
# Deploy Knuut voice API to Google Cloud Run (24/7 public button for hsbridgeai.fi)
#
# Prerequisites:
#   1. gcloud CLI installed: https://cloud.google.com/sdk/docs/install
#   2. gcloud auth login && gcloud auth application-default login
#   3. OPENAI_API_KEY in environment OR in .env
#
# Usage:
#   export OPENAI_API_KEY=sk-proj-...
#   ./scripts/deploy-gcp-cloud-run.sh
#
# Optional overrides:
#   GCP_PROJECT=project-a5a46152-2a77-4bdf-ad7
#   GCP_REGION=europe-north1
#   SERVICE_NAME=knuut-voice

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

GCP_PROJECT="${GCP_PROJECT:-project-a5a46152-2a77-4bdf-ad7}"
GCP_REGION="${GCP_REGION:-europe-north1}"
SERVICE_NAME="${SERVICE_NAME:-knuut-voice}"
SECRET_NAME="${SECRET_NAME:-openai-api-key}"

if ! command -v gcloud >/dev/null 2>&1; then
  echo "ERROR: gcloud not found. Install: https://cloud.google.com/sdk/docs/install"
  exit 1
fi

if [[ -z "${OPENAI_API_KEY:-}" && -f .env ]]; then
  OPENAI_API_KEY="$(grep -E '^OPENAI_API_KEY=' .env | cut -d= -f2- | tr -d '\r' || true)"
  export OPENAI_API_KEY
fi

if [[ -z "${OPENAI_API_KEY:-}" ]]; then
  echo "ERROR: Set OPENAI_API_KEY in your shell or .env before deploying."
  exit 1
fi

echo "==> Project: $GCP_PROJECT  Region: $GCP_REGION  Service: $SERVICE_NAME"
gcloud config set project "$GCP_PROJECT"

echo "==> Enabling required APIs..."
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  --quiet

echo "==> Storing OpenAI key in Secret Manager ($SECRET_NAME)..."
if gcloud secrets describe "$SECRET_NAME" --project="$GCP_PROJECT" >/dev/null 2>&1; then
  printf '%s' "$OPENAI_API_KEY" | gcloud secrets versions add "$SECRET_NAME" --data-file=-
else
  printf '%s' "$OPENAI_API_KEY" | gcloud secrets create "$SECRET_NAME" --data-file=-
fi

PROJECT_NUMBER="$(gcloud projects describe "$GCP_PROJECT" --format='value(projectNumber)')"
RUN_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
gcloud secrets add-iam-policy-binding "$SECRET_NAME" \
  --member="serviceAccount:${RUN_SA}" \
  --role="roles/secretmanager.secretAccessor" \
  --quiet >/dev/null 2>&1 || true

ALLOWED_ORIGINS="${ALLOWED_ORIGINS:-https://www.hsbridgeai.fi,https://hsbridgeai.fi,https://suvisbrain.vercel.app}"

ENV_FILE="$(mktemp)"
trap 'rm -f "$ENV_FILE"' EXIT
cat > "$ENV_FILE" <<EOF
ALLOWED_ORIGINS: "${ALLOWED_ORIGINS}"
OPENAI_REALTIME_MODEL: "gpt-realtime-2"
OPENAI_REALTIME_VOICE: "verse"
EOF

echo "==> Deploying to Cloud Run (min 1 instance = always warm)..."
gcloud run deploy "$SERVICE_NAME" \
  --source="$ROOT" \
  --region="$GCP_REGION" \
  --platform=managed \
  --allow-unauthenticated \
  --min-instances=1 \
  --max-instances=5 \
  --memory=512Mi \
  --cpu=1 \
  --timeout=300 \
  --concurrency=80 \
  --port=8080 \
  --set-secrets="OPENAI_API_KEY=${SECRET_NAME}:latest" \
  --env-vars-file="$ENV_FILE" \
  --quiet

VOICE_URL="$(gcloud run services describe "$SERVICE_NAME" --region="$GCP_REGION" --format='value(status.url)')"
SESSION_URL="${VOICE_URL}/session"

echo ""
echo "=============================================="
echo "  Knuut voice API is live on Cloud Run"
echo "=============================================="
echo "  Service URL:  $VOICE_URL"
echo "  Voice session: $SESSION_URL"
echo "  Health:       $VOICE_URL/health"
echo "  Smoke test:   $VOICE_URL/api/widget-smoke?deep=1"
echo ""
echo "Update Framer custom code (Site Settings → Custom Code):"
echo ""
echo "  const SRV='${SESSION_URL}';"
echo ""
echo "Then publish the Framer site."
echo "=============================================="
