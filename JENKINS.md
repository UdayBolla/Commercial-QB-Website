# Jenkins CI/CD Pipeline Setup Guide

This guide provides step-by-step instructions for setting up a Jenkins CI/CD pipeline for the EasyShop application, including GitHub webhook configuration and shared library integration.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Jenkins Installation](#jenkins-installation)
- [Jenkins Configuration](#jenkins-configuration)
- [GitHub Webhook Setup](#github-webhook-setup)
- [Pipeline Configuration](#pipeline-configuration)
- [Shared Library Integration](#shared-library-integration)

## Prerequisites

- Ubuntu 22.04 LTS server
- Jenkins installed
- Docker installed
- Git installed
- GitHub account
- Docker Hub account

## Jenkins Installation

1. Add Jenkins repository key:
```bash
curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key | sudo tee \
    /usr/share/keyrings/jenkins-keyring.asc > /dev/null
```

2. Add Jenkins repository:
```bash
echo deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] \
    https://pkg.jenkins.io/debian-stable binary/ | sudo tee \
    /etc/apt/sources.list.d/jenkins.list > /dev/null
```

3. Update package list and install Jenkins:
```bash
sudo apt update
sudo apt install jenkins
```

4. Start Jenkins service:
```bash
sudo systemctl start jenkins
sudo systemctl enable jenkins
```

## Jenkins Configuration

### 1. Initial Setup

1. Get the initial admin password:
```bash
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

2. Access Jenkins:
- Open `http://your-server-ip:8080`
- Enter the initial admin password
- Install suggested plugins
- Create admin user

### 2. Required Plugins

Install these plugins via "Manage Jenkins" > "Manage Plugins" > "Available":
- Docker Pipeline
- Email Extension Plugin
- GitHub Integration Plugin
- Pipeline Utility Steps

### 3. Credentials Setup

1. Navigate to "Manage Jenkins" > "Manage Credentials"
2. Add Docker Hub credentials:
   - Kind: Username with password
   - Scope: Global
   - ID: docker-hub-credentials
   - Username: Your Docker Hub username
   - Password: Your Docker Hub password

### 4. Email Notifications

1. Go to "Manage Jenkins" > "Configure System"
2. Configure E-mail Notification:
   - SMTP server: smtp.gmail.com
   - Use SMTP Authentication: Yes
   - User Name: Your email
   - Password: Your app password
   - Use SSL: Yes
   - SMTP Port: 465

## GitHub Webhook Setup

### 1. Generate GitHub Token

1. Go to GitHub.com > Settings > Developer settings > Personal access tokens
2. Generate new token (classic)
3. Select scopes:
   - repo (all)
   - admin:repo_hook
4. Save the token

### 2. Configure GitHub in Jenkins

1. Add GitHub token to Jenkins credentials:
   - Kind: Secret text
   - Scope: Global
   - ID: github-token
   - Description: GitHub Token

### 3. Setup Webhook

1. In your GitHub repository:
   - Go to Settings > Webhooks
   - Add webhook
   - Payload URL: `http://your-jenkins-url:8080/github-webhook/`
   - Content type: application/json
   - Select: Just the push event

## Pipeline Configuration

### 1. Create Pipeline

1. Click "New Item"
2. Enter name: "qbshop-pipeline"
3. Select "Pipeline" and click "OK"
4. Configure:
   - **GitHub project URL**: `https://github.com/Dev664/Commercial-QB-Website`
   - **Build Triggers**: Select "GitHub hook trigger for GITScm polling"
   - **Pipeline**:
     - Definition: *Pipeline script from SCM*
     - SCM: *Git*
     - Repository URL: `https://github.com/Dev664/Commercial-QB-Website.git`
     - Credentials: Select `github-credentials`
     - Branch Specifier: `*/main`
     - Script Path: `Jenkinsfile`
5. Click "Save".

> [!NOTE]
> **100% Self-Contained Pipeline**: The `Jenkinsfile` is fully self-contained using native Jenkins Pipeline steps. It requires **zero external shared libraries** to be configured in Jenkins Global Pipeline Libraries.

### 2. Pipeline Execution Stages

The pipeline automatically runs the following stages:
1. **Cleanup Workspace**: Cleans previous workspace artifacts (`cleanWs()`).
2. **Checkout Code**: Checks out code from the `main` branch.
3. **Cleanup Docker Engine**: Prunes dangling containers and images to prevent disk exhaustion.
4. **Run Unit Tests**: Runs `npm test` validation.
5. **Build Docker Images (Parallel)**:
   - Main Next.js Web App (`doc201/qbshop-app:${BUILD_NUMBER}`)
   - Database Migration Job (`doc201/qbshop-migration:${BUILD_NUMBER}`)
6. **Security Scan with Trivy**: Runs security vulnerability scan on newly built images.
7. **Push Docker Images**: Authenticates securely using `docker-hub-credentials` and pushes versioned and `latest` tags to DockerHub.
8. **Update Kubernetes Manifests**: Updates image tags in `kubernetes/*.yaml`, commits, and pushes back to GitHub using `[ci skip]`.

### Logs Location

Important log locations:
- Jenkins logs: `/var/log/jenkins/jenkins.log`
- Docker logs: `docker logs container-name`
- Build logs: Available in Jenkins job console output

## References

- [Jenkins Documentation](https://www.jenkins.io/doc/)
- [Docker Documentation](https://docs.docker.com/)
- [GitHub Webhooks Guide](https://docs.github.com/en/webhooks)
- [Trivy Vulnerability Scanner](https://aquasecurity.github.io/trivy/)
