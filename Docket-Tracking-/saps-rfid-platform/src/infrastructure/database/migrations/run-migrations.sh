#!/bin/bash

# ============================================================================
# SAPS RFID Platform - Database Migration Script
# ============================================================================
# This script runs all database migrations in the correct order
# It supports PostgreSQL with TimescaleDB extension
# ============================================================================

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
DB_HOST="${PGHOST:-localhost}"
DB_PORT="${PGPORT:-5432}"
DB_NAME="${PGDATABASE:-saps_rfid}"
DB_USER="${PGUSER:-postgres}"
DB_PASSWORD="${PGPASSWORD:-}"
SEED_DATA=false
VERBOSE=false
DRY_RUN=false

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# ============================================================================
# Functions
# ============================================================================

print_header() {
    echo -e "${BLUE}"
    echo "=========================================="
    echo "$1"
    echo "=========================================="
    echo -e "${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Show usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Run database migrations for SAPS RFID Platform

OPTIONS:
    -h, --help              Show this help message
    -H, --host HOST         Database host (default: localhost)
    -p, --port PORT         Database port (default: 5432)
    -d, --database NAME     Database name (default: saps_rfid)
    -U, --user USER         Database user (default: postgres)
    -W, --password PASS     Database password
    -s, --seed              Load seed data after migrations
    -v, --verbose           Show detailed output
    --dry-run               Show what would be done without executing
    --create-db             Create database if it doesn't exist

ENVIRONMENT VARIABLES:
    PGHOST                  Database host
    PGPORT                  Database port
    PGDATABASE              Database name
    PGUSER                  Database user
    PGPASSWORD              Database password

EXAMPLES:
    # Run migrations with default settings
    $0

    # Run migrations with custom database
    $0 --host db.example.com --database my_rfid_db --user admin

    # Run migrations and load seed data
    $0 --seed

    # Dry run to see what would happen
    $0 --dry-run --verbose

EOF
    exit 0
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"

    # Check if psql is installed
    if ! command -v psql &> /dev/null; then
        print_error "psql is not installed. Please install PostgreSQL client tools."
        exit 1
    fi
    print_success "psql is installed"

    # Check PostgreSQL version
    PG_VERSION=$(psql --version | grep -oP '\d+' | head -1)
    if [ "$PG_VERSION" -lt 14 ]; then
        print_warning "PostgreSQL version $PG_VERSION detected. Version 14+ is recommended."
    else
        print_success "PostgreSQL version $PG_VERSION"
    fi
}

# Test database connection
test_connection() {
    print_header "Testing Database Connection"

    export PGPASSWORD="$DB_PASSWORD"

    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c '\q' 2>/dev/null; then
        print_success "Connected to PostgreSQL server"
    else
        print_error "Failed to connect to PostgreSQL server"
        print_info "Host: $DB_HOST:$DB_PORT, User: $DB_USER"
        exit 1
    fi
}

# Create database if it doesn't exist
create_database() {
    print_header "Creating Database"

    export PGPASSWORD="$DB_PASSWORD"

    # Check if database exists
    DB_EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'")

    if [ "$DB_EXISTS" = "1" ]; then
        print_info "Database '$DB_NAME' already exists"
    else
        if [ "$DRY_RUN" = true ]; then
            print_info "[DRY RUN] Would create database '$DB_NAME'"
        else
            psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;"
            print_success "Database '$DB_NAME' created"
        fi
    fi
}

# Check if TimescaleDB is available
check_timescaledb() {
    print_header "Checking TimescaleDB Extension"

    export PGPASSWORD="$DB_PASSWORD"

    # Check if TimescaleDB extension is available
    TIMESCALE_AVAILABLE=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT 1 FROM pg_available_extensions WHERE name='timescaledb'")

    if [ "$TIMESCALE_AVAILABLE" = "1" ]; then
        print_success "TimescaleDB extension is available"

        # Check if it's already enabled
        TIMESCALE_ENABLED=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT 1 FROM pg_extension WHERE extname='timescaledb'")
        if [ "$TIMESCALE_ENABLED" = "1" ]; then
            print_info "TimescaleDB extension is already enabled"
        fi
    else
        print_error "TimescaleDB extension is not available"
        print_info "Please install TimescaleDB: https://docs.timescale.com/install/latest/"
        exit 1
    fi
}

# Run a single migration file
run_migration() {
    local migration_file="$1"
    local migration_name=$(basename "$migration_file")

    if [ "$DRY_RUN" = true ]; then
        print_info "[DRY RUN] Would run: $migration_name"
        return 0
    fi

    print_info "Running: $migration_name"

    export PGPASSWORD="$DB_PASSWORD"

    if [ "$VERBOSE" = true ]; then
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$migration_file"
    else
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$migration_file" > /dev/null 2>&1
    fi

    if [ $? -eq 0 ]; then
        print_success "Completed: $migration_name"
    else
        print_error "Failed: $migration_name"
        exit 1
    fi
}

