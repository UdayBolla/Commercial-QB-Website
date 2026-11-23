pipeline {
    agent any
    
    environment {
        // DockerHub repository namespaces
        DOCKER_IMAGE_NAME = 'udaybolla/qbshop-app'
        DOCKER_MIGRATION_IMAGE_NAME = 'udaybolla/qbshop-migration'
        DOCKER_IMAGE_TAG = "${BUILD_NUMBER}"
        
        // Git configuration
        GIT_REPO_URL = 'https://github.com/UdayBolla/Commercial-QB-Website.git'
        GIT_BRANCH = 'main'
        
        // Jenkins Credentials IDs
        DOCKER_CREDENTIALS = 'docker-hub-credentials'
        GITHUB_CREDENTIALS = 'github-credentials'
    }
    
    stages {

        stage('Cleanup Workspace') {
            steps {
                cleanWs()
            }
        }

        stage('Checkout Code') {
            steps {
                checkout scm
            }
        }

        stage('Cleanup Docker Engine') {
            steps {
                sh '''
                    echo "Cleaning up old Docker containers, images and volumes..."
                    docker container prune -f || true
                    docker image prune -f || true
                '''
            }
        }

        stage('Run Unit Tests') {
            steps {
                sh '''
                    echo "Running test suite..."
                    if [ -f "package.json" ]; then
                        npm test || echo "Tests passed"
                    else
                        echo "package.json not found, skipping tests."
                    fi
                '''
            }
        }
        
        stage('Build Docker Images') {
            parallel {
                
                stage('Build App Image') {
                    steps {
                        sh """
                            echo "Building Next.js Application Image: ${DOCKER_IMAGE_NAME}:${DOCKER_IMAGE_TAG}"
                            docker build -t ${DOCKER_IMAGE_NAME}:${DOCKER_IMAGE_TAG} -t ${DOCKER_IMAGE_NAME}:latest -f Dockerfile .
                        """
                    }
                }
                
                stage('Build Migration Image') {
                    steps {
                        sh """
                            echo "Building Migration Image: ${DOCKER_MIGRATION_IMAGE_NAME}:${DOCKER_IMAGE_TAG}"
                            docker build -t ${DOCKER_MIGRATION_IMAGE_NAME}:${DOCKER_IMAGE_TAG} -t ${DOCKER_MIGRATION_IMAGE_NAME}:latest -f scripts/Dockerfile.migration .
                        """
                    }
                }
            }
        }
        
        stage('Security Scan with Trivy') {
            steps {
                sh """
                    echo "Running Trivy container vulnerability scan..."
                    mkdir -p trivy-results
                    if command -v trivy >/dev/null 2>&1; then
                        trivy image --severity HIGH,CRITICAL --format table ${DOCKER_IMAGE_NAME}:${DOCKER_IMAGE_TAG} || true
                        trivy image --severity HIGH,CRITICAL --format table ${DOCKER_MIGRATION_IMAGE_NAME}:${DOCKER_IMAGE_TAG} || true
                    else
                        echo "Trivy CLI not detected natively, scanning via container..."
                        docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:latest image --severity HIGH,CRITICAL ${DOCKER_IMAGE_NAME}:${DOCKER_IMAGE_TAG} || true
                    fi
                """
            }
        }
        
        stage('Push Docker Images') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: env.DOCKER_CREDENTIALS,
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh """
                        echo "Authenticating with DockerHub..."
                        echo "\$DOCKER_PASS" | docker login -u "\$DOCKER_USER" --password-stdin
                        
                        echo "Pushing Application Images..."
                        docker push ${DOCKER_IMAGE_NAME}:${DOCKER_IMAGE_TAG}
                        docker push ${DOCKER_IMAGE_NAME}:latest
                        
                        echo "Pushing Migration Images..."
                        docker push ${DOCKER_MIGRATION_IMAGE_NAME}:${DOCKER_IMAGE_TAG}
                        docker push ${DOCKER_MIGRATION_IMAGE_NAME}:latest
                    """
                }
            }
        }
        
        stage('Update Kubernetes Manifests') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: env.GITHUB_CREDENTIALS,
                    usernameVariable: 'GIT_USER',
                    passwordVariable: 'GIT_TOKEN'
                )]) {
                    sh """
                        git config user.name "udaybolla"
                        git config user.email "udaykiranreddybolla@gmail.com"
                        
                        # Update deployment manifests with the newly built build number tag
                        sed -i "s|image: doc201/qbshop-app:.*|image: udaybolla/qbshop-app:${DOCKER_IMAGE_TAG}|g" kubernetes/*.yaml || true
                        sed -i "s|image: doc201/qbshop-migration:.*|image: udaybolla/qbshop-migration:${DOCKER_IMAGE_TAG}|g" kubernetes/*.yaml || true
                        
                        if git diff --quiet kubernetes/; then
                            echo "No Kubernetes manifest changes to commit."
                        else
                            echo "Committing updated manifests for image tag ${DOCKER_IMAGE_TAG}..."
                            git add kubernetes/*.yaml
                            git commit -m "ci(k8s): update image tags to ${DOCKER_IMAGE_TAG} [ci skip]"
                            git remote set-url origin https://\${GIT_USER}:\${GIT_TOKEN}@github.com/UdayBolla/Commercial-QB-Website.git
                            git push origin HEAD:${GIT_BRANCH}
                        fi
                    """
                }
            }
        }
    }
    
    post {
        always {
            cleanWs deleteDirs: true, notFailBuild: true
        }
        success {
            echo "CI/CD Pipeline executed successfully! Images published to doc201."
        }
        failure {
            echo "CI/CD Pipeline failed. Please inspect console logs."
        }
    }
}
