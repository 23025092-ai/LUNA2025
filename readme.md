# LUNA2025 - X-ray Dataset Competition Platform

Production-ready platform for the LUNA2025 X-ray dataset competition with complete backend infrastructure, Kubernetes deployment, and monitoring.

## 🚀 Quick Start

### Local Development (Docker Compose)

Run all services with a single command:

```bash
./scripts/local-dev.sh
```

Or manually:

```bash
docker-compose -f docker-compose.full.yml up -d
```

**Access services:**
- **Frontend**: http://localhost:5173
- **New Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Legacy Backend**: http://localhost:8001
- **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin)
- **RabbitMQ Management**: http://localhost:15672 (guest/guest)

### Kubernetes Deployment

```bash
# Using Helm
helm install luna-backend ./helm/luna-backend -n luna-backend --create-namespace

# Or using ArgoCD (GitOps)
kubectl apply -f argocd/luna-backend-application.yaml
```

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed instructions.

## 📁 Project Structure

```
LUNA2025/
├── frontend/              # React/Vue frontend application
├── backend/              # Original FastAPI backend (legacy)
├── services/
│   └── backend/         # New production backend
│       ├── app/
│       │   └── routers/ # API endpoints (upload, validation, auth, health)
│       ├── utils/       # S3, helpers
│       ├── tasks.py     # Celery async tasks
│       ├── models.py    # SQLAlchemy models
│       └── main.py      # FastAPI application
├── helm/
│   └── luna-backend/    # Helm chart for K8s deployment
├── argocd/              # ArgoCD GitOps manifests
├── monitoring/
│   ├── prometheus/      # Alert rules
│   └── grafana/        # Dashboards
├── scripts/
│   ├── local-dev.sh    # Local development startup
│   └── k6-upload-test.js # Load testing (24 concurrent teams)
└── docs/
    ├── DEPLOYMENT.md   # Deployment guide
    ├── RUNBOOK.md      # Operations runbook
    └── API_SPEC.yaml   # OpenAPI specification
```

## 🏗️ Architecture

### New Backend System (`services/backend/`)

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Client    │─────▶│   FastAPI    │─────▶│ PostgreSQL  │
│             │      │   API        │      │             │
└─────────────┘      └──────────────┘      └─────────────┘
      │                     │
      │ Presigned URL       │ Enqueue
      ▼                     ▼
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   MinIO     │      │  RabbitMQ    │─────▶│   Celery    │
│   (S3)      │      │   Broker     │      │   Workers   │
└─────────────┘      └──────────────┘      └─────────────┘
                                                  │
                                                  │ Validate
                                                  ▼
                                            ┌─────────────┐
                                            │    Redis    │
                                            │   Cache     │
                                            └─────────────┘
```

**Key Features:**
- ✅ Presigned S3 URLs for direct client uploads
- ✅ Async validation with Celery workers
- ✅ JWT authentication
- ✅ Prometheus metrics & structured logging
- ✅ Kubernetes-ready with health checks
- ✅ Helm charts for easy deployment
- ✅ ArgoCD GitOps integration
- ✅ Kong API Gateway configuration
- ✅ Comprehensive monitoring & alerting

### API Endpoints

**Upload Flow:**
1. `POST /api/v1/upload/start` - Get presigned URLs for file upload
2. Client uploads files directly to S3/MinIO using presigned URLs
3. `POST /api/v1/upload/complete` - Trigger async validation
4. `GET /api/v1/validation/{id}/status` - Check validation status

**Other Endpoints:**
- `POST /api/v1/auth/login` - JWT authentication
- `GET /health` - Health check
- `GET /metrics` - Prometheus metrics

Full API specification: [docs/API_SPEC.yaml](docs/API_SPEC.yaml)

## 🛠️ Development

### Frontend
```bash
cd frontend
nvm use 20
npm i -f
npm run dev
```

### Legacy Backend
```bash
cd backend
pip install --no-cache-dir -r requirements.txt
export DATABASE_URL="postgresql://luna:luna@localhost:5432/luna25"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### New Backend (Services)
```bash
cd services/backend
pip install -r requirements.txt

# Run API
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Run Celery worker
celery -A tasks worker --loglevel=info --concurrency=4
```

## 🧪 Testing

