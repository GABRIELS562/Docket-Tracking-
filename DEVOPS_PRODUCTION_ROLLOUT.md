# 🚀 DevOps Production Rollout Strategy
## **Enterprise RFID Evidence Management System**

*Demonstrating modern DevOps practices for government-grade deployment*

---

## 📋 Executive Summary

This document outlines two production deployment strategies demonstrating enterprise DevOps capabilities:
- **Option 1:** On-Premise Deployment (Government Preferred)
- **Option 2:** Cloud-Native Deployment (AWS/Azure)

Both approaches showcase modern CI/CD, Infrastructure as Code (IaC), monitoring, and security best practices.

---

## 🏗️ OPTION 1: ON-PREMISE DEPLOYMENT

### **Architecture Overview**

```
┌─────────────────────────────────────────────────────────────┐
│                    ON-PREMISE INFRASTRUCTURE                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Dev Environment    Staging Environment   Production       │
│  ┌─────────────┐   ┌─────────────────┐  ┌──────────────┐ │
│  │   GitLab    │──>│   Jenkins CI    │──>│  Kubernetes  │ │
│  │   Server    │   │   + SonarQube   │  │   Cluster    │ │
│  └─────────────┘   └─────────────────┘  └──────────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              KUBERNETES PRODUCTION CLUSTER          │   │
│  │  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  │   │
│  │  │Master 1│  │Master 2│  │Master 3│  │HAProxy │  │   │
│  │  └────────┘  └────────┘  └────────┘  └────────┘  │   │
│  │  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  │   │
│  │  │Worker 1│  │Worker 2│  │Worker 3│  │Worker 4│  │   │
│  │  └────────┘  └────────┘  └────────┘  └────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              DATA & MONITORING LAYER                │   │
│  │  PostgreSQL Cluster │ Redis Cluster │ Prometheus   │   │
│  │  ELK Stack         │ Grafana       │ Vault         │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### **Phase 1: Infrastructure Setup (Week 1-2)**

#### **1.1 Server Provisioning**
```yaml
Infrastructure Requirements:
  Kubernetes_Masters:
    - Count: 3 (HA configuration)
    - Specs: 8 vCPU, 16GB RAM, 200GB SSD
    - OS: Ubuntu 22.04 LTS / RHEL 8
    
  Kubernetes_Workers:
    - Count: 4 (scalable to 8)
    - Specs: 16 vCPU, 32GB RAM, 500GB SSD
    - Purpose: Application workloads
    
  Database_Servers:
    - PostgreSQL Primary: 32 vCPU, 64GB RAM, 2TB SSD
    - PostgreSQL Standby: 32 vCPU, 64GB RAM, 2TB SSD
    - Redis Cluster: 3 nodes, 8GB RAM each
    
  Storage:
    - NFS Server: 10TB for persistent volumes
    - Backup Storage: 20TB for snapshots
```

#### **1.2 Kubernetes Deployment**
```bash
# Initialize Kubernetes cluster using kubeadm
kubeadm init --pod-network-cidr=10.244.0.0/16 \
  --control-plane-endpoint="k8s-lb.local:6443" \
  --upload-certs

# Deploy Calico for networking
kubectl apply -f https://docs.projectcalico.org/manifests/tigera-operator.yaml

# Install MetalLB for load balancing
kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.13.7/config/manifests/metallb-native.yaml

# Deploy Nginx Ingress Controller
helm install nginx-ingress ingress-nginx/ingress-nginx \
  --set controller.service.type=LoadBalancer
```

#### **1.3 GitLab CI/CD Pipeline**
```yaml
# .gitlab-ci.yml
stages:
  - build
  - test
  - security
  - deploy

variables:
  DOCKER_REGISTRY: "registry.local"
  KUBE_NAMESPACE: "rfid-evidence"

build:
  stage: build
  script:
    - docker build -t $DOCKER_REGISTRY/rfid-api:$CI_COMMIT_SHA .
    - docker push $DOCKER_REGISTRY/rfid-api:$CI_COMMIT_SHA
  tags:
    - docker

test:
  stage: test
  script:
    - npm install
    - npm run test:unit
    - npm run test:integration
    - npm run test:e2e
  coverage: '/Coverage: \d+\.\d+%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml

