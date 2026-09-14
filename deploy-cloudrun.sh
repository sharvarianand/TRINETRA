#!/bin/bash

# ==========================================
# Cloud Run Deployment Script for CrowdKavach
# ==========================================

set -e

# Configuration - UPDATE THESE VALUES
PROJECT_ID="${GCP_PROJECT_ID:-your-gcp-project-id}"
REGION="${GCP_REGION:-asia-south1}"
SERVICE_NAME="crowd-kavach"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  CrowdKavach - Cloud Run Deployment  ${NC}"
echo -e "${GREEN}========================================${NC}"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is not installed.${NC}"
    echo "Install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${YELLOW}Not authenticated. Running gcloud auth login...${NC}"
    gcloud auth login
fi

# Set the project
echo -e "${YELLOW}Setting project to: ${PROJECT_ID}${NC}"
gcloud config set project "${PROJECT_ID}"

# Enable required APIs
echo -e "${YELLOW}Enabling required APIs...${NC}"
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Build and push the Docker image using Cloud Build
echo -e "${YELLOW}Building and pushing Docker image...${NC}"
gcloud builds submit --tag "${IMAGE_NAME}" .

# Deploy to Cloud Run
echo -e "${YELLOW}Deploying to Cloud Run...${NC}"
gcloud run deploy "${SERVICE_NAME}" \
    --image "${IMAGE_NAME}" \
    --platform managed \
    --region "${REGION}" \
    --allow-unauthenticated \
    --port 8080 \
    --memory 512Mi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 10 \
    --set-env-vars "NODE_ENV=production" \
    --set-env-vars "NEXT_PUBLIC_PYTHON_SERVER_URL=${NEXT_PUBLIC_PYTHON_SERVER_URL:-}" \
    --set-env-vars "WORKOS_API_KEY=${WORKOS_API_KEY:-}" \
    --set-env-vars "WORKOS_CLIENT_ID=${WORKOS_CLIENT_ID:-}" \
    --set-env-vars "WORKOS_COOKIE_PASSWORD=${WORKOS_COOKIE_PASSWORD:-}"

# Get the service URL
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" --region "${REGION}" --format="value(status.url)")

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Deployment Complete!                 ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Service URL: ${GREEN}${SERVICE_URL}${NC}"
echo ""
echo -e "${YELLOW}Note: Make sure to set the following environment variables in Cloud Run:${NC}"
echo "  - WORKOS_API_KEY"
echo "  - WORKOS_CLIENT_ID"
echo "  - WORKOS_COOKIE_PASSWORD"
echo "  - NEXT_PUBLIC_PYTHON_SERVER_URL (if using external Python server)"
echo ""
echo "You can update them via:"
echo "  gcloud run services update ${SERVICE_NAME} --region ${REGION} --set-env-vars KEY=VALUE"
