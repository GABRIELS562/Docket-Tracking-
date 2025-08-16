#!/bin/bash

# Production Deployment Script for RFID Docket Tracking System
# This script handles the complete deployment process including:
# - Environment setup
# - Database migrations
# - Application build
# - Service deployment
# - Health checks
# - Rollback capability

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOYMENT_ENV="${1:-production}"
BRANCH="${2:-main}"
BACKUP_RETENTION_DAYS=7
MAX_ROLLBACK_VERSIONS=5

# Directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOY_DIR="/opt/docket-tracking"
BACKUP_DIR="/opt/backups/docket-tracking"
LOG_DIR="/var/log/docket-tracking"

# Load environment-specific configuration
if [ -f "$SCRIPT_DIR/config/${DEPLOYMENT_ENV}.env" ]; then
    source "$SCRIPT_DIR/config/${DEPLOYMENT_ENV}.env"
else
    echo -e "${RED}Error: Environment configuration file not found: $SCRIPT_DIR/config/${DEPLOYMENT_ENV}.env${NC}"
    exit 1
fi

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_DIR/deployment.log"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$LOG_DIR/deployment.log"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS: $1${NC}" | tee -a "$LOG_DIR/deployment.log"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$LOG_DIR/deployment.log"
}

# Pre-deployment checks
pre_deployment_checks() {
    log "Starting pre-deployment checks..."
    
    # Check if running as correct user
    if [ "$EUID" -eq 0 ]; then
        error "This script should not be run as root"
        exit 1
    fi
    
    # Check required commands
    local required_commands=("node" "npm" "docker" "docker-compose" "pg_dump" "psql" "git")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            error "Required command not found: $cmd"
            exit 1
        fi
    done
    
    # Check Node.js version
    local node_version=$(node --version | sed 's/v//')
    local required_version="18.0.0"
    if ! printf '%s\n%s\n' "$required_version" "$node_version" | sort -V -C; then
        error "Node.js version $node_version is too old. Required: $required_version+"
        exit 1
    fi
    
    # Check disk space (minimum 5GB)
    local available_space=$(df "$DEPLOY_DIR" | awk 'NR==2 {print $4}')
    if [ "$available_space" -lt 5242880 ]; then
        error "Insufficient disk space. Available: ${available_space}KB, Required: 5GB"
        exit 1
    fi
    
    # Check database connectivity
    if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
        error "Cannot connect to database"
        exit 1
    fi
    
    # Check if previous deployment is still running
    if pgrep -f "node.*server" > /dev/null; then
        warning "Previous deployment is still running. Will be stopped during deployment."
    fi
    
    success "Pre-deployment checks passed"
}

# Create backup
create_backup() {
    log "Creating backup..."
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_name="docket_tracking_${timestamp}"
    
    mkdir -p "$BACKUP_DIR"
    
    # Database backup
    log "Backing up database..."
    PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" \
        --no-owner --no-privileges --clean --if-exists \
        > "$BACKUP_DIR/${backup_name}_database.sql"
    
    # Application backup
    if [ -d "$DEPLOY_DIR/current" ]; then
        log "Backing up application files..."
        tar -czf "$BACKUP_DIR/${backup_name}_application.tar.gz" \
            -C "$DEPLOY_DIR" current
    fi
    
    # Configuration backup
    if [ -d "$DEPLOY_DIR/config" ]; then
        log "Backing up configuration..."
        tar -czf "$BACKUP_DIR/${backup_name}_config.tar.gz" \
            -C "$DEPLOY_DIR" config
    fi
    
    # Clean old backups
    find "$BACKUP_DIR" -name "docket_tracking_*" -mtime +$BACKUP_RETENTION_DAYS -delete
    
    success "Backup created: $backup_name"
    echo "$backup_name" > "$BACKUP_DIR/latest_backup"
}