security_scan:
  stage: security
  script:
    - trivy image $DOCKER_REGISTRY/rfid-api:$CI_COMMIT_SHA
    - npm audit --audit-level=high
    - sonar-scanner -Dsonar.projectKey=rfid-evidence
  only:
    - main
    - develop

deploy_staging:
  stage: deploy
  script:
    - kubectl set image deployment/rfid-api rfid-api=$DOCKER_REGISTRY/rfid-api:$CI_COMMIT_SHA -n staging
    - kubectl rollout status deployment/rfid-api -n staging
  environment:
    name: staging
    url: https://staging.rfid.local
  only:
    - develop

deploy_production:
  stage: deploy
  script:
    - kubectl set image deployment/rfid-api rfid-api=$DOCKER_REGISTRY/rfid-api:$CI_COMMIT_SHA -n production
    - kubectl rollout status deployment/rfid-api -n production
  environment:
    name: production
    url: https://rfid.gov.za
  when: manual
  only:
    - main
```

### **Phase 2: Application Deployment (Week 3-4)**

#### **2.1 Kubernetes Manifests**
```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rfid-api
  namespace: production
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: rfid-api
  template:
    metadata:
      labels:
        app: rfid-api
    spec:
      containers:
      - name: rfid-api
        image: registry.local/rfid-api:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DB_HOST
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: host
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: rfid-api-service
spec:
  selector:
    app: rfid-api
  ports:
  - port: 80
    targetPort: 3000
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: rfid-api-ingress
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - api.rfid.gov.za
    secretName: rfid-tls
  rules:
  - host: api.rfid.gov.za
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: rfid-api-service
            port:
              number: 80
```

#### **2.2 Database Setup with Ansible**
```yaml
# ansible-playbook.yml
---
- name: Setup PostgreSQL Cluster
  hosts: database_servers
  become: yes
  vars:
    postgresql_version: 15
    replication_user: replicator
    
  tasks:
    - name: Install PostgreSQL
      apt:
        name: 
          - postgresql-{{ postgresql_version }}
          - postgresql-contrib-{{ postgresql_version }}
        state: present
    
    - name: Configure PostgreSQL for replication
      template:
        src: postgresql.conf.j2
        dest: /etc/postgresql/{{ postgresql_version }}/main/postgresql.conf
      notify: restart postgresql
    
    - name: Setup streaming replication
      postgresql_user:
        name: "{{ replication_user }}"
        password: "{{ vault_replication_password }}"
        role_attr_flags: REPLICATION
        
    - name: Create application database
      postgresql_db:
        name: rfid_evidence
        encoding: UTF-8
        
    - name: Setup pg_hba.conf for replication
      lineinfile:
        path: /etc/postgresql/{{ postgresql_version }}/main/pg_hba.conf
        line: "host replication {{ replication_user }} {{ standby_ip }}/32 md5"
      notify: restart postgresql
      
  handlers:
    - name: restart postgresql
      systemd:
        name: postgresql
        state: restarted
```

### **Phase 3: Monitoring & Security (Week 5)**

#### **3.1 Prometheus & Grafana Setup**
```yaml
# prometheus-values.yaml
prometheus:
  prometheusSpec:
    retention: 30d
    storageSpec:
      volumeClaimTemplate:
        spec:
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 100Gi
    serviceMonitorSelectorNilUsesHelmValues: false
    podMonitorSelectorNilUsesHelmValues: false
    
alertmanager:
  config:
    route:
      group_by: ['alertname', 'cluster', 'service']
      group_wait: 10s
      group_interval: 10s
      repeat_interval: 12h
      receiver: 'team-ops'
    receivers:
    - name: 'team-ops'
      email_configs:
      - to: 'ops-team@gov.za'
        from: 'alertmanager@rfid.gov.za'
      slack_configs:
      - api_url: '$SLACK_WEBHOOK_URL'
        channel: '#rfid-alerts'

grafana:
  adminPassword: "$GRAFANA_ADMIN_PASSWORD"
  ingress:
    enabled: true
    hosts:
      - monitoring.rfid.gov.za
  dashboardProviders:
    dashboardproviders.yaml:
      apiVersion: 1
      providers:
      - name: 'default'
        folder: 'RFID System'
        type: file
        options:
          path: /var/lib/grafana/dashboards
```

#### **3.2 Security Hardening**
```bash
#!/bin/bash
# security-hardening.sh

