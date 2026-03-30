# Loomis Platform - Auto-Scaling Configuration Guide

## Overview

The Loomis platform uses multiple autoscaling mechanisms to handle varying workloads efficiently:

1. **Horizontal Pod Autoscaler (HPA)** - Scale pods based on metrics
2. **Cluster Autoscaler** - Scale EC2 nodes based on pod capacity
3. **Application Load Balancer (ALB)** - Distribute traffic
4. **CloudWatch Alarms** - Monitor and trigger actions

## Horizontal Pod Autoscaler (HPA)

### Core Service Autoscaling

```bash
# Create HPA for core service
kubectl autoscale deployment core-service \
  --min=2 \
  --max=10 \
  --cpu-percent=70 \
  -n production
```

Or using manifest:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: core-service-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: core-service
  minReplicas: 2
  maxReplicas: 10
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
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
      - type: Pods
        value: 2
        periodSeconds: 15
      selectPolicy: Max
```

### Brain Service Autoscaling

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: brain-service-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: brain-service
  minReplicas: 2
  maxReplicas: 8
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 75
  - type: Pods
    pods:
      metric:
        name: http_request_duration_seconds_bucket
        selector:
          matchLabels:
            le: "1"
      target:
        type: AverageValue
        averageValue: "100"
```

### Admin Dashboard (Frontend) Autoscaling

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: admin-dashboard-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: admin-dashboard
  minReplicas: 2
  maxReplicas: 5
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 80
```

### Apply HPA Configurations

```bash
# Apply HPAs
kubectl apply -f - << EOF
[Paste YAML manifests above]
EOF

# Verify HPAs are active
kubectl get hpa -n production
kubectl describe hpa core-service-hpa -n production
```

### Monitor HPA Status

```bash
# Watch HPA status
watch kubectl get hpa -n production

# Check HPA metrics
kubectl get hpa -n production \
  -o custom-columns=NAME:.metadata.name,\
REFERENCE:.spec.scaleTargetRef.name,\
TARGET:.status.currentMetrics[0].resource.current.averageUtilization,\
MINPODS:.spec.minReplicas,\
MAXPODS:.spec.maxReplicas,\
REPLICAS:.status.currentReplicas,\
AGE:.metadata.creationTimestamp
```

## Cluster Autoscaler

### Install Cluster Autoscaler

```bash
# Add Helm repository
helm repo add autoscaling https://kubernetes.github.io/autoscaler

# Install cluster autoscaler
helm install cluster-autoscaler autoscaling/cluster-autoscaler \
  --namespace kube-system \
  --set autoDiscovery.clusterName=loomis-${ENVIRONMENT}-eks \
  --set awsRegion=us-east-1 \
  --set cloudProvider=aws
```

### Configure EKS Node Group for Autoscaling

```bash
# Tag node group for autoscaler discovery
aws eks create-nodegroup \
  --cluster-name loomis-${ENVIRONMENT}-eks \
  --nodegroup-name loomis-${ENVIRONMENT}-ng \
  --tags "k8s.io/cluster-autoscaler/loomis-${ENVIRONMENT}-eks=owned"

# Or update existing node group
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name loomis-${ENVIRONMENT}-nodes \
  --tags "Key=k8s.io/cluster-autoscaler/loomis-${ENVIRONMENT}-eks,Value=owned,PropagateAtLaunch=true"
```

### Cluster Autoscaler Configuration

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-autoscaler
  namespace: kube-system
data:
  # Minimum nodes to keep even if unused
  scale-down-min-utilization-threshold: "0.65"
  
  # Time pod must be unschedulable before scale-up
  unschedulable-time-threshold: "2m"
  
  # Time to wait before scale-down after scale-up
  scale-down-delay-after-add: "10m"
  
  # Max percent of nodes to scale down at once
  scale-down-max-percentage: "33"
  
  # Nodes to exclude from scaling
  skip-nodes-with-system-pods: "false"
```

### Monitor Cluster Autoscaler

```bash
# Check autoscaler logs
kubectl logs -n kube-system -l app=cluster-autoscaler -f

# View autoscaler events
kubectl get events -n kube-system | grep cluster-autoscaler

# Monitor node count
watch kubectl get nodes
```

## Database Autoscaling

### RDS Auto-Scaling

```bash
# Enable autoscaling for RDS
aws rds modify-db-instance \
  --db-instance-identifier loomis-${ENVIRONMENT}-db \
  --apply-immediately \
  --storage-type gp3 \
  --allocated-storage 500 \
  --max-allocated-storage 1000
```

