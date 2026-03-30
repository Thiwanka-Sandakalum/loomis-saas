# Loomis Platform - Troubleshooting Guide

## Common Issues and Solutions

### Deployment Issues

#### Issue: Pods stuck in "ImagePullBackOff"

**Symptoms:**
```
kubectl get pods -n production
NAME                              READY   STATUS              RESTARTS   AGE
core-service-7f8c5d9f7f-2k9m9    0/1     ImagePullBackOff    0          3m
```

**Causes & Solutions:**

1. **ECR Image Not Found**
   ```bash
   # Verify images exist
   aws ecr describe-images --repository-name loomis-core-service
   
   # Check image URI in manifest
   kubectl get deployment core-service -n production -o yaml | grep image:
   
   # If missing, build and push
   cd core-service
   docker build -t ${ECR_REGISTRY}/loomis-core-service:${TAG} .
   docker push ${ECR_REGISTRY}/loomis-core-service:${TAG}
   ```

2. **ECR Authentication Failure**
   ```bash
   # Create docker registry secret
   kubectl create secret docker-registry ecr-credentials \
     --docker-server=${ECR_REGISTRY} \
     --docker-username=AWS \
     --docker-password=$(aws ecr get-login-password --region us-east-1) \
     -n production
   
   # Add to ServiceAccount
   kubectl patch serviceaccount core-service \
     -p '{"imagePullSecrets": [{"name": "ecr-credentials"}]}' \
     -n production
   ```

3. **Image Pull Rate Limit**
   ```bash
   # Use specific image SHA instead of tag
   docker push ${ECR_REGISTRY}/loomis-core-service@sha256:abc123...
   # Update deployment to use SHA
   kubectl set image deployment/core-service \
     core-service=${ECR_REGISTRY}/loomis-core-service@sha256:abc123... \
     -n production
   ```

#### Issue: Pods stuck in "Pending"

**Symptoms:**
```
kubectl get pods -n production
NAME                            READY   STATUS    RESTARTS   AGE
core-service-7f8c5d9f7f-2k9m9   0/1     Pending   0          5m
```

**Causes & Solutions:**

1. **Insufficient Node Resources**
   ```bash
   # Check node capacity
   kubectl describe nodes
   
   # Look for resource allocation
   kubectl top nodes
   
   # Scale up node group
   aws eks update-nodegroup-config \
     --cluster-name loomis-dev-eks \
     --nodegroup-name loomis-dev-ng \
     --scaling-config minSize=2,maxSize=10,desiredSize=5
   ```

2. **PVC Not Available**
   ```bash
   # Check PVC status
   kubectl get pvc -n production
   kubectl describe pvc mongodb-pvc -n production
   
   # Create PVC if needed
   kubectl apply -f infrastructure/k8s/mongodb-statefulset.yaml
   ```

3. **Node Affinity/Selector Mismatch**
   ```bash
   # Check node labels
   kubectl get nodes --show-labels
   
   # Add label to nodes
   kubectl label nodes <node-name> workload-type=backend
   
   # Or modify pod affinity requirements
   kubectl patch deployment core-service -p \
     '{"spec":{"template":{"spec":{"affinity":null}}}}' \
     -n production
   ```

#### Issue: Pods stuck in "CrashLoopBackOff"

**Symptoms:**
```
kubectl get pods -n production
NAME                            READY   STATUS             RESTARTS   AGE
core-service-7f8c5d9f7f-2k9m9   0/1     CrashLoopBackOff   5          10m
```

**Solutions:**

1. **Check Application Logs**
   ```bash
   # View crash logs
   kubectl logs pod_name -n production
   kubectl logs pod_name --previous -n production  # Log from crashed pod
   
   # Stream live logs
   kubectl logs -f deployment/core-service -n production
   ```

2. **Common Application Errors**
   ```bash
   # Database connection error
   # - Verify database credentials
   # - Check security groups allow connection
   # - Verify connection string format
   
   # Port binding error
   # - Check if port already in use
   # - Verify container port != service port (port mapping)
   
   # Missing dependencies
   # - Rebuild image with all dependencies
   # - Check Dockerfile for RUN commands
   ```

3. **Debug in Pod**
   ```bash
   # Start debug pod
   kubectl run -it --rm debug --image=ubuntu --restart=Never \
     -n production -- /bin/bash
   
   # Test connectivity
   apt-get update && apt-get install curl -y
   curl http://core-service:5000/health
   ```

### Database Issues

#### Issue: MongoDB Connection Refused

**Symptoms:**
```
E_FAILED_CONNECTING_TO_MONGODB: failed connecting to mongodb://admin:***@mongodb:27017
```

**Solutions:**

1. **Verify MongoDB Pod Status**
   ```bash
   # Check if pod is running
   kubectl get pods -n production -l app=mongodb
   
   # Check pod logs
   kubectl logs -f deployment/mongodb -n production
   
   # If not running, describe pod
   kubectl describe pod <mongodb-pod-name> -n production
   ```

2. **Test MongoDB Connectivity**
   ```bash
   # Port forward to test locally
   kubectl port-forward svc/mongodb 27017:27017 -n production &
   
   # Test connection
   mongosh "mongodb://admin:password@localhost:27017/loomis?authSource=admin"
   ```

3. **Check MongoDB Authentication**
   ```bash
   # Verify credentials in secrets
   kubectl get secret mongodb-secrets -n production -o yaml
   
   # Compare with connection string used by app
   kubectl get configmap core-service-config -n production -o yaml
   ```

4. **Reset MongoDB User**
   ```bash
   # Access MongoDB directly
   kubectl exec -it mongodb-0 -n production -- mongosh
   
   # Reset user
   use admin
   db.dropUser('admin')
   db.createUser({
     user: 'admin',
     pwd: 'newpassword',
     roles: ['root']
   })
   ```

#### Issue: Database Out of Disk Space

**Symptoms:**
```
E: mongod: unable to allocate space (12): cannot allocate memory
StorageEngine 'wiredTiger' exited with code 69
```

**Solutions:**

1. **Check Disk Usage**
   ```bash
   # In MongoDB pod
   kubectl exec -it mongodb-0 -n production -- df -h
   
   # Check PVC usage
   kubectl get pvc -n production
   kubectl exec -it mongodb-0 -n production -- du -sh /data/db
   ```

2. **Expand PVC**
   ```bash
   # Edit PVC to increase size
   kubectl patch pvc mongodb-pvc -n production \
     -p '{"spec":{"resources":{"requests":{"storage":"100Gi"}}}}'
   
   # Verify expansion
   kubectl get pvc mongodb-pvc -n production
   ```

#### Issue: RDS Connection Timeout

**Symptoms:**
```
Timeout expired. The timeout period elapsed prior to completion of the operation or the database server did not respond in time.
```

**Solutions:**

1. **Check RDS Status**
   ```bash
   aws rds describe-db-instances \
     --db-instance-identifier loomis-dev-db \
     --query 'DBInstances[0].[DBInstanceStatus,DBInstanceIdentifier]'
   ```

2. **Check Security Groups**
   ```bash
   # Get RDS security group
   aws rds describe-db-instances \
     --db-instance-identifier loomis-dev-db \
     --query 'DBInstances[0].VpcSecurityGroups'
   
   # Check inbound rules
   aws ec2 describe-security-groups \
     --group-ids <security-group-id> \
     --query 'SecurityGroups[0].IpPermissions'
   ```

3. **Verify EKS Node Can Reach RDS**
   ```bash
   # From pod in cluster
   kubectl run -it --rm debug --image=ubuntu --restart=Never \
     -n production -- /bin/bash
   
   apt-get update && apt-get install postgresql-client -y
   psql -h <rds-endpoint> -U admin -d loomis
   ```

### Networking Issues

#### Issue: Service Unreachable

**Symptoms:**
```
curl: (7) Failed to connect to core-service:5000
```

**Solutions:**

1. **Check Service and Endpoints**
   ```bash
   # Verify service exists
   kubectl get services -n production
   
   # Check endpoints
   kubectl get endpoints -n production
   kubectl get endpoints core-service -n production
   
   # If no endpoints, pods not selected
   kubectl describe service core-service -n production
   ```

2. **Verify Pod Selectors**
   ```bash
   # Check service selector
   kubectl get service core-service -n production \
     -o jsonpath='{.spec.selector}'
   
   # Check pods have matching labels
   kubectl get pods -n production --show-labels
   ```

3. **Test Service DNS**
   ```bash
   # From pod in cluster
   kubectl exec -it <pod-name> -n production -- nslookup core-service
   
   # Should resolve to cluster IP
   # If not, check CoreDNS
   kubectl get pods -n kube-system -l k8s-app=kube-dns
   ```