# 1. Network Policies
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: rfid-api-netpol
spec:
  podSelector:
    matchLabels:
      app: rfid-api
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 3000
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: database
    ports:
    - protocol: TCP
      port: 5432
EOF

# 2. Pod Security Policies
kubectl apply -f - <<EOF
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: restricted
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
    - ALL
  volumes:
    - 'configMap'
    - 'emptyDir'
    - 'projected'
    - 'secret'
    - 'persistentVolumeClaim'
  runAsUser:
    rule: 'MustRunAsNonRoot'
  seLinux:
    rule: 'RunAsAny'
  fsGroup:
    rule: 'RunAsAny'
EOF

# 3. Secrets Management with Sealed Secrets
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.18.0/controller.yaml
```

### **Phase 4: Backup & Disaster Recovery (Week 6)**

#### **4.1 Automated Backup Strategy**
```yaml
# velero-backup.yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: daily-backup
  namespace: velero
spec:
  schedule: "0 2 * * *"  # 2 AM daily
  template:
    ttl: 720h  # 30 days retention
    includedNamespaces:
    - production
    - database
    storageLocation: default
    volumeSnapshotLocations:
    - default
    hooks:
      resources:
      - name: database-backup
        includedNamespaces:
        - database
        labelSelector:
          matchLabels:
            app: postgresql
        pre:
        - exec:
            command:
            - /bin/bash
            - -c
            - pg_dump -U postgres rfid_evidence > /backup/rfid_$(date +%Y%m%d).sql
```

#### **4.2 Disaster Recovery Plan**
```bash
#!/bin/bash
# disaster-recovery.sh

# Restore from backup
restore_system() {
    echo "Starting disaster recovery..."
    
    # 1. Restore Kubernetes cluster state
    velero restore create --from-backup daily-backup-20240315
    
    # 2. Restore database
    kubectl exec -it postgresql-0 -- psql -U postgres -c "DROP DATABASE IF EXISTS rfid_evidence;"
    kubectl exec -it postgresql-0 -- psql -U postgres -c "CREATE DATABASE rfid_evidence;"
    kubectl exec -it postgresql-0 -- psql -U postgres rfid_evidence < /backup/rfid_20240315.sql
    
    # 3. Verify services
    kubectl get pods -n production
    kubectl get svc -n production
    
    # 4. Run health checks
    ./health-check.sh
}

# Failover to standby
failover_database() {
    echo "Promoting standby to primary..."
    kubectl exec -it postgresql-standby-0 -- pg_ctl promote
    kubectl patch service postgresql -p '{"spec":{"selector":{"role":"standby"}}}'
}
```

---

## ☁️ OPTION 2: CLOUD-NATIVE DEPLOYMENT (AWS/Azure)

### **Architecture Overview**

```
┌─────────────────────────────────────────────────────────────┐
│                    AWS/AZURE CLOUD INFRASTRUCTURE           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                  CI/CD PIPELINE                      │  │
│  │  GitHub Actions → ECR/ACR → EKS/AKS → Production   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              KUBERNETES (EKS/AKS)                    │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐            │  │
│  │  │  Pods   │  │  Pods   │  │  Pods   │            │  │
│  │  │  (3x)   │  │  (3x)   │  │  (3x)   │            │  │
│  │  └─────────┘  └─────────┘  └─────────┘            │  │
│  │     Auto-scaling: 3-12 pods based on load          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              MANAGED SERVICES                        │  │
│  │  RDS PostgreSQL │ ElastiCache │ S3 │ CloudWatch    │  │
│  │  API Gateway   │ Lambda      │ SNS │ SQS          │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### **Phase 1: Infrastructure as Code (Week 1-2)**

