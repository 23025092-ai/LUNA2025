# LUNA2025 Backend Deployment Guide

## Overview

This guide covers deploying the LUNA2025 backend system for X-ray dataset validation in both development and production environments.

## Architecture

The system consists of:
- **API Service**: FastAPI application serving upload/validation endpoints
- **Worker Service**: Celery workers for async validation tasks
- **PostgreSQL**: Metadata database
- **Redis**: Cache and Celery result backend
- **RabbitMQ**: Message broker for Celery
- **MinIO**: S3-compatible object storage

## Local Development with Docker Compose

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- 8GB RAM minimum

### Quick Start

1. **Clone the repository**:
```bash
git clone https://github.com/23025092-ai/LUNA2025.git
cd LUNA2025
```

2. **Start all services**:
```bash
docker-compose -f docker-compose.full.yml up -d
```

3. **Check service status**:
```bash
docker-compose -f docker-compose.full.yml ps
```

4. **View logs**:
```bash
docker-compose -f docker-compose.full.yml logs -f api worker
```

5. **Access services**:
- API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- MinIO Console: http://localhost:9001 (minioadmin/minioadmin)
- RabbitMQ Management: http://localhost:15672 (guest/guest)
- Frontend: http://localhost:5173

### Stopping Services

```bash
docker-compose -f docker-compose.full.yml down
```

To also remove volumes:
```bash
docker-compose -f docker-compose.full.yml down -v
```

## Kubernetes Deployment

### Prerequisites

- Kubernetes 1.24+
- Helm 3.12+
- kubectl configured to access your cluster
- ArgoCD (optional, for GitOps)

### Option 1: Direct Helm Install

1. **Create namespace**:
```bash
kubectl create namespace luna-backend
```

2. **Create secrets** (production):
```bash
kubectl create secret generic luna-backend-secrets \
  --from-literal=database-url='postgresql://user:pass@host:5432/db' \
  --from-literal=redis-url='redis://host:6379/0' \
  --from-literal=rabbitmq-url='amqp://user:pass@host:5672//' \
  --from-literal=minio-access-key='your-access-key' \
  --from-literal=minio-secret-key='your-secret-key' \
  --from-literal=jwt-secret-key='your-jwt-secret' \
  -n luna-backend
```

3. **Install with Helm**:

For development (with in-cluster services):
```bash
helm install luna-backend ./helm/luna-backend \
  --namespace luna-backend \
  --values ./helm/luna-backend/values.yaml
```

For production (with external services):
```bash
helm install luna-backend ./helm/luna-backend \
  --namespace luna-backend \
  --set postgresql.enabled=false \
  --set postgresql.external.enabled=true \
  --set postgresql.external.host=your-rds-endpoint.amazonaws.com \
  --set postgresql.external.username=luna \
  --set postgresql.external.password=yourpassword \
  --set postgresql.external.database=luna25 \
  --set minio.enabled=false \
  --set minio.external.enabled=true \
  --set minio.external.endpoint=https://s3.amazonaws.com \
  --set minio.external.accessKey=AKIA... \
  --set minio.external.secretKey=... \
  --set minio.external.bucket=luna-datasets \
  --set redis.enabled=false \
  --set redis.external.enabled=true \
  --set redis.external.host=your-elasticache.amazonaws.com \
  --set rabbitmq.enabled=false \
  --set rabbitmq.external.enabled=true \
  --set rabbitmq.external.host=your-amazonmq.amazonaws.com
```

4. **Verify deployment**:
```bash
kubectl get pods -n luna-backend
kubectl get svc -n luna-backend
```

5. **Check logs**:
```bash
kubectl logs -f deployment/luna-backend-api -n luna-backend
kubectl logs -f deployment/luna-backend-worker -n luna-backend
```

### Option 2: GitOps with ArgoCD

1. **Ensure ArgoCD is installed**:
```bash
kubectl get pods -n argocd
```

2. **Apply ArgoCD Application**:
```bash
kubectl apply -f argocd/luna-backend-application.yaml
```