# Download and prepare application
prepare_application() {
    log "Preparing application..."
    
    local release_dir="$DEPLOY_DIR/releases/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$release_dir"
    
    # Clone repository
    log "Cloning repository..."
    git clone --branch "$BRANCH" --depth 1 \
        "$REPOSITORY_URL" "$release_dir"
    
    cd "$release_dir"
    
    # Install dependencies
    log "Installing dependencies..."
    npm ci --production --legacy-peer-deps
    
    # Build application
    log "Building application..."
    npm run build
    
    # Copy configuration
    log "Setting up configuration..."
    mkdir -p "$release_dir/config"
    cp "$SCRIPT_DIR/config/${DEPLOYMENT_ENV}.env" "$release_dir/.env"
    
    # Set permissions
    chmod 644 "$release_dir/.env"
    chown -R "$APP_USER:$APP_GROUP" "$release_dir"
    
    success "Application prepared in $release_dir"
    echo "$release_dir" > "$DEPLOY_DIR/latest_release"
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    
    local release_dir=$(cat "$DEPLOY_DIR/latest_release")
    cd "$release_dir"
    
    # Run migrations with timeout
    timeout 300 npm run migrate || {
        error "Database migration failed or timed out"
        return 1
    }
    
    # Run performance optimizations
    log "Applying performance optimizations..."
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" \
        -f "$release_dir/src/database/migrations/999_optimize_performance.sql"
    
    success "Database migrations completed"
}

# Deploy application
deploy_application() {
    log "Deploying application..."
    
    local release_dir=$(cat "$DEPLOY_DIR/latest_release")
    
    # Stop existing services
    log "Stopping existing services..."
    sudo systemctl stop docket-tracking-api || true
    sudo systemctl stop docket-tracking-frontend || true
    sudo systemctl stop docket-tracking-worker || true
    
    # Update symlink to new release
    log "Updating application symlink..."
    rm -f "$DEPLOY_DIR/current"
    ln -s "$release_dir" "$DEPLOY_DIR/current"
    
    # Update systemd service files
    log "Updating systemd services..."
    sudo cp "$SCRIPT_DIR/systemd/docket-tracking-api.service" "/etc/systemd/system/"
    sudo cp "$SCRIPT_DIR/systemd/docket-tracking-frontend.service" "/etc/systemd/system/"
    sudo cp "$SCRIPT_DIR/systemd/docket-tracking-worker.service" "/etc/systemd/system/"
    
    sudo systemctl daemon-reload
    
    # Start services
    log "Starting services..."
    sudo systemctl start docket-tracking-api
    sudo systemctl start docket-tracking-frontend
    sudo systemctl start docket-tracking-worker
    
    # Enable services for auto-start
    sudo systemctl enable docket-tracking-api
    sudo systemctl enable docket-tracking-frontend
    sudo systemctl enable docket-tracking-worker
    
    success "Application deployed"
}

# Health checks
health_checks() {
    log "Running health checks..."
    
    local max_attempts=30
    local attempt=1
    
    # Check API health
    log "Checking API health..."
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "http://localhost:$API_PORT/health" > /dev/null; then
            success "API health check passed"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            error "API health check failed after $max_attempts attempts"
            return 1
        fi
        
        log "API health check attempt $attempt/$max_attempts failed, retrying..."
        sleep 10
        ((attempt++))
    done
    
    # Check frontend
    log "Checking frontend health..."
    attempt=1
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "http://localhost:$FRONTEND_PORT" > /dev/null; then
            success "Frontend health check passed"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            error "Frontend health check failed after $max_attempts attempts"
            return 1
        fi
        
        log "Frontend health check attempt $attempt/$max_attempts failed, retrying..."
        sleep 10
        ((attempt++))
    done
    
    # Check database connectivity
    log "Checking database connectivity..."
    if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
        error "Database connectivity check failed"
        return 1
    fi
    
    success "Database connectivity check passed"
    
    # Run integration tests
    log "Running integration tests..."
    cd "$DEPLOY_DIR/current"
    if npm run test:integration; then
        success "Integration tests passed"
    else
        warning "Integration tests failed"
        return 1
    fi
    
    success "All health checks passed"
}