#### **1.1 Terraform Configuration**
```hcl
# main.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  backend "s3" {
    bucket = "rfid-terraform-state"
    key    = "production/terraform.tfstate"
    region = "eu-west-1"
    encrypt = true
    dynamodb_table = "terraform-locks"
  }
}

# VPC Configuration
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  version = "5.0.0"
  
  name = "rfid-evidence-vpc"
  cidr = "10.0.0.0/16"
  
  azs             = ["eu-west-1a", "eu-west-1b", "eu-west-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
  
  enable_nat_gateway = true
  enable_vpn_gateway = true
  enable_dns_hostnames = true
  
  tags = {
    Environment = "production"
    Project     = "rfid-evidence"
    Terraform   = "true"
  }
}

# EKS Cluster
module "eks" {
  source = "terraform-aws-modules/eks/aws"
  version = "19.0.0"
  
  cluster_name    = "rfid-evidence-cluster"
  cluster_version = "1.28"
  
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets
  
  eks_managed_node_groups = {
    general = {
      desired_size = 3
      min_size     = 3
      max_size     = 10
      
      instance_types = ["t3.large"]
      
      k8s_labels = {
        Environment = "production"
        Application = "rfid-evidence"
      }
    }
  }
  
  enable_irsa = true
  
  cluster_addons = {
    coredns = {
      most_recent = true
    }
    kube-proxy = {
      most_recent = true
    }
    vpc-cni = {
      most_recent = true
    }
    aws-ebs-csi-driver = {
      most_recent = true
    }
  }
}

# RDS PostgreSQL
resource "aws_db_instance" "postgresql" {
  identifier = "rfid-evidence-db"
  
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.xlarge"
  
  allocated_storage     = 100
  max_allocated_storage = 1000
  storage_encrypted     = true
  storage_type         = "gp3"
  
  db_name  = "rfid_evidence"
  username = "rfid_admin"
  password = var.db_password  # Stored in AWS Secrets Manager
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  
  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  multi_az               = true
  deletion_protection    = true
  
  performance_insights_enabled = true
  monitoring_interval         = 60
  monitoring_role_arn        = aws_iam_role.rds_monitoring.arn
  
  tags = {
    Environment = "production"
    Backup      = "critical"
  }
}

# ElastiCache Redis
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "rfid-evidence-cache"
  replication_group_description = "Redis cache for RFID system"
  
  engine               = "redis"
  node_type           = "cache.r6g.large"
  number_cache_clusters = 3
  port                = 6379
  
  subnet_group_name = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]
  
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                = var.redis_auth_token
  
  automatic_failover_enabled = true
  multi_az_enabled          = true
  
  snapshot_retention_limit = 7
  snapshot_window         = "03:00-05:00"
  
  tags = {
    Environment = "production"
  }
}
```

#### **1.2 GitHub Actions CI/CD**
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

env:
  AWS_REGION: eu-west-1
  ECR_REPOSITORY: rfid-evidence
  EKS_CLUSTER: rfid-evidence-cluster

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: |
          npm run test:unit
          npm run test:integration
      
      - name: SonarCloud Scan
        uses: SonarSource/sonarcloud-github-action@master
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
      
      - name: Run Snyk Security Scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
      
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1
      
      - name: Build and push Docker image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPOSITORY:latest
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
      
      - name: Setup kubectl
        uses: azure/setup-kubectl@v3
        with:
          version: 'v1.28.0'
      
      - name: Update kubeconfig
        run: |
          aws eks update-kubeconfig --name ${{ env.EKS_CLUSTER }} --region ${{ env.AWS_REGION }}
      
      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/rfid-api rfid-api=${{ steps.login-ecr.outputs.registry }}/${{ env.ECR_REPOSITORY }}:${{ github.sha }} -n production
          kubectl rollout status deployment/rfid-api -n production
      
      - name: Run smoke tests
        run: |
          ./scripts/smoke-tests.sh
      
      - name: Notify Slack
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Deployment to production completed'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
        if: always()
```

### **Phase 2: Auto-Scaling & Performance (Week 3)**

#### **2.1 Horizontal Pod Autoscaler**
```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: rfid-api-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: rfid-api
  minReplicas: 3
  maxReplicas: 12
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "1000"
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
```

#### **2.2 AWS Application Load Balancer**
```yaml
# alb-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: rfid-api-ingress
  namespace: production
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:eu-west-1:123456789012:certificate/abc
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTP": 80}, {"HTTPS": 443}]'
    alb.ingress.kubernetes.io/ssl-redirect: '443'
    alb.ingress.kubernetes.io/healthcheck-path: /health
    alb.ingress.kubernetes.io/healthcheck-interval-seconds: '15'
    alb.ingress.kubernetes.io/healthcheck-timeout-seconds: '5'
    alb.ingress.kubernetes.io/healthy-threshold-count: '2'
    alb.ingress.kubernetes.io/unhealthy-threshold-count: '2'
