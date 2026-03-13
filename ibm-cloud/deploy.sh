#!/bin/bash

# IBM Cloud Code Engine Deployment Script
# This script deploys the meeting app to IBM Cloud Code Engine

set -e

# Configuration
PROJECT_NAME="ce-wxo-related"
REGION="eu-de"  # Change to your preferred region
REGISTRY_NAMESPACE="wxo-demos"  # Change to your IBM Cloud Container Registry namespace
BACKEND_IMAGE="meeting-app-backend"
FRONTEND_IMAGE="meeting-app-frontend"
VERSION="v1"

echo "🚀 Starting deployment to IBM Cloud Code Engine..."

# Check if logged in to IBM Cloud
if ! ibmcloud target &> /dev/null; then
    echo "❌ Not logged in to IBM Cloud. Please run 'ibmcloud login' first."
    exit 1
fi

# Set target region
echo "📍 Setting target region to ${REGION}..."
ibmcloud target -r ${REGION}

# Login to IBM Cloud Container Registry
echo "🔐 Logging in to IBM Cloud Container Registry..."
ibmcloud cr login

# Verify registry namespace exists
echo "📦 Verifying Container Registry namespace..."
if ! ibmcloud cr namespace-list | grep -q "${REGISTRY_NAMESPACE}"; then
    echo "⚠️  Namespace '${REGISTRY_NAMESPACE}' not found. Creating it..."
    ibmcloud cr namespace-add ${REGISTRY_NAMESPACE}
else
    echo "✅ Namespace '${REGISTRY_NAMESPACE}' exists"
fi

# Build and push backend image
echo "🔨 Building backend Docker image..."
cd ../backend
docker build -t ${BACKEND_IMAGE}:${VERSION} .

echo "🏷️  Tagging backend image..."
docker tag ${BACKEND_IMAGE}:${VERSION} de.icr.io/${REGISTRY_NAMESPACE}/${BACKEND_IMAGE}:${VERSION}

echo "📤 Pushing backend image to IBM Cloud Container Registry..."
docker push de.icr.io/${REGISTRY_NAMESPACE}/${BACKEND_IMAGE}:${VERSION}

# Build and push frontend image
echo "🔨 Building frontend Docker image..."
cd ../frontend
docker build -t ${FRONTEND_IMAGE}:${VERSION} .

echo "🏷️  Tagging frontend image..."
docker tag ${FRONTEND_IMAGE}:${VERSION} de.icr.io/${REGISTRY_NAMESPACE}/${FRONTEND_IMAGE}:${VERSION}

echo "📤 Pushing frontend image to IBM Cloud Container Registry..."
docker push de.icr.io/${REGISTRY_NAMESPACE}/${FRONTEND_IMAGE}:${VERSION}

# Create or select Code Engine project
echo "📦 Setting up Code Engine project..."
if ibmcloud ce project get --name ${PROJECT_NAME} &> /dev/null; then
    echo "Project ${PROJECT_NAME} already exists, selecting it..."
    ibmcloud ce project select --name ${PROJECT_NAME}
else
    echo "Creating new project ${PROJECT_NAME}..."
    ibmcloud ce project create --name ${PROJECT_NAME}
fi

# Create registry access secret
echo "🔐 Creating registry access secret..."
ibmcloud ce registry create --name icr-secret --server de.icr.io --username iamapikey --password $(ibmcloud iam api-key-create code-engine-registry-key -d "API key for Code Engine to access Container Registry" --output json | grep -o '"apikey":"[^"]*' | cut -d'"' -f4) 2>/dev/null || echo "Registry secret already exists or using existing credentials"

# Deploy backend application
echo "🚀 Deploying backend application..."
ibmcloud ce application create \
    --name meeting-app-backend \
    --image de.icr.io/${REGISTRY_NAMESPACE}/${BACKEND_IMAGE}:${VERSION} \
    --port 3000 \
    --min-scale 1 \
    --max-scale 3 \
    --cpu 0.5 \
    --memory 1G \
    --env NODE_ENV=production \
    --env DATABASE_PATH=/data/meetings.db \
    || ibmcloud ce application update \
        --name meeting-app-backend \
        --image de.icr.io/${REGISTRY_NAMESPACE}/${BACKEND_IMAGE}:${VERSION} \
        --registry-secret icr-secret

# Get backend URL
BACKEND_URL=$(ibmcloud ce application get --name meeting-app-backend --output json | jq -r '.status.url')
echo "✅ Backend deployed at: ${BACKEND_URL}"

# Deploy frontend application
echo "🚀 Deploying frontend application..."

# Delete existing application if it exists (to avoid conflicts with old images)
if ibmcloud ce application get --name meeting-app-frontend &> /dev/null; then
    echo "Deleting existing frontend application..."
    ibmcloud ce application delete --name meeting-app-frontend --force
    sleep 5
fi

# Use public backend URL for direct API calls (CORS enabled)
ibmcloud ce application create \
    --name meeting-app-frontend \
    --image de.icr.io/${REGISTRY_NAMESPACE}/${FRONTEND_IMAGE}:${VERSION} \
    --registry-secret icr-secret \
    --port 80 \
    --min-scale 1 \
    --max-scale 3 \
    --cpu 0.25 \
    --memory 0.5G \
    --env BACKEND_URL="${BACKEND_URL}"

# Get frontend URL
FRONTEND_URL=$(ibmcloud ce application get --name meeting-app-frontend --output json | grep -o '"url":"[^"]*' | cut -d'"' -f4)
echo "✅ Frontend deployed at: ${FRONTEND_URL}"

echo ""
echo "🎉 Deployment complete!"
echo "📱 Access your application at: ${FRONTEND_URL}"
echo "🔧 Backend API available at: ${BACKEND_URL}"
echo ""
echo "Note: You may need to configure CORS settings if the frontend and backend are on different domains."

# Made with Bob
