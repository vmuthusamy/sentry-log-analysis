#!/bin/bash

# LogGuard Deployment Script
# Supports GCP, Azure, and AWS deployments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="logguard"
IMAGE_NAME="logguard"
VERSION=${1:-"latest"}
PLATFORM=${2:-"gcp"}

echo -e "${BLUE}LogGuard Deployment Script${NC}"
echo -e "${BLUE}=========================${NC}"
echo "Project: $PROJECT_NAME"
echo "Version: $VERSION"
echo "Platform: $PLATFORM"
echo ""

# Check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"
    
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Error: Docker is not installed${NC}"
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        echo -e "${RED}Error: Node.js is not installed${NC}"
        exit 1
    fi
    
    case $PLATFORM in
        "gcp")
            if ! command -v gcloud &> /dev/null; then
                echo -e "${RED}Error: Google Cloud SDK is not installed${NC}"
                exit 1
            fi
            ;;
        "azure")
            if ! command -v az &> /dev/null; then
                echo -e "${RED}Error: Azure CLI is not installed${NC}"
                exit 1
            fi
            ;;
        "aws")
            if ! command -v aws &> /dev/null; then
                echo -e "${RED}Error: AWS CLI is not installed${NC}"
                exit 1
            fi
            ;;
    esac
    
    echo -e "${GREEN}Prerequisites check passed${NC}"
}

# Build the application
build_application() {
    echo -e "${YELLOW}Building application...${NC}"
    
    # Install dependencies
    npm ci
    
    # Run TypeScript checks
    npx tsc --noEmit
    
    # Build the application
    npm run build
    
    echo -e "${GREEN}Application built successfully${NC}"
}

# Build Docker image
build_docker_image() {
    echo -e "${YELLOW}Building Docker image...${NC}"
    
    docker build -t $IMAGE_NAME:$VERSION .
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Docker image built successfully${NC}"
    else
        echo -e "${RED}Docker image build failed${NC}"
        exit 1
    fi
}

# Deploy to Google Cloud Platform
deploy_gcp() {
    echo -e "${YELLOW}Deploying to Google Cloud Platform...${NC}"
    
    # Get project ID
    PROJECT_ID=$(gcloud config get-value project)
    if [ -z "$PROJECT_ID" ]; then
        echo -e "${RED}Error: No GCP project set${NC}"
        exit 1
    fi
    
    # Tag and push image to Container Registry
    docker tag $IMAGE_NAME:$VERSION gcr.io/$PROJECT_ID/$IMAGE_NAME:$VERSION
    docker push gcr.io/$PROJECT_ID/$IMAGE_NAME:$VERSION
    
    # Deploy to Cloud Run
    gcloud run deploy $PROJECT_NAME \
        --image gcr.io/$PROJECT_ID/$IMAGE_NAME:$VERSION \
        --platform managed \
        --region us-central1 \
        --allow-unauthenticated \
        --port 5000 \
        --memory 2Gi \
        --cpu 2 \
        --set-env-vars NODE_ENV=production
    
    echo -e "${GREEN}Deployed to GCP Cloud Run${NC}"
}

# Deploy to Microsoft Azure
deploy_azure() {
    echo -e "${YELLOW}Deploying to Microsoft Azure...${NC}"
    
    # Variables
    RESOURCE_GROUP="${PROJECT_NAME}-rg"
    ACR_NAME="${PROJECT_NAME}acr"
    CONTAINER_NAME="${PROJECT_NAME}-app"
    
    # Create resource group if it doesn't exist
    az group create --name $RESOURCE_GROUP --location eastus
    
    # Create Azure Container Registry if it doesn't exist
    az acr create --resource-group $RESOURCE_GROUP --name $ACR_NAME --sku Basic
    
    # Build and push image to ACR
    az acr build --registry $ACR_NAME --image $IMAGE_NAME:$VERSION .
    
    # Deploy to Container Instances
    az container create \
        --resource-group $RESOURCE_GROUP \
        --name $CONTAINER_NAME \
        --image $ACR_NAME.azurecr.io/$IMAGE_NAME:$VERSION \
        --dns-name-label $PROJECT_NAME-unique \
        --ports 5000 \
        --environment-variables NODE_ENV=production
    
    echo -e "${GREEN}Deployed to Azure Container Instances${NC}"
}

# Deploy to Amazon Web Services
deploy_aws() {
    echo -e "${YELLOW}Deploying to Amazon Web Services...${NC}"
    
    # Get AWS account ID
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    REGION=${AWS_DEFAULT_REGION:-us-east-1}
    ECR_URI=$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$IMAGE_NAME
    
    # Create ECR repository if it doesn't exist
    aws ecr create-repository --repository-name $IMAGE_NAME --region $REGION || true
    
    # Get ECR login token
    aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR_URI
    
    # Tag and push image to ECR
    docker tag $IMAGE_NAME:$VERSION $ECR_URI:$VERSION
    docker push $ECR_URI:$VERSION
    
    echo -e "${GREEN}Pushed to AWS ECR${NC}"
    echo -e "${YELLOW}Note: Manual ECS/Fargate deployment required${NC}"
}

# Health check
health_check() {
    echo -e "${YELLOW}Performing health check...${NC}"
    
    # Wait for deployment to be ready
    sleep 30
    
    case $PLATFORM in
        "gcp")
            SERVICE_URL=$(gcloud run services describe $PROJECT_NAME --region=us-central1 --format="value(status.url)")
            ;;
        "azure")
            SERVICE_URL="http://${PROJECT_NAME}-unique.eastus.azurecontainer.io:5000"
            ;;
        "aws")
            echo -e "${YELLOW}Health check skipped for AWS (manual ECS setup required)${NC}"
            return
            ;;
    esac
    
    if [ ! -z "$SERVICE_URL" ]; then
        HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SERVICE_URL/health" || echo "000")
        
        if [ "$HTTP_STATUS" = "200" ]; then
            echo -e "${GREEN}Health check passed - Service is running${NC}"
            echo -e "${GREEN}Service URL: $SERVICE_URL${NC}"
        else
            echo -e "${RED}Health check failed - HTTP Status: $HTTP_STATUS${NC}"
        fi
    fi
}

# Main deployment function
main() {
    case $PLATFORM in
        "gcp"|"google"|"cloud-run")
            check_prerequisites
            build_application
            build_docker_image
            deploy_gcp
            health_check
            ;;
        "azure"|"az")
            check_prerequisites
            build_application
            build_docker_image
            deploy_azure
            health_check
            ;;
        "aws"|"amazon")
            check_prerequisites
            build_application
            build_docker_image
            deploy_aws
            ;;
        *)
            echo -e "${RED}Error: Unsupported platform '$PLATFORM'${NC}"
            echo "Supported platforms: gcp, azure, aws"
            exit 1
            ;;
    esac
    
    echo -e "${GREEN}Deployment completed successfully!${NC}"
}

# Show usage
usage() {
    echo "Usage: $0 [version] [platform]"
    echo ""
    echo "Arguments:"
    echo "  version   Docker image version (default: latest)"
    echo "  platform  Deployment platform: gcp, azure, aws (default: gcp)"
    echo ""
    echo "Examples:"
    echo "  $0                    # Deploy latest to GCP"
    echo "  $0 v1.0.0 azure      # Deploy v1.0.0 to Azure"
    echo "  $0 latest aws        # Deploy latest to AWS"
}

# Handle command line arguments
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    usage
    exit 0
fi

# Run main function
main