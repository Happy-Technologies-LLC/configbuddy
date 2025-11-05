#!/bin/bash

###############################################################################
# SSL/TLS Certificate Setup Script
# Supports Let's Encrypt (Certbot) and self-signed certificates
###############################################################################

set -e

# Configuration
DOMAIN="${DOMAIN:-localhost}"
EMAIL="${LETSENCRYPT_EMAIL:-admin@example.com}"
CERT_DIR="${CERT_DIR:-/etc/ssl/cmdb}"
USE_LETSENCRYPT="${USE_LETSENCRYPT:-false}"
CERT_VALIDITY_DAYS="${CERT_VALIDITY_DAYS:-365}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "This script must be run as root"
        exit 1
    fi
}

# Install certbot
install_certbot() {
    log_info "Installing Certbot..."

    if [ -f /etc/debian_version ]; then
        apt-get update
        apt-get install -y certbot python3-certbot-nginx
    elif [ -f /etc/redhat-release ]; then
        yum install -y certbot python3-certbot-nginx
    else
        log_error "Unsupported operating system"
        exit 1
    fi
}

# Setup Let's Encrypt certificate
setup_letsencrypt() {
    log_info "Setting up Let's Encrypt certificate for $DOMAIN..."

    # Check if certbot is installed
    if ! command -v certbot &> /dev/null; then
        install_certbot
    fi

    # Request certificate (standalone mode)
    certbot certonly \
        --standalone \
        --non-interactive \
        --agree-tos \
        --email "$EMAIL" \
        --domains "$DOMAIN" \
        --preferred-challenges http

    # Copy certificates to application directory
    mkdir -p "$CERT_DIR"
    cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$CERT_DIR/cert.pem"
    cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$CERT_DIR/key.pem"
    cp "/etc/letsencrypt/live/$DOMAIN/chain.pem" "$CERT_DIR/ca.pem"

    # Set permissions
    chmod 644 "$CERT_DIR/cert.pem"
    chmod 600 "$CERT_DIR/key.pem"
    chmod 644 "$CERT_DIR/ca.pem"

    log_info "Let's Encrypt certificate installed successfully"
    log_info "Certificate path: $CERT_DIR/cert.pem"
    log_info "Private key path: $CERT_DIR/key.pem"
}

# Setup self-signed certificate
setup_selfsigned() {
    log_info "Creating self-signed certificate for $DOMAIN..."

    mkdir -p "$CERT_DIR"

    # Generate private key
    openssl genrsa -out "$CERT_DIR/key.pem" 4096

    # Generate certificate signing request
    openssl req -new \
        -key "$CERT_DIR/key.pem" \
        -out "$CERT_DIR/csr.pem" \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=$DOMAIN"

    # Generate self-signed certificate
    openssl x509 -req \
        -days "$CERT_VALIDITY_DAYS" \
        -in "$CERT_DIR/csr.pem" \
        -signkey "$CERT_DIR/key.pem" \
        -out "$CERT_DIR/cert.pem" \
        -extfile <(printf "subjectAltName=DNS:$DOMAIN,DNS:*.$DOMAIN")

    # Set permissions
    chmod 644 "$CERT_DIR/cert.pem"
    chmod 600 "$CERT_DIR/key.pem"

    # Remove CSR
    rm -f "$CERT_DIR/csr.pem"

    log_warn "Self-signed certificate created (NOT FOR PRODUCTION USE)"
    log_info "Certificate path: $CERT_DIR/cert.pem"
    log_info "Private key path: $CERT_DIR/key.pem"
}

# Setup certificate renewal cron job
setup_renewal() {
    log_info "Setting up automatic certificate renewal..."

    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    RENEWAL_SCRIPT="$SCRIPT_DIR/renew-ssl.sh"

    # Create cron job (runs daily at 2:00 AM)
    CRON_JOB="0 2 * * * $RENEWAL_SCRIPT >> /var/log/cmdb-ssl-renewal.log 2>&1"

    # Add to crontab if not already present
    (crontab -l 2>/dev/null | grep -v "$RENEWAL_SCRIPT"; echo "$CRON_JOB") | crontab -

    log_info "Automatic renewal configured (daily at 2:00 AM)"
}

# Verify certificate
verify_certificate() {
    log_info "Verifying certificate..."

    if [ ! -f "$CERT_DIR/cert.pem" ]; then
        log_error "Certificate not found: $CERT_DIR/cert.pem"
        exit 1
    fi

    if [ ! -f "$CERT_DIR/key.pem" ]; then
        log_error "Private key not found: $CERT_DIR/key.pem"
        exit 1
    fi

    # Check certificate validity
    openssl x509 -in "$CERT_DIR/cert.pem" -noout -text

    # Verify key matches certificate
    CERT_MODULUS=$(openssl x509 -noout -modulus -in "$CERT_DIR/cert.pem" | openssl md5)
    KEY_MODULUS=$(openssl rsa -noout -modulus -in "$CERT_DIR/key.pem" | openssl md5)

    if [ "$CERT_MODULUS" != "$KEY_MODULUS" ]; then
        log_error "Certificate and private key do not match"
        exit 1
    fi

    log_info "Certificate verification successful"
}

# Print certificate information
print_cert_info() {
    log_info "Certificate Information:"
    openssl x509 -in "$CERT_DIR/cert.pem" -noout -subject -issuer -dates
}

# Main
main() {
    log_info "SSL/TLS Certificate Setup"
    log_info "=========================="
    log_info "Domain: $DOMAIN"
    log_info "Certificate Directory: $CERT_DIR"
    log_info "Use Let's Encrypt: $USE_LETSENCRYPT"
    echo ""

    # Check if running as root (required for Let's Encrypt)
    if [ "$USE_LETSENCRYPT" = "true" ]; then
        check_root
        setup_letsencrypt
        setup_renewal
    else
        setup_selfsigned
    fi

    verify_certificate
    print_cert_info

    echo ""
    log_info "SSL/TLS setup complete!"
    log_info "Update your .env file with:"
    echo "SSL_ENABLED=true"
    echo "SSL_CERT_PATH=$CERT_DIR/cert.pem"
    echo "SSL_KEY_PATH=$CERT_DIR/key.pem"
}

# Run main function
main
