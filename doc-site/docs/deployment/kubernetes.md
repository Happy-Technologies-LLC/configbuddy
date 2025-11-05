# Kubernetes Deployment

Deploy ConfigBuddy CMDB on Kubernetes for production-grade scalability and high availability.

## Prerequisites

- Kubernetes cluster 1.25 or higher
- `kubectl` configured to access your cluster
- Helm 3.x installed (for Helm chart deployment)
- At least 3 worker nodes with 4GB RAM each
- Storage class configured for persistent volumes

## Deployment Methods

### Method 1: Helm Chart (Recommended)

#### Install ConfigBuddy using Helm

```bash
# Add the ConfigBuddy Helm repository
helm repo add configbuddy https://charts.configbuddy.io
helm repo update

# Install with default values
helm install configbuddy configbuddy/configbuddy \\
  --namespace configbuddy \\
  --create-namespace

# Or install with custom values
helm install configbuddy configbuddy/configbuddy \\
  --namespace configbuddy \\
  --create-namespace \\
  --values custom-values.yaml
```

#### Custom Values Example

Create `custom-values.yaml`:

```yaml
# ConfigBuddy Helm Values

# Global settings
global:
  storageClass: "gp3"  # AWS EBS gp3
  domain: "cmdb.example.com"

# API Server
api:
  replicaCount: 3
  resources:
    requests:
      memory: "512Mi"
      cpu: "500m"
    limits:
      memory: "2Gi"
      cpu: "2000m"
  autoscaling:
    enabled: true
    minReplicas: 3
    maxReplicas: 10
    targetCPUUtilizationPercentage: 70

# Discovery Engine
discovery:
  replicaCount: 2
  resources:
    requests:
      memory: "1Gi"
      cpu: "1000m"
    limits:
      memory: "4Gi"
      cpu: "4000m"

# Neo4j Database
neo4j:
  enabled: true
  persistence:
    size: 50Gi
  resources:
    requests:
      memory: "4Gi"
      cpu: "2000m"
    limits:
      memory: "8Gi"
      cpu: "4000m"

# PostgreSQL Database
postgresql:
  enabled: true
  persistence:
    size: 100Gi
  resources:
    requests:
      memory: "2Gi"
      cpu: "1000m"
    limits:
      memory: "4Gi"
      cpu: "2000m"

# Redis
redis:
  enabled: true
  persistence:
    size: 10Gi
  resources:
    requests:
      memory: "512Mi"
      cpu: "500m"
    limits:
      memory: "2Gi"
      cpu: "1000m"

# Ingress
ingress:
  enabled: true
  className: "nginx"
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
  hosts:
    - host: cmdb.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: configbuddy-tls
      hosts:
        - cmdb.example.com

# Monitoring
monitoring:
  enabled: true
  prometheus:
    enabled: true
  grafana:
    enabled: true
```

### Method 2: Kubectl with Manifests

#### 1. Create Namespace

```bash
kubectl create namespace configbuddy
```

#### 2. Create Secrets

```bash
# Database credentials
kubectl create secret generic db-credentials \\
  --namespace configbuddy \\
  --from-literal=neo4j-password='your-neo4j-password' \\
  --from-literal=postgres-password='your-postgres-password' \\
  --from-literal=redis-password='your-redis-password'

# Application secrets
kubectl create secret generic app-secrets \\
  --namespace configbuddy \\
  --from-literal=jwt-secret='your-jwt-secret' \\
  --from-literal=api-key='your-api-key'

# Cloud provider credentials (if using discovery)
kubectl create secret generic cloud-credentials \\
  --namespace configbuddy \\
  --from-literal=aws-access-key-id='your-aws-key' \\
  --from-literal=aws-secret-access-key='your-aws-secret' \\
  --from-literal=azure-client-id='your-azure-client' \\
  --from-literal=azure-client-secret='your-azure-secret'
```

#### 3. Apply Manifests

