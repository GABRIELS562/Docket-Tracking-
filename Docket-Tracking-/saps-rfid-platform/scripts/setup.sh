#!/bin/bash

# ==============================================================================
# SAPS RFID Platform - Development Setup Script
# ==============================================================================

set -e

echo "🚀 Setting up SAPS RFID Platform development environment..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ==============================================================================
# Check Prerequisites
# ==============================================================================
echo -e "\n${BLUE}1. Checking prerequisites...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}⚠️  Node.js is not installed. Please install Node.js 18+ first.${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${YELLOW}⚠️  Node.js version must be 18 or higher. Current: $(node -v)${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# Check npm/pnpm
if command -v pnpm &> /dev/null; then
    PKG_MANAGER="pnpm"
    echo -e "${GREEN}✓ pnpm $(pnpm -v)${NC}"
elif command -v npm &> /dev/null; then
    PKG_MANAGER="npm"
    echo -e "${GREEN}✓ npm $(npm -v)${NC}"
else
    echo -e "${YELLOW}⚠️  No package manager found${NC}"
    exit 1
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}⚠️  Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker $(docker -v | cut -d' ' -f3 | cut -d',' -f1)${NC}"

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}⚠️  Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker Compose $(docker-compose -v | cut -d' ' -f4 | cut -d',' -f1)${NC}"

# ==============================================================================
# Install Dependencies
# ==============================================================================
echo -e "\n${BLUE}2. Installing dependencies...${NC}"
$PKG_MANAGER install
echo -e "${GREEN}✓ Dependencies installed${NC}"

# ==============================================================================
# Setup Environment
# ==============================================================================
echo -e "\n${BLUE}3. Setting up environment...${NC}"

if [ ! -f .env ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo -e "${GREEN}✓ .env file created${NC}"
    echo -e "${YELLOW}⚠️  Please update .env with your configuration${NC}"
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi

# ==============================================================================
# Start Infrastructure
# ==============================================================================
echo -e "\n${BLUE}4. Starting infrastructure (TimescaleDB, Redis)...${NC}"
docker-compose up -d timescaledb redis

echo "Waiting for database to be ready..."
sleep 5

# Wait for database
until docker-compose exec -T timescaledb pg_isready -U postgres > /dev/null 2>&1; do
    echo "Waiting for database..."
    sleep 2
done
echo -e "${GREEN}✓ Database is ready${NC}"

# ==============================================================================
# Run Migrations
# ==============================================================================
echo -e "\n${BLUE}5. Running database migrations...${NC}"
$PKG_MANAGER run db:migrate
echo -e "${GREEN}✓ Migrations completed${NC}"

# ==============================================================================
# Seed Database (Optional)
# ==============================================================================
read -p "Do you want to seed the database with test data? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "\n${BLUE}6. Seeding database...${NC}"
    $PKG_MANAGER run db:seed
    echo -e "${GREEN}✓ Database seeded${NC}"
fi

# ==============================================================================
# Build TypeScript
# ==============================================================================
echo -e "\n${BLUE}7. Building TypeScript...${NC}"
$PKG_MANAGER run build
echo -e "${GREEN}✓ Build completed${NC}"

# ==============================================================================
# Setup Complete
# ==============================================================================
echo -e "\n${GREEN}✅ Setup complete!${NC}\n"
echo -e "Next steps:"
echo -e "  1. Update .env with your configuration"
echo -e "  2. Run ${BLUE}$PKG_MANAGER run dev${NC} to start development server"
echo -e "  3. Run ${BLUE}$PKG_MANAGER run test${NC} to run tests"
echo -e "  4. Visit ${BLUE}http://localhost:3000/health${NC} to check status\n"

echo -e "Available commands:"
echo -e "  ${BLUE}$PKG_MANAGER run dev${NC}          - Start development server"
echo -e "  ${BLUE}$PKG_MANAGER run build${NC}        - Build for production"
echo -e "  ${BLUE}$PKG_MANAGER run start${NC}        - Start production server"
echo -e "  ${BLUE}$PKG_MANAGER run test${NC}         - Run all tests"
echo -e "  ${BLUE}$PKG_MANAGER run lint${NC}         - Lint code"
echo -e "  ${BLUE}docker-compose up -d${NC}    - Start all services"
echo -e "  ${BLUE}docker-compose logs -f${NC}  - View logs\n"