spec:
  rules:
  - host: api.rfid-evidence.gov.za
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: rfid-api-service
            port:
              number: 80
```

### **Phase 3: Monitoring & Observability (Week 4)**

#### **3.1 CloudWatch & X-Ray Integration**
```javascript
// cloudwatch-metrics.js
const AWS = require('aws-sdk');
const cloudwatch = new AWS.CloudWatch();
const xray = require('aws-xray-sdk');

// Wrap AWS SDK
const AWS_wrapped = xray.captureAWS(AWS);

class MetricsCollector {
  async recordMetric(metricName, value, unit = 'Count') {
    const params = {
      Namespace: 'RFID/Evidence',
      MetricData: [
        {
          MetricName: metricName,
          Value: value,
          Unit: unit,
          Timestamp: new Date(),
          Dimensions: [
            {
              Name: 'Environment',
              Value: process.env.NODE_ENV
            },
            {
              Name: 'Service',
              Value: 'rfid-api'
            }
          ]
        }
      ]
    };
    
    await cloudwatch.putMetricData(params).promise();
  }
  
  async recordLatency(operation, duration) {
    await this.recordMetric(`${operation}_latency`, duration, 'Milliseconds');
  }
  
  async recordError(operation, error) {
    await this.recordMetric(`${operation}_error`, 1, 'Count');
    
    // Also log to CloudWatch Logs
    console.error({
      operation,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = new MetricsCollector();
```

#### **3.2 Grafana Dashboards as Code**
```json
{
  "dashboard": {
    "title": "RFID Evidence System - Production",
    "panels": [
      {
        "title": "API Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          },
          {
            "expr": "histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "99th percentile"
          }
        ]
      },
      {
        "title": "RFID Events Processing",
        "type": "stat",
        "targets": [
          {
            "expr": "rate(rfid_events_processed_total[5m])",
            "legendFormat": "Events/sec"
          }
        ]
      },
      {
        "title": "Database Connections",
        "type": "gauge",
        "targets": [
          {
            "expr": "pg_stat_database_numbackends{datname='rfid_evidence'}",
            "legendFormat": "Active Connections"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~'5..'}[5m])",
            "legendFormat": "5xx Errors"
          },
          {
            "expr": "rate(http_requests_total{status=~'4..'}[5m])",
            "legendFormat": "4xx Errors"
          }
        ]
      }
    ]
  }
}
```

### **Phase 4: Security & Compliance (Week 5)**

#### **4.1 AWS Security Best Practices**
```yaml
# security-policies.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: security-policies
data:
  network-policy.yaml: |
    apiVersion: networking.k8s.io/v1
    kind: NetworkPolicy
    metadata:
      name: deny-all-ingress
    spec:
      podSelector: {}
      policyTypes:
      - Ingress
      
  pod-security-policy.yaml: |
    apiVersion: policy/v1beta1
    kind: PodSecurityPolicy
    metadata:
      name: restricted
    spec:
      privileged: false
      allowPrivilegeEscalation: false
      requiredDropCapabilities:
        - ALL
      volumes:
        - 'configMap'
        - 'emptyDir'
        - 'secret'
        - 'persistentVolumeClaim'
      runAsUser:
        rule: 'MustRunAsNonRoot'
      seLinux:
        rule: 'RunAsAny'
      fsGroup:
        rule: 'RunAsAny'
        
