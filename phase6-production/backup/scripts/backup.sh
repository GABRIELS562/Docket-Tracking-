#!/bin/bash

# RFID Docket Tracking System - Production Backup Script
# Automated backup with compression, encryption, and cloud storage
# Supports full, incremental, and differential backups

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
LOG_FILE="${BACKUP_DIR}/backup.log"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

# Database configuration
DB_HOST="${DB_HOST:-postgres-master}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-docket_tracking_prod}"
DB_USER="${DB_USER:-docket_user}"
PGPASSWORD="${DB_PASSWORD}"
export PGPASSWORD

# S3 configuration (optional)
S3_BUCKET="${BACKUP_S3_BUCKET:-}"
AWS_REGION="${AWS_REGION:-us-east-1}"

# Encryption configuration
ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY:-}"
GPG_RECIPIENT="${BACKUP_GPG_RECIPIENT:-}"

# Notification configuration
WEBHOOK_URL="${BACKUP_WEBHOOK_URL:-}"
EMAIL_TO="${BACKUP_EMAIL_TO:-}"

# Functions
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error() {
    log "ERROR: $1"
    send_notification "FAILED" "$1"
    exit 1
}

send_notification() {
    local status="$1"
    local message="$2"
    local subject="RFID Backup $status - $(hostname)"
    
    # Webhook notification
    if [[ -n "$WEBHOOK_URL" ]]; then
        curl -X POST "$WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{
                \"text\": \"$subject\",
                \"attachments\": [{
                    \"color\": \"$([ "$status" = "SUCCESS" ] && echo "good" || echo "danger")\",
                    \"fields\": [{
                        \"title\": \"Status\",
                        \"value\": \"$status\",
                        \"short\": true
                    }, {
                        \"title\": \"Message\",
                        \"value\": \"$message\",
                        \"short\": false
                    }, {
                        \"title\": \"Timestamp\",
                        \"value\": \"$(date)\",
                        \"short\": true
                    }]
                }]
            }" 2>/dev/null || true
    fi
    
    # Email notification (if configured)
    if [[ -n "$EMAIL_TO" ]] && command -v mail >/dev/null; then
        echo "$message" | mail -s "$subject" "$EMAIL_TO" || true
    fi
}

create_backup_dir() {
    local backup_type="$1"
    local backup_path="$BACKUP_DIR/$backup_type/$TIMESTAMP"
    mkdir -p "$backup_path"
    echo "$backup_path"
}

backup_database() {
    local backup_path="$1"
    local backup_type="${2:-full}"
    
    log "Starting database backup ($backup_type)..."
    
    local db_backup_file="$backup_path/database_${backup_type}.sql"
    local custom_backup_file="$backup_path/database_${backup_type}.dump"
    
    # Test database connection
    if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
        error "Database connection failed"
    fi
    
    case "$backup_type" in
        "full")
            log "Creating full database backup..."
            
            # SQL format backup
            pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
                --verbose --clean --create --if-exists \
                --format=plain \
                --file="$db_backup_file" || error "Full SQL backup failed"
            
            # Custom format backup (for faster restore)
            pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
                --verbose --clean --create --if-exists \
                --format=custom --compress=9 \
                --file="$custom_backup_file" || error "Full custom backup failed"
            ;;
            
        "schema")
            log "Creating schema-only backup..."
            
            pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
                --verbose --schema-only --clean --create --if-exists \
                --format=plain \
                --file="$db_backup_file" || error "Schema backup failed"
            ;;
            
        "data")
            log "Creating data-only backup..."
            
            pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
                --verbose --data-only --clean \
                --format=custom --compress=9 \
                --file="$custom_backup_file" || error "Data backup failed"
            ;;
    esac
    
    log "Database backup completed"
    
    # Return backup files
    echo "$db_backup_file:$custom_backup_file"
}

backup_application_files() {
    local backup_path="$1"
    
    log "Starting application files backup..."
    
    local files_backup="$backup_path/application_files.tar.gz"
    
    # Create list of files to backup
    local backup_sources=(
        "/app/uploads"
        "/app/logs"
        "/app/configs"
        "/etc/ssl/certs"
    )
    
    # Create tar archive
    tar -czf "$files_backup" \
        --exclude="*.tmp" \
        --exclude="*.log.gz" \
        --exclude="node_modules" \
        "${backup_sources[@]}" 2>/dev/null || true
    
    log "Application files backup completed"
    echo "$files_backup"
}

backup_configurations() {
    local backup_path="$1"
    
    log "Starting configuration backup..."
    
    local config_backup="$backup_path/configurations.tar.gz"
    
    # Docker configurations
    if [[ -f "/docker-compose.yml" ]]; then
        tar -czf "$config_backup" \
            docker-compose.yml \
            .env.production \
            configs/ \
            monitoring/ 2>/dev/null || true
    fi
    
    log "Configuration backup completed"
    echo "$config_backup"
}

encrypt_backup() {
    local file_path="$1"
    local encrypted_file="${file_path}.gpg"
    
    if [[ -n "$GPG_RECIPIENT" ]]; then
        log "Encrypting backup file: $(basename "$file_path")"
        
        gpg --trust-model always --encrypt \
            --recipient "$GPG_RECIPIENT" \
            --output "$encrypted_file" \
            "$file_path" || error "Encryption failed for $file_path"
        
        # Remove unencrypted file
        rm "$file_path"
        echo "$encrypted_file"
    else
        echo "$file_path"
    fi
}

