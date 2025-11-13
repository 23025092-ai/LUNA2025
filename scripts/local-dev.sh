#!/bin/bash
# Local development startup script for LUNA2025 backend

set -e

echo "🚀 Starting LUNA2025 Backend Services..."
echo ""

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed"
    echo "Please install docker-compose: https://docs.docker.com/compose/install/"
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running"
    echo "Please start Docker and try again"
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Pull latest images
echo "📦 Pulling latest images..."
docker-compose -f docker-compose.full.yml pull

# Start services
echo "🔧 Starting services..."
docker-compose -f docker-compose.full.yml up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check service health
echo ""
echo "📊 Service Status:"
docker-compose -f docker-compose.full.yml ps

# Display service URLs
echo ""
echo "🌐 Service URLs:"
echo "  API:                http://localhost:8000"
echo "  API Docs:           http://localhost:8000/docs"
echo "  Metrics:            http://localhost:8000/metrics"
echo "  MinIO Console:      http://localhost:9001 (minioadmin/minioadmin)"
echo "  RabbitMQ Mgmt:      http://localhost:15672 (guest/guest)"
echo "  Frontend:           http://localhost:5173"
echo "  Legacy Backend:     http://localhost:8001"
echo ""

# Show logs
echo "📝 Showing logs (Ctrl+C to exit)..."
echo ""
docker-compose -f docker-compose.full.yml logs -f api worker