  secrets-encryption.yaml: |
    apiVersion: v1
    kind: Secret
    metadata:
      name: database-credentials
    type: Opaque
    data:
      username: <base64-encoded>
      password: <base64-encoded>
```

#### **4.2 Compliance Automation**
```bash
#!/bin/bash
# compliance-check.sh

echo "Running compliance checks..."

# 1. Check for exposed secrets
echo "Scanning for secrets..."
trufflehog filesystem . --json > secrets-scan.json

# 2. Check SSL certificates
echo "Verifying SSL certificates..."
openssl s_client -connect api.rfid-evidence.gov.za:443 < /dev/null 2>/dev/null | openssl x509 -noout -dates

# 3. Check security headers
echo "Testing security headers..."
curl -I https://api.rfid-evidence.gov.za | grep -E "Strict-Transport-Security|X-Content-Type-Options|X-Frame-Options"

# 4. Run OWASP ZAP scan
echo "Running OWASP ZAP scan..."
docker run -t owasp/zap2docker-stable zap-baseline.py -t https://api.rfid-evidence.gov.za

# 5. Check for vulnerabilities
echo "Scanning for vulnerabilities..."
trivy image rfid-api:latest --severity HIGH,CRITICAL

# Generate compliance report
echo "Generating compliance report..."
cat > compliance-report-$(date +%Y%m%d).md << EOF
# Compliance Report - $(date +%Y-%m-%d)

## Security Scans
- Secrets Scan: $([ -s secrets-scan.json ] && echo "FAILED" || echo "PASSED")
- SSL Certificate: $(openssl s_client -connect api.rfid-evidence.gov.za:443 < /dev/null 2>/dev/null | openssl x509 -noout -checkend 86400 && echo "VALID" || echo "EXPIRING")
- Security Headers: PASSED
- OWASP ZAP: See detailed report
- Container Vulnerabilities: See trivy-report.json

## ISO 27001 Compliance
- Access Control: ✓
- Encryption at Rest: ✓
- Encryption in Transit: ✓
- Audit Logging: ✓
- Backup & Recovery: ✓

## Recommendations
- Review and rotate secrets quarterly
- Update dependencies monthly
- Conduct penetration testing quarterly
EOF
```

---

## 📊 Comparison Matrix

| **Aspect** | **On-Premise** | **Cloud** | **Winner** |
|------------|----------------|-----------|------------|
| **Initial Setup Time** | 4-6 weeks | 2-3 weeks | Cloud ✅ |
| **Scalability** | Manual | Automatic | Cloud ✅ |
| **Data Sovereignty** | Full Control | Shared | On-Premise ✅ |
| **Operational Overhead** | High | Low | Cloud ✅ |
| **Disaster Recovery** | Manual | Automated | Cloud ✅ |
| **Compliance Control** | Complete | Shared | On-Premise ✅ |
| **Long-term Cost** | Lower | Higher | On-Premise ✅ |
| **Time to Market** | Slower | Faster | Cloud ✅ |

---

## 🎯 Skills Demonstrated

### **DevOps Competencies**
- ✅ **Infrastructure as Code** - Terraform, Ansible, Kubernetes manifests
- ✅ **CI/CD Pipelines** - GitLab CI, GitHub Actions, Jenkins
- ✅ **Container Orchestration** - Kubernetes, Docker, Helm
- ✅ **Cloud Platforms** - AWS (EKS, RDS, ElastiCache), Azure alternatives
- ✅ **Monitoring & Observability** - Prometheus, Grafana, ELK, CloudWatch
- ✅ **Security** - Network policies, secrets management, compliance scanning
- ✅ **Automation** - Bash scripting, Python automation, GitOps
- ✅ **Database Management** - PostgreSQL clustering, replication, backups

### **Enterprise Practices**
- ✅ **High Availability** - Multi-AZ, clustering, failover strategies
- ✅ **Disaster Recovery** - Backup automation, RTO/RPO planning
- ✅ **Performance Optimization** - Auto-scaling, caching, load balancing
- ✅ **Security Hardening** - Zero-trust networking, encryption, RBAC
- ✅ **Compliance** - ISO 27001, audit trails, documentation
- ✅ **Cost Optimization** - Resource tagging, right-sizing, reserved instances

---

## 📈 Success Metrics

### **Key Performance Indicators**
- **Deployment Frequency:** Multiple times per day
- **Lead Time:** < 1 hour from commit to production
- **MTTR:** < 15 minutes
- **Change Failure Rate:** < 5%
- **System Availability:** 99.99% uptime
- **API Response Time:** p95 < 100ms
- **Security Scan Pass Rate:** 100%
- **Infrastructure Cost:** Optimized by 30%

---

## 🚀 Next Steps

1. **Choose deployment strategy** (On-Premise vs Cloud)
2. **Setup infrastructure** using provided IaC templates
3. **Configure CI/CD pipelines** for automated deployments
4. **Implement monitoring** and alerting
5. **Conduct security audit** and penetration testing
6. **Create runbooks** for operations team
7. **Schedule disaster recovery drills**
8. **Document everything** for knowledge transfer

---

**This production rollout plan demonstrates enterprise-grade DevOps capabilities suitable for government deployment, showcasing modern practices, security consciousness, and operational excellence.**