# Rollback function
rollback() {
    log "Rolling back deployment..."
    
    local backup_name="$1"
    if [ -z "$backup_name" ]; then
        if [ -f "$BACKUP_DIR/latest_backup" ]; then
            backup_name=$(cat "$BACKUP_DIR/latest_backup")
        else
            error "No backup specified and no latest backup found"
            exit 1
        fi
    fi
    
    log "Rolling back to backup: $backup_name"
    
    # Stop services
    sudo systemctl stop docket-tracking-api || true
    sudo systemctl stop docket-tracking-frontend || true
    sudo systemctl stop docket-tracking-worker || true
    
    # Restore database
    if [ -f "$BACKUP_DIR/${backup_name}_database.sql" ]; then
        log "Restoring database..."
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" \
            < "$BACKUP_DIR/${backup_name}_database.sql"
    fi
    
    # Restore application
    if [ -f "$BACKUP_DIR/${backup_name}_application.tar.gz" ]; then
        log "Restoring application..."
        rm -rf "$DEPLOY_DIR/current"
        tar -xzf "$BACKUP_DIR/${backup_name}_application.tar.gz" \
            -C "$DEPLOY_DIR"
    fi
    
    # Start services
    sudo systemctl start docket-tracking-api
    sudo systemctl start docket-tracking-frontend
    sudo systemctl start docket-tracking-worker
    
    success "Rollback completed"
}

# Cleanup old releases
cleanup_releases() {
    log "Cleaning up old releases..."
    
    local releases_dir="$DEPLOY_DIR/releases"
    if [ -d "$releases_dir" ]; then
        # Keep only the latest N releases
        find "$releases_dir" -maxdepth 1 -type d -name "20*" | \
            sort -r | tail -n +$((MAX_ROLLBACK_VERSIONS + 1)) | \
            xargs rm -rf
    fi
    
    success "Cleanup completed"
}

# Main deployment function
main() {
    log "Starting deployment to $DEPLOYMENT_ENV environment"
    
    # Create necessary directories
    mkdir -p "$DEPLOY_DIR/releases" "$BACKUP_DIR" "$LOG_DIR"
    
    # Check if this is a rollback
    if [ "$1" = "rollback" ]; then
        rollback "$2"
        exit 0
    fi
    
    # Main deployment flow
    pre_deployment_checks
    create_backup
    
    if ! prepare_application; then
        error "Application preparation failed"
        exit 1
    fi
    
    if ! run_migrations; then
        error "Database migration failed"
        log "Attempting rollback..."
        rollback
        exit 1
    fi
    
    if ! deploy_application; then
        error "Application deployment failed"
        log "Attempting rollback..."
        rollback
        exit 1
    fi
    
    if ! health_checks; then
        error "Health checks failed"
        log "Attempting rollback..."
        rollback
        exit 1
    fi
    
    cleanup_releases
    
    success "Deployment completed successfully!"
    
    # Send notification (if configured)
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"✅ RFID Docket Tracking System deployed successfully to $DEPLOYMENT_ENV\"}" \
            "$SLACK_WEBHOOK_URL"
    fi
}

# Script usage
usage() {
    echo "Usage: $0 [environment] [branch] [rollback backup_name]"
    echo "  environment: production, staging, development (default: production)"
    echo "  branch: git branch to deploy (default: main)"
    echo "  rollback: rollback to specified backup"
    echo ""
    echo "Examples:"
    echo "  $0                          # Deploy main to production"
    echo "  $0 staging develop          # Deploy develop branch to staging"
    echo "  $0 rollback backup_name     # Rollback to specific backup"
    exit 1
}

# Signal handlers for graceful shutdown
trap 'error "Deployment interrupted"; exit 130' INT TERM

# Parse arguments
case "${1:-}" in
    -h|--help)
        usage
        ;;
    rollback)
        main "$@"
        ;;
    ""|production|staging|development)
        main "$@"
        ;;
    *)
        error "Invalid environment: $1"
        usage
        ;;
esac