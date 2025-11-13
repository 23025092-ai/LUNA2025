# LUNA2025 Backend Services

Production-ready backend for the LUNA2025 X-ray dataset validation competition.

## Features

- **FastAPI** web framework with async support
- **Presigned S3 URLs** for direct client uploads to MinIO/S3
- **Celery workers** for async dataset validation
- **PostgreSQL** for metadata storage with Alembic migrations
- **Redis** for caching and Celery result backend
- **RabbitMQ** message broker for task queue
- **Prometheus metrics** and structured JSON logging
- **Kubernetes-ready** with Helm charts and health checks

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Client    │─────▶│   FastAPI    │─────▶│  PostgreSQL │
│             │      │   API        │      │             │
└─────────────┘      └──────────────┘      └─────────────┘
                            │
                            │ Enqueue
                            ▼
                     ┌──────────────┐      ┌─────────────┐
                     │  RabbitMQ    │─────▶│   Celery    │
                     │   Broker     │      │   Workers   │
                     └──────────────┘      └─────────────┘
                                                  │
                                                  │ Validate
                                                  ▼
                     ┌──────────────┐      ┌─────────────┐
                     │    MinIO     │◀─────│    Redis    │
                     │   (S3)       │      │   Cache     │
                     └──────────────┘      └─────────────┘
```

## API Endpoints

### Upload Flow

1. **POST /api/v1/upload/start**
   - Request presigned URLs for file uploads
   - Returns dataset_id and upload URLs
   
2. **PUT to presigned URLs**
   - Client uploads files directly to S3/MinIO
   
3. **POST /api/v1/upload/complete**
   - Mark upload complete
   - Triggers async validation

4. **GET /api/v1/validation/{dataset_id}/status**
   - Check validation status
   - Returns logs and results

### Authentication

- **POST /api/v1/auth/login**
  - JWT-based authentication
  - Returns access token

### Health & Metrics

- **GET /health** - Health check with database and S3 status
- **GET /readiness** - Kubernetes readiness probe
- **GET /liveness** - Kubernetes liveness probe
- **GET /metrics** - Prometheus metrics

## Quick Start

### Local Development

```bash
# Start all services
docker-compose -f ../../docker-compose.full.yml up -d

# View logs
docker-compose -f ../../docker-compose.full.yml logs -f api worker

# Run tests
pytest tests/ -v

# Stop services
docker-compose -f ../../docker-compose.full.yml down
```

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://luna:luna@localhost:5432/luna25

# Celery
CELERY_BROKER_URL=amqp://guest:guest@localhost:5672//
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# MinIO/S3
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=luna-datasets
MINIO_REGION=us-east-1
MINIO_SECURE=false

# Application
LOG_LEVEL=INFO
CORS_ORIGINS=*
JWT_SECRET_KEY=your-secret-key
```

## Development

### Running API Server

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Running Celery Worker

```bash
celery -A tasks worker --loglevel=info --concurrency=4
```

### Database Migrations

```bash
# Create new migration
alembic revision --autogenerate -m "Description"

# Apply migrations
alembic upgrade head

# Rollback one version
alembic downgrade -1
```

### Testing

```bash
# Run all tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=. --cov-report=html

# Run specific test
pytest tests/test_upload.py::test_upload_start -v
```

### Linting

```bash
# Ruff
ruff check .

# Black
black --check .

# MyPy
mypy . --ignore-missing-imports
```

## Deployment

See [DEPLOYMENT.md](../../docs/DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy to Kubernetes

```bash
# Using Helm
helm install luna-backend ../../helm/luna-backend -n luna-backend

# Using ArgoCD
kubectl apply -f ../../argocd/luna-backend-application.yaml
```

## Monitoring

### Prometheus Metrics

- `http_requests_total` - Total HTTP requests
- `http_request_duration_seconds` - Request latency histogram
- `validation_queue_length` - Pending validation jobs
- `validation_duration_seconds` - Validation job duration
- `s3_upload_count` - Total S3 uploads
- `s3_upload_bytes` - Total bytes uploaded
- `concurrent_uploads` - Current concurrent uploads

### Accessing Metrics

```bash
curl http://localhost:8000/metrics
```

## Load Testing

Run k6 load test with 24 concurrent teams:

```bash
k6 run ../../scripts/k6-upload-test.js --env API_URL=http://localhost:8000
```

## Project Structure

```
services/backend/
├── app/
│   ├── routers/
│   │   ├── upload.py      # Upload endpoints
│   │   ├── validation.py  # Validation status
│   │   ├── auth.py        # Authentication
│   │   └── health.py      # Health checks
│   └── __init__.py
├── utils/
│   ├── s3.py             # MinIO/S3 client
│   └── __init__.py
├── tests/
│   ├── test_upload.py
│   ├── test_validation.py
│   └── __init__.py
├── db.py                 # Database config
├── models.py             # SQLAlchemy models
├── tasks.py              # Celery tasks
├── main.py               # FastAPI app
├── requirements.txt      # Python dependencies
├── Dockerfile           # Container image
└── README.md            # This file
```

## Contributing

1. Create feature branch
2. Make changes
3. Run tests and linting
4. Submit pull request

## License

Copyright © 2025 LUNA2025 Team