### MongoDB Atlas Auto-Scaling

```bash
# Enable autoscaling via MongoDB Atlas API
curl --request PATCH \
  --url "https://cloud.mongodb.com/api/atlas/v1.0/groups/{groupId}/clusters/{clusterName}" \
  --header "Accept: application/json" \
  --header "Content-Type: application/json" \
  --data '{
    "autoScaling": {
      "compute": {
        "enabled": true,
        "scaleDownEnabled": true
      },
      "storage": {
        "enabled": true
      }
    }
  }' \
  --digest -u "{username}:{apiKey}"
```

## Load Balancer Configuration

### ALB Target Group Metrics

```bash
# Get ALB ARN
ALB_ARN=$(aws elbv2 describe-load-balancers \
  --names "k8s-loomis-..." \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text)

# Configure deregistration delay
aws elbv2 modify-target-group-attributes \
  --target-group-arn "<target-group-arn>" \
  --attributes \
    Key=deregistration_delay.timeout_seconds,Value=30 \
    Key=load_balancing.algorithm.type,Value=least_outstanding_requests
```

## CloudWatch Alarms for Scaling

### High Load Alarm

```bash
# Create alarm for high CPU
aws cloudwatch put-metric-alarm \
  --alarm-name loomis-${ENVIRONMENT}-high-cpu \
  --alarm-description "Alert on high CPU usage" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 60 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:${ACCOUNT_ID}:AlertTopic
```

### Low Load Alarm

```bash
# Create alarm for low CPU (scale down)
aws cloudwatch put-metric-alarm \
  --alarm-name loomis-${ENVIRONMENT}-low-cpu \
  --alarm-description "Alert on low CPU usage" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 15 \
  --comparison-operator LessThanThreshold \
  --evaluation-periods 4 \
  --alarm-actions arn:aws:sns:us-east-1:${ACCOUNT_ID}:ScaleDownTopic
```

## Custom Metrics Scaling

### Using Prometheus Metrics

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: custom-metric-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: core-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "100"
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## Testing Autoscaling

### Load Testing

```bash
# Create load testing pod
kubectl run -it --rm loadgen --image=busybox --restart=Never \
  -n production -- /bin/sh

# Generate requests
while sleep 0.01; do wget -q -O- http://core-service:5000/api/health; done

# In another terminal, watch scaling
watch kubectl get hpa -n production
watch kubectl get pods -n production
```

### Simulate Outage

```bash
# Delete a pod to trigger rescheduling
kubectl delete pod <pod-name> -n production

# Watch cluster scale up
watch kubectl get nodes
watch kubectl get events -n production
```

## Scaling Bottlenecks & Solutions

### CPU Bottleneck

```bash
# Increase CPU requests
kubectl set resources deployment core-service \
  --requests=cpu=500m \
  -n production

# Check for blocking operations
kubectl logs deployment/core-service -n production | grep "waiting\|slow"
```

### Memory Bottleneck

```bash
# Increase memory limits
kubectl set resources deployment core-service \
  --limits=memory=2Gi \
  -n production

# Debug memory usage
kubectl debug <pod-name> -n production -it --share-processes
```

### Network Bottleneck

```bash
# Check ALB connection limits
aws elbv2 describe-target-group-attributes \
  --target-group-arn "<arn>"

# Increase connection draining
aws elbv2 modify-target-group-attributes \
  --target-group-arn "<arn>" \
  --attributes Key=deregistration_delay.timeout_seconds,Value=60
```

### Database Bottleneck

```bash
# Scale RDS read replicas
aws rds create-db-instance-read-replica \
  --db-instance-identifier loomis-${ENVIRONMENT}-db-replica-1 \
  --source-db-instance-identifier loomis-${ENVIRONMENT}-db

# Enable query caching with Redis
kubectl exec redis -n production -- redis-cli INFO stats
```

## Best Practices

1. **Set Appropriate Resource Requests** - Ensure HPA has accurate metrics
2. **Use Multiple Metrics** - Combine CPU, memory, and custom metrics
3. **Configure Scale-Down Carefully** - Prevent thrashing with delays
4. **Monitor Scaling Events** - Log and analyze all scaling operations
5. **Test Before Production** - Load test autoscaling thresholds
6. **Use Pod Disruption Budgets** - Ensure availability during scaling
7. **Plan for Peak Load** - Set max replicas beyond expected peak
8. **Use Reserved Instances** - For baseline capacity (cost optimization)