# Run all migrations
run_migrations() {
    print_header "Running Migrations"

    # Array of migration files in order
    migrations=(
        "001_create_zones.sql"
        "002_create_readers.sql"
        "003_create_dockets.sql"
        "004_create_location_history_hypertable.sql"
        "005_create_indexes.sql"
        "006_create_continuous_aggregates.sql"
    )

    for migration in "${migrations[@]}"; do
        migration_path="$SCRIPT_DIR/$migration"

        if [ ! -f "$migration_path" ]; then
            print_error "Migration file not found: $migration"
            exit 1
        fi

        run_migration "$migration_path"
    done

    print_success "All migrations completed successfully"
}

# Load seed data
load_seed_data() {
    print_header "Loading Seed Data"

    seed_file="$SCRIPT_DIR/seed-dev-data.sql"

    if [ ! -f "$seed_file" ]; then
        print_error "Seed data file not found: $seed_file"
        exit 1
    fi

    print_warning "This will TRUNCATE all tables and insert test data!"
    if [ "$DRY_RUN" = false ]; then
        read -p "Are you sure? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            print_info "Seed data loading cancelled"
            return 0
        fi
    fi

    run_migration "$seed_file"
    print_success "Seed data loaded successfully"
}

# Verify migrations
verify_migrations() {
    print_header "Verifying Migrations"

    export PGPASSWORD="$DB_PASSWORD"

    # Check tables
    TABLES=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'")
    print_info "Tables created: $TABLES"

    # Check hypertables
    HYPERTABLES=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT count(*) FROM timescaledb_information.hypertables" 2>/dev/null || echo "0")
    print_info "Hypertables created: $HYPERTABLES"

    # Check continuous aggregates
    CAGGS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT count(*) FROM timescaledb_information.continuous_aggregates" 2>/dev/null || echo "0")
    print_info "Continuous aggregates: $CAGGS"

    # Expected counts
    if [ "$TABLES" -ge 4 ] && [ "$HYPERTABLES" -ge 1 ] && [ "$CAGGS" -ge 4 ]; then
        print_success "Migration verification passed"
    else
        print_warning "Migration verification incomplete - please check manually"
    fi
}

# Print summary
print_summary() {
    print_header "Migration Summary"

    echo "Database: $DB_NAME"
    echo "Host: $DB_HOST:$DB_PORT"
    echo "User: $DB_USER"
    echo ""

    export PGPASSWORD="$DB_PASSWORD"

    # Database size
    DB_SIZE=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT pg_size_pretty(pg_database_size('$DB_NAME'))")
    echo "Database size: $DB_SIZE"

    # Record counts
    if [ "$SEED_DATA" = true ]; then
        ZONES=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT count(*) FROM zones" 2>/dev/null || echo "N/A")
        READERS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT count(*) FROM readers" 2>/dev/null || echo "N/A")
        DOCKETS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT count(*) FROM dockets" 2>/dev/null || echo "N/A")
        HISTORY=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT count(*) FROM docket_location_history" 2>/dev/null || echo "N/A")

        echo ""
        echo "Records:"
        echo "  Zones: $ZONES"
        echo "  Readers: $READERS"
        echo "  Dockets: $DOCKETS"
        echo "  Location History: $HISTORY"
    fi

    echo ""
    print_success "Migration completed successfully!"
}

# ============================================================================
# Main Script
# ============================================================================

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            usage
            ;;
        -H|--host)
            DB_HOST="$2"
            shift 2
            ;;
        -p|--port)
            DB_PORT="$2"
            shift 2
            ;;
        -d|--database)
            DB_NAME="$2"
            shift 2
            ;;
        -U|--user)
            DB_USER="$2"
            shift 2
            ;;
        -W|--password)
            DB_PASSWORD="$2"
            shift 2
            ;;
        -s|--seed)
            SEED_DATA=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --create-db)
            CREATE_DB=true
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            usage
            ;;
    esac
done

# Main execution
main() {
    print_header "SAPS RFID Platform - Database Migration"

    if [ "$DRY_RUN" = true ]; then
        print_warning "DRY RUN MODE - No changes will be made"
    fi

    check_prerequisites
    test_connection

    if [ "$CREATE_DB" = true ]; then
        create_database
    fi

    check_timescaledb
    run_migrations

    if [ "$SEED_DATA" = true ]; then
        load_seed_data
    fi

    verify_migrations
    print_summary
}

# Run main function
main

exit 0
