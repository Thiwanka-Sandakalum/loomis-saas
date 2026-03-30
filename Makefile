# DevOps Makefile for Loomis Platform

.PHONY: help init plan apply destroy validate fmt lint clean security deploy logs scale debug

ENVIRONMENT ?= dev
AWS_REGION ?= us-east-1
NAMESPACE ?= production
TF_VARS = environments/$(ENVIRONMENT).tfvars

help:
	@echo "Loomis Platform - DevOps Commands"
	@echo "=================================="
	@echo ""
	@echo "Infrastructure Commands:"
	@echo "  make init          - Initialize Terraform"
	@echo "  make plan          - Plan infrastructure changes"
	@echo "  make apply         - Apply infrastructure changes"
	@echo "  make destroy       - Destroy all infrastructure"
	@echo "  make validate      - Validate Terraform configuration"
	@echo "  make fmt           - Format Terraform files"
	@echo "  make lint          - Lint Terraform files"
	@echo ""
	@echo "Kubernetes Commands:"
	@echo "  make deploy        - Deploy all services to K8s"
	@echo "  make logs          - Stream logs from services"
	@echo "  make scale         - Scale deployments (REPLICAS=5)"
	@echo "  make debug         - Debug a pod (POD=name)"
	@echo "  make status        - Check cluster status"
	@echo "  make kubeconfig    - Update kubeconfig"
	@echo ""
	@echo "Local Development:"
	@echo "  make docker-up     - Start docker-compose"
	@echo "  make docker-down   - Stop docker-compose"
	@echo "  make docker-logs   - View docker-compose logs"
	@echo ""
	@echo "Security & Testing:"
	@echo "  make security      - Run security scans"
	@echo "  make test          - Run tests"
	@echo "  make lint-k8s      - Lint Kubernetes manifests"
	@echo ""
	@echo "Utility:"
	@echo "  make clean         - Clean Terraform files"
	@echo ""
	@echo "Usage:"
	@echo "  make ENVIRONMENT=dev apply"
	@echo "  make ENVIRONMENT=prod deploy"
	@echo ""

## Terraform Commands

init:
	@echo "Initializing Terraform..."
	cd infrastructure/terraform && \
	terraform init \
		-backend-config="bucket=$(TF_STATE_BUCKET)" \
		-backend-config="key=$(ENVIRONMENT).tfstate" \
		-backend-config="region=$(AWS_REGION)" \
		-backend-config="encrypt=true" \
		-backend-config="dynamodb_table=terraform-locks"

plan:
	@echo "Planning infrastructure for $(ENVIRONMENT)..."
	cd infrastructure/terraform && \
	terraform plan \
		-var-file="$(TF_VARS)" \
		-out=tfplan

apply: plan
	@echo "Applying infrastructure changes for $(ENVIRONMENT)..."
	cd infrastructure/terraform && \
	terraform apply tfplan
	@echo "Infrastructure applied. Run 'make kubeconfig' to update kubectl."

destroy:
	@echo "WARNING: This will destroy all $(ENVIRONMENT) infrastructure!"
	@echo "Press Ctrl+C to cancel, Enter to continue..."
	@read dummy
	cd infrastructure/terraform && \
	terraform destroy -var-file="$(TF_VARS)"

validate:
	@echo "Validating Terraform configuration..."
	cd infrastructure/terraform && \
	terraform validate

fmt:
	@echo "Formatting Terraform files..."
	cd infrastructure/terraform && \
	terraform fmt -recursive

lint:
	@echo "Linting Terraform files..."
	cd infrastructure/terraform && \
	terraform validate && \
	echo "✓ Terraform configuration is valid"

clean:
	@echo "Cleaning Terraform artifacts..."
	cd infrastructure/terraform && \
	rm -rf .terraform terraform.tfstate* .terraform.lock.hcl tfplan

## Kubernetes Commands

kubeconfig:
	@echo "Updating kubeconfig for $(ENVIRONMENT)..."
	aws eks update-kubeconfig \
		--name loomis-$(ENVIRONMENT)-eks \
		--region $(AWS_REGION)
	@echo "✓ Kubeconfig updated"

deploy: kubeconfig
	@echo "Deploying to Kubernetes..."
	kubectl apply -f infrastructure/k8s/namespace.yaml
	kubectl apply -f infrastructure/k8s/configmaps.yaml
	kubectl apply -f infrastructure/k8s/secrets.yaml
	@sleep 5
	kubectl apply -f infrastructure/k8s/mongodb-statefulset.yaml
	@sleep 10
	kubectl apply -f infrastructure/k8s/core-service-deployment.yaml
	@sleep 5
	kubectl apply -f infrastructure/k8s/brain-service-deployment.yaml
	@sleep 5
	kubectl apply -f infrastructure/k8s/admin-dashboard-deployment.yaml
	@sleep 5
	kubectl apply -f infrastructure/k8s/services.yaml
	kubectl apply -f infrastructure/k8s/ingress.yaml
	@echo "✓ Deployment complete"