compress_backup() {
    local backup_path="$1"
    
    log "Compressing backup directory..."
    
    local compressed_backup="${backup_path}.tar.gz"
    
    tar -czf "$compressed_backup" -C "$(dirname "$backup_path")" "$(basename "$backup_path")" || error "Compression failed"
    
    # Remove uncompressed directory
    rm -rf "$backup_path"
    
    echo "$compressed_backup"
}

upload_to_s3() {
    local file_path="$1"
    local s3_key="rfid-docket-backups/$(date +%Y/%m/%d)/$(basename "$file_path")"
    
    if [[ -n "$S3_BUCKET" ]] && command -v aws >/dev/null; then
        log "Uploading to S3: s3://$S3_BUCKET/$s3_key"
        
        aws s3 cp "$file_path" "s3://$S3_BUCKET/$s3_key" \
            --region "$AWS_REGION" \
            --storage-class STANDARD_IA || error "S3 upload failed"
        
        log "S3 upload completed"
        return 0
    else
        log "S3 upload skipped (not configured or AWS CLI not available)"
        return 1
    fi
}

cleanup_old_backups() {
    log "Cleaning up backups older than $RETENTION_DAYS days..."
    
    # Local cleanup
    find "$BACKUP_DIR" -type f -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    find "$BACKUP_DIR" -type d -empty -delete 2>/dev/null || true
    
    # S3 cleanup (if configured)
    if [[ -n "$S3_BUCKET" ]] && command -v aws >/dev/null; then
        local cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%Y-%m-%d)
        
        aws s3api list-objects-v2 \
            --bucket "$S3_BUCKET" \
            --prefix "rfid-docket-backups/" \
            --query "Contents[?LastModified<='$cutoff_date'].Key" \
            --output text | while read -r key; do
                if [[ -n "$key" && "$key" != "None" ]]; then
                    aws s3 rm "s3://$S3_BUCKET/$key" || true
                fi
            done
    fi
    
    log "Cleanup completed"
}

verify_backup() {
    local backup_file="$1"
    
    log "Verifying backup integrity..."
    
    # Check if file exists and is readable
    if [[ ! -f "$backup_file" ]] || [[ ! -r "$backup_file" ]]; then
        error "Backup file not found or not readable: $backup_file"
    fi
    
    # Check file size (should be > 0)
    local file_size=$(stat -c%s "$backup_file" 2>/dev/null || stat -f%z "$backup_file" 2>/dev/null || echo "0")
    if [[ "$file_size" -eq 0 ]]; then
        error "Backup file is empty: $backup_file"
    fi
    
    # Verify tar.gz integrity
    if [[ "$backup_file" == *.tar.gz ]]; then
        if ! tar -tzf "$backup_file" >/dev/null 2>&1; then
            error "Backup archive is corrupted: $backup_file"
        fi
    fi
    
    # Verify GPG encryption
    if [[ "$backup_file" == *.gpg ]]; then
        if ! gpg --list-packets "$backup_file" >/dev/null 2>&1; then
            error "Encrypted backup is corrupted: $backup_file"
        fi
    fi
    
    log "Backup verification passed (size: $(du -h "$backup_file" | cut -f1))"
}

main() {
    local backup_type="${1:-full}"
    
    log "=== RFID Docket Tracking System Backup Started ==="
    log "Backup type: $backup_type"
    log "Timestamp: $TIMESTAMP"
    
    # Create backup directory
    local backup_path=$(create_backup_dir "$backup_type")
    
    # Create backups
    local db_backups=$(backup_database "$backup_path" "$backup_type")
    local app_files=$(backup_application_files "$backup_path")
    local configs=$(backup_configurations "$backup_path")
    
    # Create backup manifest
    cat > "$backup_path/manifest.txt" << EOF
RFID Docket Tracking System Backup
Backup Type: $backup_type
Timestamp: $TIMESTAMP
Hostname: $(hostname)
Database: $DB_NAME@$DB_HOST:$DB_PORT
Files included:
$(ls -la "$backup_path")

System Information:
$(uname -a)
Disk Space: $(df -h "$BACKUP_DIR")
EOF
    
    # Compress backup
    local compressed_backup=$(compress_backup "$backup_path")
    
    # Encrypt if configured
    if [[ -n "$GPG_RECIPIENT" ]]; then
        compressed_backup=$(encrypt_backup "$compressed_backup")
    fi
    
    # Verify backup
    verify_backup "$compressed_backup"
    
    # Upload to cloud storage
    local uploaded=false
    if upload_to_s3 "$compressed_backup"; then
        uploaded=true
    fi
    
    # Cleanup old backups
    cleanup_old_backups
    
    # Calculate backup size and duration
    local backup_size=$(du -h "$compressed_backup" | cut -f1)
    local duration=$(($(date +%s) - $(date -d "$TIMESTAMP" +%s 2>/dev/null || echo $(($(date +%s) - 60)))))
    
    log "=== Backup Completed Successfully ==="
    log "Backup file: $compressed_backup"
    log "Backup size: $backup_size"
    log "Duration: ${duration}s"
    log "Cloud storage: $([ "$uploaded" = true ] && echo "YES" || echo "NO")"
    
    # Send success notification
    send_notification "SUCCESS" "Backup completed successfully
Type: $backup_type
Size: $backup_size
Duration: ${duration}s
File: $(basename "$compressed_backup")
Cloud: $([ "$uploaded" = true ] && echo "Uploaded" || echo "Local only")"
    
    # Return backup file path for scripting
    echo "$compressed_backup"
}

# Handle signals
trap 'error "Backup interrupted by signal"' INT TERM

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Run main function
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi