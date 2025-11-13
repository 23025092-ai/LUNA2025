# LUNA2025 Backend Operations Runbook

## Common Operations

### Scaling Workers

**Scale up workers** (e.g., during high load):
```bash
kubectl scale deployment luna-backend-worker --replicas=10 -n luna-backend
```

**Scale down workers**:
```bash
kubectl scale deployment luna-backend-worker --replicas=3 -n luna-backend
```

**Check worker status**:
```bash
kubectl get pods -l app.kubernetes.io/component=worker -n luna-backend
```

### Clearing Queue

**Connect to a worker pod**:
```bash
kubectl exec -it deployment/luna-backend-worker -n luna-backend -- bash
```

**Purge all tasks from queue**:
```bash
celery -A tasks purge
```

**Inspect active tasks**:
```bash
celery -A tasks inspect active
```

**Inspect registered tasks**:
```bash
celery -A tasks inspect registered
```

### Re-running Validations

**From API** (using curl):
```bash
# Get dataset ID from previous upload
DATASET_ID=123

# Trigger validation completion again
curl -X POST http://api.luna2025.local/api/v1/upload/complete \
  -H "Content-Type: application/json" \
  -d "{\"dataset_id\": $DATASET_ID}"
```

**Manually from worker pod**:
```bash
kubectl exec -it deployment/luna-backend-worker -n luna-backend -- python3 -c "
from tasks import validate_dataset
result = validate_dataset.delay(DATASET_ID)
print(f'Task ID: {result.id}')
"
```

### Database Operations

**Connect to database**:
```bash
# In-cluster PostgreSQL
kubectl exec -it deployment/luna-backend-postgresql -n luna-backend -- psql -U luna -d luna25

# External PostgreSQL
kubectl run -it --rm psql --image=postgres:15 --restart=Never -n luna-backend -- \
  psql postgresql://user:pass@host:5432/db
```

**Run migrations**:
```bash
kubectl exec -it deployment/luna-backend-api -n luna-backend -- \
  alembic upgrade head
```

**Check migration status**:
```bash
kubectl exec -it deployment/luna-backend-api -n luna-backend -- \
  alembic current
```

### MinIO Operations

**Access MinIO console**:
```bash
# Port forward to MinIO console
kubectl port-forward svc/luna-backend-minio 9001:9001 -n luna-backend
# Access at http://localhost:9001
```

**List buckets from pod**:
```bash
kubectl exec -it deployment/luna-backend-api -n luna-backend -- python3 -c "
from utils.s3 import s3_client
buckets = s3_client.client.list_buckets()
print(buckets)
"
```

**Check bucket size**:
```bash
kubectl exec -it deployment/luna-backend-minio -n luna-backend -- \
  mc du minio/luna-datasets
```

### Viewing Logs

**API logs**:
```bash
kubectl logs -f deployment/luna-backend-api -n luna-backend
```

**Worker logs**:
```bash
kubectl logs -f deployment/luna-backend-worker -n luna-backend
```

**All pods logs**:
```bash
kubectl logs -f -l app.kubernetes.io/name=luna-backend -n luna-backend --all-containers
```

**Logs from specific time range**:
```bash
kubectl logs deployment/luna-backend-api -n luna-backend --since=1h
```

### Monitoring and Metrics

**Check metrics endpoint**:
```bash
kubectl port-forward svc/luna-backend 8000:80 -n luna-backend
curl http://localhost:8000/metrics
```

**View Prometheus targets**:
```bash
kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090
# Access at http://localhost:9090/targets
```

**Access Grafana**:
```bash
kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3000:80
# Access at http://localhost:3000
# Default credentials: admin/prom-operator
```

### Health Checks

**API health**:
```bash
kubectl exec -it deployment/luna-backend-api -n luna-backend -- \
  curl http://localhost:8000/health
```

**Check all service endpoints**:
```bash
kubectl get endpoints -n luna-backend
```

**Check service discovery**:
```bash
kubectl get svc -n luna-backend
```

## Troubleshooting

### Pod Crashes / CrashLoopBackOff

1. **Check pod status**:
```bash
kubectl describe pod <pod-name> -n luna-backend
```

2. **View recent logs**:
```bash
kubectl logs <pod-name> -n luna-backend --previous
```

3. **Check resource limits**:
```bash
kubectl top pod <pod-name> -n luna-backend
```

### High Memory Usage

1. **Check pod memory**:
```bash
kubectl top pods -n luna-backend
```