status:
	@echo "=== Cluster Status ==="
	kubectl cluster-info
	@echo ""
	@echo "=== Nodes ==="
	kubectl get nodes
	@echo ""
	@echo "=== Deployments ==="
	kubectl get deployments -n $(NAMESPACE)
	@echo ""
	@echo "=== Pods ==="
	kubectl get pods -n $(NAMESPACE)
	@echo ""
	@echo "=== Services ==="
	kubectl get services -n $(NAMESPACE)
	@echo ""
	@echo "=== Ingress ==="
	kubectl get ingress -n $(NAMESPACE)

logs:
	@echo "Streaming logs from $(SERVICE) deployment..."
	kubectl logs -f deployment/$(SERVICE) -n $(NAMESPACE)

logs-previous:
	@echo "Showing previous logs from $(SERVICE) pod..."
	kubectl logs deployment/$(SERVICE) -n $(NAMESPACE) --previous

scale:
	@echo "Scaling $(SERVICE) to $(REPLICAS) replicas..."
	kubectl scale deployment/$(SERVICE) --replicas=$(REPLICAS) -n $(NAMESPACE)
	@echo "✓ Scaled successfully"

debug:
	@echo "Debugging pod: $(POD)"
	kubectl exec -it $(POD) -n $(NAMESPACE) -- /bin/sh

port-forward:
	@echo "Port forwarding $(SERVICE):$(PORT)"
	kubectl port-forward svc/$(SERVICE) $(PORT):$(PORT) -n $(NAMESPACE)

hpa:
	@echo "Setting up Horizontal Pod Autoscaler for $(SERVICE)..."
	kubectl autoscale deployment $(SERVICE) \
		--min=2 --max=10 --cpu-percent=70 \
		-n $(NAMESPACE)
	@echo "✓ HPA created"

## Local Development

docker-up:
	@echo "Starting docker-compose..."
	docker-compose up -d
	@echo "Services available:"
	@echo "  Admin Dashboard: http://localhost"
	@echo "  Core API: http://localhost:5000"
	@echo "  Brain API: http://localhost:8000"
	@echo "  MongoDB: localhost:27017"

docker-down:
	@echo "Stopping docker-compose..."
	docker-compose down

docker-logs:
	docker-compose logs -f

docker-build:
	@echo "Building Docker images..."
	docker-compose build --no-cache

## Security & Testing

security:
	@echo "Running security scans..."
	@echo "✓ Scanning Terraform..."
	cd infrastructure/terraform && tfsec . || true
	@echo "✓ Scanning Kubernetes manifests..."
	cd infrastructure/k8s && kubesec scan *.yaml || true
	@echo "✓ Security scan complete"

test:
	@echo "Running tests..."
	@echo "Backend tests:"
	cd core-service && dotnet test ./tests/ -c Release
	@echo "Brain service tests:"
	cd brain-service && npm test
	@echo "Frontend tests:"
	cd admin-dashboard && npm test

lint-k8s:
	@echo "Linting Kubernetes manifests..."
	kubectl apply -f infrastructure/k8s/ --dry-run=client -o yaml | kube-score score -
	@echo "✓ Manifests are valid"

## Utility

version:
	@echo "=== Version Information ==="
	@echo "Terraform: $$(terraform version -json | jq -r .terraform_version)"
	@echo "Kubernetes: $$(kubectl version --short --client)"
	@echo "AWS CLI: $$(aws --version)"
	@echo "Docker: $$(docker --version)"

check-tools:
	@echo "Checking required tools..."
	@command -v aws >/dev/null 2>&1 || { echo "✗ AWS CLI not found"; exit 1; }
	@command -v terraform >/dev/null 2>&1 || { echo "✗ Terraform not found"; exit 1; }
	@command -v kubectl >/dev/null 2>&1 || { echo "✗ kubectl not found"; exit 1; }
	@command -v docker >/dev/null 2>&1 || { echo "✗ Docker not found"; exit 1; }
	@echo "✓ All required tools found"

output:
	@echo "=== Terraform Outputs ==="
	cd infrastructure/terraform && \
	terraform output -json | jq .

info:
	@echo "=== Cluster Information ==="
	@echo "Environment: $(ENVIRONMENT)"
	@echo "AWS Region: $(AWS_REGION)"
	@echo "Namespace: $(NAMESPACE)"
	@echo "Terraform Variables File: $(TF_VARS)"

## Auto-targets

.DEFAULT_GOAL := help

# Silent rules
.SILENT: help version check-tools info

# Phony targets
.PHONY: \
	help init plan apply destroy validate fmt lint clean security test debug \
	deploy logs scale status kubeconfig docker-up docker-down docker-logs docker-build \
	check-tools version output info hpa logs-previous port-forward lint-k8s