#### Issue: ALB Not Routing Traffic

**Symptoms:**
```
Error 502: Bad Gateway
```

**Solutions:**

1. **Check Ingress Status**
   ```bash
   kubectl describe ingress main-ingress -n production
   
   # Look for ingress class and controller
   kubectl get ingressclass
   ```

2. **Verify Target Groups**
   ```bash
   # List target groups
   aws elbv2 describe-target-groups \
     --query 'TargetGroups[?contains(TargetGroupName, `k8s-`)].TargetGroupName'
   
   # Check target health
   aws elbv2 describe-target-health \
     --target-group-arn <arn>
   ```

3. **Check ALB Controller Logs**
   ```bash
   # ALB controller pod
   kubectl logs -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller
   ```

### Performance Issues

#### Issue: High CPU/Memory Usage

**Symptoms:**
```
kubectl top pods -n production
core-service-xxx   450m        800Mi  (usage > requests/limits)
```

**Solutions:**

1. **Identify Bottleneck**
   ```bash
   # Check resource requests vs actual usage
   kubectl describe deployment core-service -n production
   
   # Profile pod
   kubectl profile start core-service-xxx -n production
   # Wait 30s
   kubectl profile stop
   ```

2. **Scale Horizontally**
   ```bash
   # Increase replicas
   kubectl scale deployment core-service --replicas=5 -n production
   
   # Or enable HPA
   kubectl autoscale deployment core-service \
     --min=2 --max=10 --cpu-percent=70 -n production
   ```

3. **Optimize Application**
   - Review application logs for memory leaks
   - Implement caching strategies
   - Optimize database queries

#### Issue: High Network Latency

**Symptoms:**
```
Response time > 500ms consistently
```

**Solutions:**

1. **Check Pod Placement**
   ```bash
   # Ensure pods on same AZ for lower latency
   kubectl get pods -n production -o wide
   
   # Check pod affinity
   kubectl get deployment core-service \
     -o jsonpath='{.spec.template.spec.affinity}'
   ```

2. **Enable Network Policy Optimization**
   ```bash
   # Check current network policies
   kubectl get networkpolicies -n production
   
   # Optimize policies to reduce rule evaluation
   ```

3. **Use Service Mesh (Optional)**
   ```bash
   # Install Istio for better traffic management
   # istioctl install
   ```

## Monitoring and Debugging

### Enable Debug Logging

```bash
# Set pod debug level
kubectl set env deployment/core-service \
  LOG_LEVEL=DEBUG \
  -n production
```

### Access Pod Terminal

```bash
# Interactive shell in pod
kubectl exec -it <pod-name> -n production -- /bin/bash

# Run commands without interactive terminal
kubectl exec <pod-name> -n production -- cat /var/log/app.log
```

### Monitor Real-time Metrics

```bash
# Watch pod metrics
kubectl top pods -n production --watch

# Watch cluster metrics
kubectl top nodes --watch
```

## Recovery Procedures

### Database Backup Recovery

```bash
# From archived backup
mongorestore --uri "mongodb://<connection-string>" \
  ./backup --drop
```

### Cluster Recovery

```bash
# Recreate cluster from Terraform
cd infrastructure/terraform
terraform apply -var-file="environments/prod.tfvars"

# Reapply Kubernetes manifests
kubectl apply -f infrastructure/k8s/
```

### Data Migration

```bash
# Backup current data
mongodump --uri "mongodb://<old-connection>" --out ./backup

# Restore to new database
mongorestore --uri "mongodb://<new-connection>" ./backup
```

## Performance Tuning

### Database Connection Pooling

```bash
# Adjust in connection string
mongodb://user:pass@mongodb:27017/?maxPoolSize=100&minPoolSize=10
```

### Container Resource Limits

```bash
# Adjust based on actual usage
kubectl set resources deployment core-service \
  --requests=cpu=500m,memory=512Mi \
  --limits=cpu=1000m,memory=1Gi \
  -n production
```

### Cache Optimization

```bash
# Increase Redis memory
kubectl set env statefulset redis \
  MAXMEMORY="2gb" \
  MAXMEMORY_POLICY="allkeys-lru" \
  -n production
```

## Getting Help

- **Kubernetes**: https://kubernetes.io/docs/
- **AWS Support**: https://console.aws.amazon.com/support/
- **GitHub Issues**: Check project repository
- **Stack Overflow**: Tag with "kubernetes" and relevant service
