#!/bin/bash

###############################################################################
# SSL/TLS Certificate Renewal Script
# Automatically renews Let's Encrypt certificates and restarts services
###############################################################################

set -e

# Configuration
CERT_DIR="${CERT_DIR:-/etc/ssl/cmdb}"
DOMAIN="${DOMAIN:-localhost}"
SERVICE_NAME="${SERVICE_NAME:-cmdb-api}"
RELOAD_COMMAND="${RELOAD_COMMAND:-systemctl reload $SERVICE_NAME}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Check certificate expiration
check_expiration() {
    if [ ! -f "$CERT_DIR/cert.pem" ]; then
        log_error "Certificate not found: $CERT_DIR/cert.pem"
        return 1
    fi

    # Get expiration date
    EXPIRE_DATE=$(openssl x509 -in "$CERT_DIR/cert.pem" -noout -enddate | cut -d= -f2)
    EXPIRE_TIMESTAMP=$(date -d "$EXPIRE_DATE" +%s)
    CURRENT_TIMESTAMP=$(date +%s)

    # Calculate days until expiration
    DAYS_UNTIL_EXPIRE=$(( ($EXPIRE_TIMESTAMP - $CURRENT_TIMESTAMP) / 86400 ))

    log_info "Certificate expires in $DAYS_UNTIL_EXPIRE days"

    # Renew if less than 30 days until expiration
    if [ $DAYS_UNTIL_EXPIRE -lt 30 ]; then
        log_warn "Certificate expiring soon, renewal required"
        return 0
    else
        log_info "Certificate does not need renewal yet"
        return 1
    fi
}

# Renew Let's Encrypt certificate
renew_letsencrypt() {
    log_info "Renewing Let's Encrypt certificate..."

    # Run certbot renewal
    if certbot renew --non-interactive --quiet; then
        log_info "Certificate renewed successfully"

        # Copy renewed certificates
        cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$CERT_DIR/cert.pem"
        cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$CERT_DIR/key.pem"
        cp "/etc/letsencrypt/live/$DOMAIN/chain.pem" "$CERT_DIR/ca.pem"

        # Set permissions
        chmod 644 "$CERT_DIR/cert.pem"
        chmod 600 "$CERT_DIR/key.pem"
        chmod 644 "$CERT_DIR/ca.pem"

        return 0
    else
        log_error "Certificate renewal failed"
        return 1
    fi
}

# Reload service to pick up new certificate
reload_service() {
    log_info "Reloading service to pick up new certificate..."

    if eval "$RELOAD_COMMAND"; then
        log_info "Service reloaded successfully"
    else
        log_error "Failed to reload service"
        return 1
    fi
}

# Send notification (optional - requires mail command)
send_notification() {
    local subject="$1"
    local message="$2"

    if command -v mail &> /dev/null; then
        echo "$message" | mail -s "$subject" admin@example.com
    fi
}

# Main
main() {
    log_info "SSL/TLS Certificate Renewal Check"

    # Check if certificate needs renewal
    if check_expiration; then
        # Attempt renewal
        if renew_letsencrypt; then
            # Reload service
            if reload_service; then
                send_notification \
                    "SSL Certificate Renewed - $DOMAIN" \
                    "The SSL certificate for $DOMAIN has been successfully renewed."
                log_info "Certificate renewal complete"
            else
                send_notification \
                    "SSL Certificate Renewal - Service Reload Failed" \
                    "The SSL certificate for $DOMAIN was renewed but the service failed to reload."
                log_error "Service reload failed after renewal"
                exit 1
            fi
        else
            send_notification \
                "SSL Certificate Renewal Failed - $DOMAIN" \
                "Failed to renew SSL certificate for $DOMAIN. Manual intervention required."
            log_error "Certificate renewal failed"
            exit 1
        fi
    else
        log_info "No renewal needed"
    fi
}

# Run main function
main
