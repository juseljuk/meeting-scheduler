#!/bin/bash

# IBM Cloud Code Engine Deployment with COS Backup
# This script deploys the meeting app with automatic database backups to Cloud Object Storage

set -e

# Configuration
PROJECT_NAME="ce-wxo-related"
REGION="eu-de"
REGISTRY_NAMESPACE="wxo-demos"
BACKEND_IMAGE="meeting-app-backend"
FRONTEND_IMAGE="meeting-app-frontend"
VERSION="v1"

# COS Configuration - UPDATE THESE VALUES
COS_INSTANCE_NAME="meeting-app-storage"
COS_BUCKET_NAME="meeting-app-backups"
COS_REGION="eu-de"

echo "🚀 Starting deployment to IBM Cloud Code Engine with COS backup..."
echo ""
echo "⚠️  IMPORTANT: This deployment uses Cloud Object Storage for database backups."
echo "   Data will be backed up every 5 minutes to COS."
echo "   On container restart, the latest backup will be restored."
echo ""

# Check if logged in to IBM Cloud
if ! ibmcloud target &> /dev/null; then
    echo "❌ Not logged in to IBM Cloud. Please run 'ibmcloud login' first."
    exit 1
fi

# Set target region
echo "📍 Setting target region to ${REGION}..."
ibmcloud target -r ${REGION}

# Check if COS instance exists
echo "🗄️  Checking Cloud Object Storage instance..."
if ! ibmcloud resource service-instance ${COS_INSTANCE_NAME} &> /dev/null; then
    echo "⚠️  COS instance '${COS_INSTANCE_NAME}' not found."
    echo ""
    echo "To create a COS instance, run:"
    echo "  ibmcloud resource service-instance-create ${COS_INSTANCE_NAME} \\"
    echo "    cloud-object-storage lite global"
    echo ""
    read -p "Would you like to create it now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Creating COS instance..."
        ibmcloud resource service-instance-create ${COS_INSTANCE_NAME} \
            cloud-object-storage lite global
        echo "✅ COS instance created"
    else
        echo "❌ COS instance required. Exiting."
        exit 1
    fi
fi

# Create service credentials for COS
echo "🔐 Creating COS service credentials..."
COS_CRED_NAME="${COS_INSTANCE_NAME}-credentials"
if ! ibmcloud resource service-key ${COS_CRED_NAME} &> /dev/null; then
    ibmcloud resource service-key-create ${COS_CRED_NAME} Writer \
        --instance-name ${COS_INSTANCE_NAME} \
        --parameters '{"HMAC":true}'
    echo "✅ Service credentials created"
else
    echo "✅ Service credentials already exist"
fi

# Get COS credentials
echo "📋 Retrieving COS credentials..."
COS_CREDS=$(ibmcloud resource service-key ${COS_CRED_NAME} --output json)
COS_ACCESS_KEY=$(echo $COS_CREDS | jq -r '.[0].credentials.cos_hmac_keys.access_key_id')
COS_SECRET_KEY=$(echo $COS_CREDS | jq -r '.[0].credentials.cos_hmac_keys.secret_access_key')
COS_ENDPOINT="https://s3.${COS_REGION}.cloud-object-storage.appdomain.cloud"

if [ -z "$COS_ACCESS_KEY" ] || [ "$COS_ACCESS_KEY" == "null" ]; then
    echo "❌ Failed to retrieve COS credentials"
    exit 1
fi

echo "✅ COS credentials retrieved"

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

# Deploy backend application with COS credentials
echo "🚀 Deploying backend application with COS backup..."

# Check if application exists
if ibmcloud ce application get --name meeting-app-backend &> /dev/null; then
    echo "Updating existing backend application..."
    ibmcloud ce application update \
        --name meeting-app-backend \
        --image de.icr.io/${REGISTRY_NAMESPACE}/${BACKEND_IMAGE}:${VERSION} \
        --registry-secret icr-secret \
        --env COS_ENDPOINT="${COS_ENDPOINT}" \
        --env COS_BUCKET="${COS_BUCKET_NAME}" \
        --env COS_ACCESS_KEY="${COS_ACCESS_KEY}" \
        --env COS_SECRET_KEY="${COS_SECRET_KEY}"
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
        --env DATABASE_PATH=/data/meetings.db \
        --env COS_ENDPOINT="${COS_ENDPOINT}" \
        --env COS_BUCKET="${COS_BUCKET_NAME}" \
        --env COS_ACCESS_KEY="${COS_ACCESS_KEY}" \
        --env COS_SECRET_KEY="${COS_SECRET_KEY}"
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
echo "🎉 Deployment complete with COS backup!"
echo "📱 Access your application at: ${FRONTEND_URL}"
echo "🔧 Backend API available at: ${BACKEND_URL}"
echo "💾 Database backed up to COS bucket: ${COS_BUCKET_NAME}"
echo ""
echo "📝 Important Notes:"
echo "   - Database is backed up every 5 minutes to Cloud Object Storage"
echo "   - On container restart, the latest backup is automatically restored"
echo "   - Data loss window: up to 5 minutes between backups"
echo "   - COS bucket: ${COS_BUCKET_NAME} in region ${COS_REGION}"
echo ""
echo "🔍 To view COS bucket contents:"
echo "   ibmcloud cos list-objects --bucket ${COS_BUCKET_NAME}"
echo ""
echo "📊 To view backend logs:"
echo "   ibmcloud ce application logs --name meeting-app-backend --follow"

# Made with Bob