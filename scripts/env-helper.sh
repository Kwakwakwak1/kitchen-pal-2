#!/bin/bash

# Environment Configuration Helper
# Helps switch between development and production settings

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_help() {
    echo "Kitchen Pal Environment Helper"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  dev        - Configure for development"
    echo "  prod       - Configure for production"
    echo "  check      - Check current configuration"
    echo "  backup     - Backup current .env file"
    echo "  restore    - Restore .env from backup"
    echo "  help       - Show this help"
    echo ""
}

backup_env() {
    if [ -f .env ]; then
        cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
        echo -e "${GREEN}✓${NC} .env file backed up"
    else
        echo -e "${YELLOW}⚠${NC} No .env file found to backup"
    fi
}

configure_dev() {
    echo -e "${BLUE}🔧 Configuring for development...${NC}"
    
    # Backup current .env
    backup_env
    
    # Update key development settings in .env
    if [ -f .env ]; then
        # Create a temp file with updated values
        sed -i.tmp \
            -e 's/^NODE_ENV=.*/NODE_ENV=development/' \
            -e 's/^VITE_API_URL=.*/VITE_API_URL=/' \
            -e 's/^FRONTEND_URL=.*/FRONTEND_URL=http:\/\/localhost:5173/' \
            -e 's/^REQUIRE_EMAIL_VERIFICATION=.*/REQUIRE_EMAIL_VERIFICATION=false/' \
            -e 's/^DATABASE_URL=.*postgres.*:5432.*/DATABASE_URL=postgresql:\/\/kitchen_pal_user:kitchen_pal_password@localhost:5432\/kitchen_pal/' \
            .env
        
        # Remove the temp file
        rm -f .env.tmp
        
        echo -e "${GREEN}✓${NC} Environment configured for development"
        echo ""
        echo "Development settings applied:"
        echo "  • NODE_ENV = development"
        echo "  • VITE_API_URL = (empty - same origin)"
        echo "  • FRONTEND_URL = http://localhost:5173"
        echo "  • REQUIRE_EMAIL_VERIFICATION = false"
        echo "  • DATABASE_URL = localhost:5432"
        echo ""
    else
        echo -e "${RED}✗${NC} No .env file found. Please create one from environment.template"
        exit 1
    fi
}

configure_prod() {
    echo -e "${BLUE}🔧 Configuring for production...${NC}"
    
    # Backup current .env
    backup_env
    
    # Update key production settings in .env
    if [ -f .env ]; then
        # Create a temp file with updated values
        sed -i.tmp \
            -e 's/^NODE_ENV=.*/NODE_ENV=production/' \
            -e 's/^VITE_API_URL=.*/VITE_API_URL=/' \
            -e 's/^FRONTEND_URL=.*/FRONTEND_URL=https:\/\/kitchen-pal.kwakwakwak.com/' \
            -e 's/^REQUIRE_EMAIL_VERIFICATION=.*/REQUIRE_EMAIL_VERIFICATION=true/' \
            .env
        
        # Remove the temp file
        rm -f .env.tmp
        
        echo -e "${GREEN}✓${NC} Environment configured for production"
        echo ""
        echo "Production settings applied:"
        echo "  • NODE_ENV = production"
        echo "  • VITE_API_URL = (empty - same origin)"
        echo "  • FRONTEND_URL = https://kitchen-pal.kwakwakwak.com"
        echo "  • REQUIRE_EMAIL_VERIFICATION = true"
        echo ""
        echo -e "${YELLOW}⚠${NC} Remember to check other production settings like:"
        echo "  • JWT secrets should be secure"
        echo "  • Database URL should point to production"
        echo "  • Email credentials should be configured"
        echo ""
    else
        echo -e "${RED}✗${NC} No .env file found. Please create one from environment.template"
        exit 1
    fi
}

check_config() {
    echo -e "${BLUE}🔍 Current environment configuration:${NC}"
    echo ""
    
    if [ -f .env ]; then
        echo "Key settings from .env:"
        echo ""
        
        # Extract and display key values
        NODE_ENV=$(grep "^NODE_ENV=" .env | cut -d'=' -f2)
        FRONTEND_URL=$(grep "^FRONTEND_URL=" .env | cut -d'=' -f2)
        EMAIL_VERIFICATION=$(grep "^REQUIRE_EMAIL_VERIFICATION=" .env | cut -d'=' -f2)
        
        echo "  NODE_ENV: ${NODE_ENV:-'not set'}"
        echo "  FRONTEND_URL: ${FRONTEND_URL:-'not set'}"
        echo "  REQUIRE_EMAIL_VERIFICATION: ${EMAIL_VERIFICATION:-'not set'}"
        
        # Determine likely environment
        if [ "$NODE_ENV" = "development" ]; then
            echo ""
            echo -e "${GREEN}✓${NC} Configured for DEVELOPMENT"
        elif [ "$NODE_ENV" = "production" ]; then
            echo ""
            echo -e "${YELLOW}⚠${NC} Configured for PRODUCTION"
        else
            echo ""
            echo -e "${RED}?${NC} Environment unclear"
        fi
        
    else
        echo -e "${RED}✗${NC} No .env file found"
    fi
    echo ""
}

restore_env() {
    echo -e "${BLUE}🔄 Available .env backups:${NC}"
    echo ""
    
    ls -la .env.backup.* 2>/dev/null || {
        echo "No backup files found"
        return 1
    }
    
    echo ""
    read -p "Enter backup filename to restore (or 'cancel'): " backup_file
    
    if [ "$backup_file" = "cancel" ]; then
        echo "Restore cancelled"
        return 0
    fi
    
    if [ -f "$backup_file" ]; then
        cp "$backup_file" .env
        echo -e "${GREEN}✓${NC} Restored .env from $backup_file"
    else
        echo -e "${RED}✗${NC} Backup file not found: $backup_file"
        return 1
    fi
}

# Main script logic
case "${1:-help}" in
    "dev")
        configure_dev
        ;;
    "prod") 
        configure_prod
        ;;
    "check")
        check_config
        ;;
    "backup")
        backup_env
        ;;
    "restore")
        restore_env
        ;;
    "help"|*)
        print_help
        ;;
esac 