```bash
# Apply all manifests
kubectl apply -f k8s/

# Or apply individually
kubectl apply -f k8s/neo4j/
kubectl apply -f k8s/postgresql/
kubectl apply -f k8s/redis/
kubectl apply -f k8s/api-server/
kubectl apply -f k8s/discovery-engine/
kubectl apply -f k8s/etl-processor/
kubectl apply -f k8s/web-ui/
kubectl apply -f k8s/ingress/
```

## Verification

### Check Pod Status

```bash
kubectl get pods -n configbuddy
```

Expected output:
```
NAME                                READY   STATUS    RESTARTS   AGE
configbuddy-api-xxx                 1/1     Running   0          5m
configbuddy-discovery-xxx           1/1     Running   0          5m
configbuddy-etl-xxx                 1/1     Running   0          5m
configbuddy-neo4j-0                 1/1     Running   0          5m
configbuddy-postgresql-0            1/1     Running   0          5m
configbuddy-redis-0                 1/1     Running   0          5m
configbuddy-web-ui-xxx              1/1     Running   0          5m
```

### Check Services

```bash
kubectl get svc -n configbuddy
```

### Check Ingress

```bash
kubectl get ingress -n configbuddy
```

### View Logs

```bash
# API Server logs
kubectl logs -n configbuddy -l app=configbuddy-api -f

# Discovery Engine logs
kubectl logs -n configbuddy -l app=configbuddy-discovery -f
```

## Scaling

### Manual Scaling

```bash
# Scale API servers
kubectl scale deployment configbuddy-api \\
  --namespace configbuddy \\
  --replicas=5

# Scale discovery workers
kubectl scale deployment configbuddy-discovery \\
  --namespace configbuddy \\
  --replicas=3
```

### Horizontal Pod Autoscaling

```bash
# Enable autoscaling for API servers
kubectl autoscale deployment configbuddy-api \\
  --namespace configbuddy \\
  --min=3 \\
  --max=10 \\
  --cpu-percent=70
```

## Monitoring

### Install Prometheus Stack

```bash
# Add Prometheus Helm repo
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Install Prometheus + Grafana
helm install prometheus prometheus-community/kube-prometheus-stack \\
  --namespace monitoring \\
  --create-namespace
```

### Access Grafana

```bash
# Port forward Grafana
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80
```

Open `http://localhost:3000` (default credentials: admin/prom-operator)

## Backup Strategy

### Neo4j Backups

```bash
# Create a CronJob for automated backups
kubectl apply -f k8s/backup/neo4j-backup-cronjob.yaml
```

### PostgreSQL Backups

```bash
# Create a CronJob for automated backups
kubectl apply -f k8s/backup/postgres-backup-cronjob.yaml
```

## Troubleshooting

### Pods Not Starting

```bash
# Describe pod to see events
kubectl describe pod <pod-name> -n configbuddy

# Check logs
kubectl logs <pod-name> -n configbuddy
```

### Database Connection Issues

```bash
# Test Neo4j connection
kubectl run -it --rm debug \\
  --image=neo4j:5 \\
  --namespace configbuddy \\
  --restart=Never \\
  -- cypher-shell -u neo4j -p password -a bolt://configbuddy-neo4j:7687

# Test PostgreSQL connection
kubectl run -it --rm debug \\
  --image=postgres:15 \\
  --namespace configbuddy \\
  --restart=Never \\
  -- psql -h configbuddy-postgresql -U postgres
```

## Production Checklist

- [ ] Enable TLS/SSL for all services
- [ ] Configure persistent volumes with appropriate storage class
- [ ] Set up automated backups
- [ ] Configure resource limits and requests
- [ ] Enable horizontal pod autoscaling
- [ ] Set up monitoring and alerting
- [ ] Configure ingress with valid certificates
- [ ] Implement network policies
- [ ] Set up log aggregation
- [ ] Document disaster recovery procedures

## Next Steps

- [Health Checks](./health-checks)
- [Monitoring Setup](/monitoring/overview)
- [Backup Procedures](/operations/backup/procedures)
- [Scaling Guide](/operations/scaling/overview)