3. **Monitor sync status**:
```bash
argocd app get luna-backend
argocd app sync luna-backend
```

4. **View in ArgoCD UI**:
```bash
kubectl port-forward svc/argocd-server -n argocd 8080:443
# Access at https://localhost:8080
```

## Configuration

### Environment Variables

Key environment variables (configured in values.yaml):

- `DATABASE_URL`: PostgreSQL connection string
- `CELERY_BROKER_URL`: RabbitMQ connection string
- `CELERY_RESULT_BACKEND`: Redis connection string
- `MINIO_ENDPOINT`: MinIO/S3 endpoint
- `MINIO_ACCESS_KEY`: MinIO/S3 access key
- `MINIO_SECRET_KEY`: MinIO/S3 secret key
- `MINIO_BUCKET`: Bucket name for datasets
- `LOG_LEVEL`: Logging level (INFO, DEBUG, WARNING, ERROR)
- `CORS_ORIGINS`: Allowed CORS origins (comma-separated)
- `JWT_SECRET_KEY`: Secret key for JWT tokens

### Scaling

**Scale API replicas**:
```bash
kubectl scale deployment luna-backend-api --replicas=5 -n luna-backend
```

**Scale worker replicas**:
```bash
kubectl scale deployment luna-backend-worker --replicas=10 -n luna-backend
```

**Enable autoscaling** (HPA):
```bash
helm upgrade luna-backend ./helm/luna-backend \
  --set autoscaling.enabled=true \
  --set autoscaling.minReplicas=2 \
  --set autoscaling.maxReplicas=10 \
  --set autoscaling.targetCPUUtilizationPercentage=70 \
  -n luna-backend
```

## Monitoring

### Prometheus

Metrics are exposed at `/metrics` endpoint.

### Grafana Dashboard

Import dashboard from `monitoring/grafana/dashboards/luna-backend.json`.

### Alert Rules

Apply Prometheus alert rules:
```bash
kubectl apply -f monitoring/prometheus/rules/luna-alerts.yaml
```

## Troubleshooting

### Pods not starting

```bash
kubectl describe pod <pod-name> -n luna-backend
kubectl logs <pod-name> -n luna-backend
```

### Database connection issues

```bash
# Test from a pod
kubectl exec -it deployment/luna-backend-api -n luna-backend -- \
  python -c "from db import engine; engine.connect()"
```

### MinIO connectivity

```bash
# Test S3 access
kubectl exec -it deployment/luna-backend-api -n luna-backend -- \
  python -c "from utils.s3 import s3_client; print(s3_client.client.list_buckets())"
```

### Worker not processing tasks

```bash
# Check RabbitMQ queues
kubectl exec -it deployment/luna-backend-worker -n luna-backend -- \
  celery -A tasks inspect active
```

## Upgrading

```bash
helm upgrade luna-backend ./helm/luna-backend \
  --namespace luna-backend \
  --values ./helm/luna-backend/values.yaml
```

## Uninstalling

```bash
helm uninstall luna-backend -n luna-backend
kubectl delete namespace luna-backend
```

## Security Best Practices

1. **Use ExternalSecrets Operator** for secret management:
   - See `infra/examples/externalsecret.yaml`
   
2. **Enable NetworkPolicies**:
   ```bash
   helm upgrade luna-backend ./helm/luna-backend \
     --set networkPolicy.enabled=true \
     -n luna-backend
   ```

3. **Use TLS** for all endpoints:
   - Configure Kong ingress with TLS certificates
   - Use cert-manager for automatic certificate management

4. **Rotate credentials** regularly:
   - JWT secret keys
   - Database passwords
   - S3 access keys

5. **Enable Pod Security Standards**:
   ```bash
   kubectl label namespace luna-backend \
     pod-security.kubernetes.io/enforce=restricted
   ```

## Support

For issues and questions:
- GitHub Issues: https://github.com/23025092-ai/LUNA2025/issues
- Documentation: ./docs/