### Run Unit Tests
```bash
cd services/backend
pytest tests/ -v --cov
```

### Load Testing (24 Concurrent Teams)
```bash
k6 run scripts/k6-upload-test.js --env API_URL=http://localhost:8000
```

## 📊 Monitoring

### Prometheus Metrics
- `http_requests_total` - Total HTTP requests
- `http_request_duration_seconds` - Request latency
- `validation_queue_length` - Pending validation jobs
- `validation_duration_seconds` - Validation job duration
- `s3_upload_count` & `s3_upload_bytes` - S3 upload metrics
- `concurrent_uploads` - Current concurrent uploads

### Grafana Dashboard
Import from: `monitoring/grafana/dashboards/luna-backend.json`

### Alert Rules
Apply with: `kubectl apply -f monitoring/prometheus/rules/luna-alerts.yaml`

## 🔒 Security

- ✅ JWT authentication with short-lived tokens
- ✅ Presigned URLs expire after 1 hour
- ✅ NetworkPolicies for service isolation
- ✅ Secrets management via Kubernetes Secrets
- ✅ ExternalSecrets Operator support (see `infra/examples/`)
- ✅ RBAC for Kubernetes resources
- ✅ TLS at ingress via Kong

## 📖 Documentation

- [DEPLOYMENT.md](docs/DEPLOYMENT.md) - Deployment guide for dev and production
- [RUNBOOK.md](docs/RUNBOOK.md) - Operations runbook (scaling, troubleshooting)
- [API_SPEC.yaml](docs/API_SPEC.yaml) - OpenAPI specification
- [Backend README](services/backend/README.md) - Backend service details

## 🎯 Features

### Frontend
**FE-01**: Auth pages (login), layout (sidebar/header), guard route theo role.
**FE-02**: Datasets page (list, upload admin, analyze button, stats chart).
**FE-03**: Submissions page (upload CSV, list, detail hiển thị metrics + ROC/PR).
**FE-04**: Leaderboard page (filter dataset, bảng xếp hạng, sparkline AUC theo thời gian).
**FE-05**: API Test page (form URL, chọn ảnh mẫu, hiển thị JSON/latency).
**FE-06**: Notebook page (iframe /lite?token&dataset_id), hướng dẫn ngắn.

### Backend (Original)
**BE-01**: Models + CRUD cơ bản (users/datasets/submissions/metrics/api_logs).
**BE-02**: Auth JWT (login, /users/me), middleware lấy current_user + role.
**BE-03**: Datasets API (upload, list, detail, analyze → stats_json, mark_official).
**BE-04**: Submissions API (upload CSV, evaluate → sklearn, lưu score_json).
**BE-05**: Leaderboard API (best-per-group, sort theo AUC, tie-break theo F1).
**BE-06**: API Test API (/apitest/call với 1–2 ảnh mẫu, timeout, log latency).
**BE-07**: Groundtruth download (protected), pagination, filters, error codes.
**BE-08**: Unit/integration tests (pytest) cho evaluate & merge CSV.

### New Backend Services
**BE-09**: Presigned S3 URL generation for direct client uploads.
**BE-10**: Async validation pipeline with Celery workers.
**BE-11**: Comprehensive Kubernetes deployment (Helm + ArgoCD).
**BE-12**: Prometheus metrics & Grafana dashboards.
**BE-13**: Kong API Gateway integration with JWT auth.
**BE-14**: NetworkPolicy for service isolation.
**BE-15**: Horizontal Pod Autoscaling (HPA).
**BE-16**: Load testing with k6 (24 concurrent teams).

## 🚢 CI/CD

GitHub Actions pipeline (`.github/workflows/ci-cd.yaml`):
- ✅ Lint with ruff, black, mypy
- ✅ Run unit tests with pytest
- ✅ Build and push Docker images to GHCR
- ✅ Helm chart validation
- ✅ ArgoCD sync trigger

## 📝 License

Copyright © 2025 LUNA2025 Team

## 🤝 Contributing

1. Create feature branch from `main`
2. Make changes and add tests
3. Run linters and tests
4. Submit pull request

## 📞 Support

- GitHub Issues: https://github.com/23025092-ai/LUNA2025/issues
- Documentation: [./docs/](./docs/)