2. **Increase memory limits**:
```bash
helm upgrade luna-backend ./helm/luna-backend \
  --set resources.worker.limits.memory=4Gi \
  -n luna-backend
```

3. **Scale horizontally**:
```bash
kubectl scale deployment luna-backend-worker --replicas=6 -n luna-backend
```

### Queue Backlog

1. **Check queue length**:
```bash
# From metrics endpoint
curl http://api.luna2025.local/metrics | grep validation_queue_length

# From RabbitMQ management
kubectl port-forward svc/luna-backend-rabbitmq 15672:15672 -n luna-backend
# Access at http://localhost:15672
```

2. **Scale workers**:
```bash
kubectl scale deployment luna-backend-worker --replicas=10 -n luna-backend
```

3. **Increase worker concurrency**:
```bash
helm upgrade luna-backend ./helm/luna-backend \
  --set app.celery.concurrency=8 \
  -n luna-backend
```

### Database Connection Pool Exhaustion

1. **Check active connections**:
```bash
kubectl exec -it deployment/luna-backend-postgresql -n luna-backend -- \
  psql -U luna -d luna25 -c "SELECT count(*) FROM pg_stat_activity;"
```

2. **Increase pool size**:
Edit `db.py` and update:
```python
engine = create_engine(
    DATABASE_URL,
    pool_size=20,  # Increase from 10
    max_overflow=40  # Increase from 20
)
```

### S3/MinIO Connection Issues

1. **Test connectivity**:
```bash
kubectl exec -it deployment/luna-backend-api -n luna-backend -- \
  python3 -c "from utils.s3 import s3_client; print(s3_client.client.list_buckets())"
```

2. **Check MinIO pod health**:
```bash
kubectl get pods -l app=minio -n luna-backend
kubectl logs -l app=minio -n luna-backend
```

3. **Verify credentials**:
```bash
kubectl get secret luna-backend-secrets -n luna-backend -o yaml
```

## Maintenance

### Backup Database

```bash
kubectl exec -it deployment/luna-backend-postgresql -n luna-backend -- \
  pg_dump -U luna luna25 > backup-$(date +%Y%m%d).sql
```

### Restore Database

```bash
kubectl exec -i deployment/luna-backend-postgresql -n luna-backend -- \
  psql -U luna luna25 < backup-20241113.sql
```

### Cleanup Old Datasets

**Manually trigger cleanup task**:
```bash
kubectl exec -it deployment/luna-backend-worker -n luna-backend -- python3 -c "
from tasks import cleanup_old_datasets
result = cleanup_old_datasets.delay(days=30)
print(f'Task ID: {result.id}')
"
```

### Update Secrets

```bash
# Update JWT secret
kubectl create secret generic luna-backend-secrets \
  --from-literal=jwt-secret-key='new-secret-key' \
  --dry-run=client -o yaml | kubectl apply -f - -n luna-backend

# Restart pods to pick up new secret
kubectl rollout restart deployment/luna-backend-api -n luna-backend
```

## Performance Tuning

### Optimize Worker Performance

1. **Tune concurrency**:
   - CPU-bound tasks: concurrency = number of CPU cores
   - I/O-bound tasks: concurrency = 2-4x CPU cores

2. **Adjust prefetch multiplier**:
```bash
# In worker command args
--prefetch-multiplier=4
```

3. **Enable task result compression**:
```python
# In tasks.py
celery_app.conf.update(
    result_compression='gzip',
)
```

### Optimize API Performance

1. **Enable connection pooling** (already configured in db.py)

2. **Add Redis caching** for frequently accessed data

3. **Use async endpoints** for I/O operations

## Emergency Procedures

### Complete System Restart

```bash
# Scale down
kubectl scale deployment --all --replicas=0 -n luna-backend

# Wait for pods to terminate
kubectl get pods -n luna-backend

# Scale up
kubectl scale deployment luna-backend-api --replicas=2 -n luna-backend
kubectl scale deployment luna-backend-worker --replicas=3 -n luna-backend
```

### Rollback Deployment

```bash
# View history
helm history luna-backend -n luna-backend

# Rollback to previous version
helm rollback luna-backend -n luna-backend

# Rollback to specific revision
helm rollback luna-backend 3 -n luna-backend
```

### Emergency Queue Purge

```bash
kubectl exec -it deployment/luna-backend-worker -n luna-backend -- \
  celery -A tasks purge -f
```

## Contacts

- **On-Call Engineer**: [Slack channel or phone]
- **DevOps Team**: [Email or Slack]
- **Database Admin**: [Contact info]
