#!/bin/bash

# IBM Cloud Code Engine Deployment with Cloudant Database
# This script deploys the meeting app using IBM Cloudant for persistence

set -e

# Load configuration from config.sh
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/config.sh"

if [ ! -f "${CONFIG_FILE}" ]; then
    echo "❌ Configuration file not found: ${CONFIG_FILE}"
    echo "📝 Please copy config.sh.example to config.sh and fill in your credentials:"
    echo "   cp ibm-cloud/config.sh.example ibm-cloud/config.sh"
    echo "   # Then edit ibm-cloud/config.sh with your actual values"
    exit 1
fi

# Source the configuration
source "${CONFIG_FILE}"

echo "🚀 Starting deployment to IBM Cloud Code Engine with Cloudant..."
echo ""
echo "📊 Configuration:"
echo "   Cloudant URL: ${CLOUDANT_URL}"
echo "   Using existing Cloudant instance"
echo ""

# Check if logged in to IBM Cloud
if ! ibmcloud target &> /dev/null; then
    echo "❌ Not logged in to IBM Cloud. Please run 'ibmcloud login' first."
    exit 1
fi

# Set target region
echo "📍 Setting target region to ${REGION}..."
ibmcloud target -r ${REGION}

# Verify Cloudant credentials work
echo "🔐 Verifying Cloudant credentials..."
if curl -s -u "apikey:${CLOUDANT_APIKEY}" "${CLOUDANT_URL}/_all_dbs" > /dev/null 2>&1; then
    echo "✅ Cloudant credentials verified"
else
    echo "⚠️  Warning: Could not verify Cloudant credentials"
    echo "   Proceeding anyway - check logs if deployment fails"
fi

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

# Deploy backend application with Cloudant credentials
echo "🚀 Deploying backend application with Cloudant..."

# Check if application exists
if ibmcloud ce application get --name meeting-app-backend &> /dev/null; then
    echo "Updating existing backend application..."
    # Get the backend URL first for API_URL
    BACKEND_URL=$(ibmcloud ce application get --name meeting-app-backend --output json | jq -r '.status.url')
    
    ibmcloud ce application update \
        --name meeting-app-backend \
        --image de.icr.io/${REGISTRY_NAMESPACE}/${BACKEND_IMAGE}:${VERSION} \
        --registry-secret icr-secret \
        --env CLOUDANT_URL="${CLOUDANT_URL}" \
        --env CLOUDANT_APIKEY="${CLOUDANT_APIKEY}" \
        --env API_URL="${BACKEND_URL}"
else
    echo "Creating new backend application..."
    ibmcloud ce application create \
        --name meeting-app-backend \
        --image de.icr.io/${REGISTRY_NAMESPACE}/${BACKEND_IMAGE}:${VERSION} \
        --registry-secret icr-secret \
        --port 3000 \
        --min-scale 1 \
        --max-scale 3 \
        --cpu 0.5 \
        --memory 1G \
        --env NODE_ENV=production \
        --env CLOUDANT_URL="${CLOUDANT_URL}" \
        --env CLOUDANT_APIKEY="${CLOUDANT_APIKEY}"
    
    # Get backend URL after creation and update with API_URL
    BACKEND_URL=$(ibmcloud ce application get --name meeting-app-backend --output json | jq -r '.status.url')
    echo "Setting API_URL for Swagger documentation..."
    ibmcloud ce application update \
        --name meeting-app-backend \
        --env API_URL="${BACKEND_URL}"
fi

# Get backend URL
BACKEND_URL=$(ibmcloud ce application get --name meeting-app-backend --output json | jq -r '.status.url')
echo "✅ Backend deployed at: ${BACKEND_URL}"

# Deploy frontend application
echo "🚀 Deploying frontend application..."

if ibmcloud ce application get --name meeting-app-frontend &> /dev/null; then
    echo "Updating existing frontend application..."
    ibmcloud ce application update \
        --name meeting-app-frontend \
        --image de.icr.io/${REGISTRY_NAMESPACE}/${FRONTEND_IMAGE}:${VERSION} \
        --registry-secret icr-secret \
        --env BACKEND_URL="${BACKEND_URL}"
else
    echo "Creating new frontend application..."
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
fi

# Get frontend URL
FRONTEND_URL=$(ibmcloud ce application get --name meeting-app-frontend --output json | jq -r '.status.url')
echo "✅ Frontend deployed at: ${FRONTEND_URL}"

echo ""
echo "🎉 Deployment complete with Cloudant database!"
echo "📱 Access your application at: ${FRONTEND_URL}"
echo "🔧 Backend API available at: ${BACKEND_URL}"
echo "🗄️  Database: Cloudant (existing instance)"
echo ""
echo "📝 Important Notes:"
echo "   - Data is persisted in your existing Cloudant database"
echo "   - No data loss on container restarts"
echo "   - Using Cloudant URL: ${CLOUDANT_URL}"
echo ""
echo "📊 To view backend logs:"
echo "   ibmcloud ce application logs --name meeting-app-backend --follow"
echo ""
echo "💡 To check database type:"
echo "   curl ${BACKEND_URL}/health"
echo ""
echo "🔍 To view Cloudant dashboard:"
echo "   Open: ${CLOUDANT_URL}/_utils"

# Made with Bob