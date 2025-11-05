# Runbook: SSL Certificate Renewal

**Alert Name**: `SSLCertificateExpiringSoon`, `SSLCertificateExpiringCritical`
**Severity**: Warning (<30 days), Critical (<7 days)
**Component**: infrastructure, load-balancer, ingress
**Initial Response Time**: 2 days (warning), 4 hours (critical)

## Symptoms

- Alert: SSL certificate expiring in <30 days (warning) or <7 days (critical)
- Browser warnings about certificate expiration
- API clients reporting SSL/TLS errors
- Monitoring systems showing certificate expiration approaching

## Impact

- **30 days**: Sufficient time for planned renewal
- **7 days**: Urgent renewal required to prevent outage
- **Expired**: Service inaccessible, browsers block access, API clients fail

## Diagnosis

### 1. Check Certificate Expiration

```bash
# Check certificate expiration for domain
echo | openssl s_client -servername configbuddy.example.com -connect configbuddy.example.com:443 2>/dev/null | openssl x509 -noout -dates

# Check all certificates
for domain in api.configbuddy.example.com configbuddy.example.com; do
  echo "=== $domain ==="
  echo | openssl s_client -servername $domain -connect $domain:443 2>/dev/null | openssl x509 -noout -subject -dates
done

# Check days until expiration
echo | openssl s_client -servername configbuddy.example.com -connect configbuddy.example.com:443 2>/dev/null | openssl x509 -noout -checkend 2592000 && echo "Certificate valid for >30 days" || echo "Certificate expires in <30 days"
```

### 2. Check Certificate Details

```bash
# View full certificate details
echo | openssl s_client -servername configbuddy.example.com -connect configbuddy.example.com:443 2>/dev/null | openssl x509 -noout -text

# Check SAN (Subject Alternative Names)
echo | openssl s_client -servername configbuddy.example.com -connect configbuddy.example.com:443 2>/dev/null | openssl x509 -noout -text | grep -A1 "Subject Alternative Name"

# Check issuer
echo | openssl s_client -servername configbuddy.example.com -connect configbuddy.example.com:443 2>/dev/null | openssl x509 -noout -issuer
```

### 3. Check Certificate Location

```bash
# Find certificate files
find /etc/ssl /etc/nginx /etc/letsencrypt -name "*.crt" -o -name "*.pem" 2>/dev/null

# Check Kubernetes secrets (if using K8s)
kubectl get secrets -n configbuddy | grep tls

# Check certificate in Kubernetes secret
kubectl get secret configbuddy-tls -n configbuddy -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -dates
```

### 4. Check Certificate Renewal Process

```bash
# Check if certbot/Let's Encrypt is configured
which certbot
certbot certificates

# Check renewal timer (systemd)
systemctl status certbot.timer
systemctl list-timers | grep certbot

# Check cron jobs for renewal
crontab -l | grep -i cert
```

## Resolution Steps

### Option 1: Let's Encrypt (Automated Renewal)

#### Step 1: Install/Verify Certbot

```bash
# Install certbot (if not installed)
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Or for standalone mode
sudo apt-get install certbot
```

#### Step 2: Renew Certificate

```bash
# Dry run to test renewal
sudo certbot renew --dry-run

# Actual renewal
sudo certbot renew

# Force renewal even if not expiring soon
sudo certbot renew --force-renewal

# Renew specific certificate
sudo certbot certonly --force-renewal -d configbuddy.example.com -d api.configbuddy.example.com
```

#### Step 3: Reload Web Server

```bash
# Nginx
sudo nginx -t && sudo systemctl reload nginx

# Or if using Docker
docker restart nginx-proxy

# Kubernetes Ingress (certificates auto-reload usually)
kubectl rollout restart deployment nginx-ingress-controller -n ingress-nginx
```

#### Step 4: Enable Auto-Renewal

```bash
# Enable certbot timer (systemd)
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Verify timer is active
sudo systemctl status certbot.timer

# Or add cron job
echo "0 0,12 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'" | sudo crontab -
```

### Option 2: Manual Certificate Renewal (CA-Issued Certificate)

#### Step 1: Generate CSR (Certificate Signing Request)

```bash
# Generate private key and CSR
openssl req -new -newkey rsa:2048 -nodes \
  -keyout configbuddy.key \
  -out configbuddy.csr \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=configbuddy.example.com"

# Verify CSR
openssl req -text -noout -verify -in configbuddy.csr
```

#### Step 2: Submit CSR to Certificate Authority

```bash
# Copy CSR content
cat configbuddy.csr

# Submit to CA (e.g., DigiCert, Comodo, etc.)
# Follow CA's web interface to submit CSR
# Pay for certificate if commercial CA
```

#### Step 3: Install New Certificate

```bash
# Download certificate from CA
# Usually receive: certificate.crt, intermediate.crt, root.crt

# Create certificate bundle
cat certificate.crt intermediate.crt root.crt > configbuddy-bundle.crt

# Install certificate (Nginx example)
sudo cp configbuddy.key /etc/ssl/private/
sudo cp configbuddy-bundle.crt /etc/ssl/certs/
sudo chmod 600 /etc/ssl/private/configbuddy.key

# Update Nginx configuration
sudo nano /etc/nginx/sites-available/configbuddy
# ssl_certificate /etc/ssl/certs/configbuddy-bundle.crt;
# ssl_certificate_key /etc/ssl/private/configbuddy.key;

# Test and reload
sudo nginx -t && sudo systemctl reload nginx
```

### Option 3: Kubernetes with cert-manager

#### Step 1: Verify cert-manager

```bash
# Check cert-manager is installed
kubectl get pods -n cert-manager

# Check certificate resource
kubectl get certificate -n configbuddy
kubectl describe certificate configbuddy-tls -n configbuddy
```

#### Step 2: Manually Trigger Renewal

```bash
# Delete certificate to force renewal
kubectl delete certificate configbuddy-tls -n configbuddy

# Or annotate to force renewal
kubectl annotate certificate configbuddy-tls -n configbuddy cert-manager.io/issue-temporary-certificate="true"

# Check certificate request status
kubectl get certificaterequest -n configbuddy
kubectl describe certificaterequest -n configbuddy
```

#### Step 3: Verify New Certificate

```bash
# Wait for certificate to be ready
kubectl wait --for=condition=Ready certificate/configbuddy-tls -n configbuddy --timeout=300s

# Check certificate expiration
kubectl get secret configbuddy-tls -n configbuddy -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -dates
```

### Option 4: AWS Certificate Manager (ACM)

```bash
# Request new certificate
aws acm request-certificate \
  --domain-name configbuddy.example.com \
  --subject-alternative-names api.configbuddy.example.com \
  --validation-method DNS

# Get validation CNAME records
aws acm describe-certificate --certificate-arn arn:aws:acm:region:account:certificate/cert-id

# Add DNS records for validation
# Then wait for validation

# Associate certificate with load balancer
aws elbv2 modify-listener \
  --listener-arn arn:aws:elasticloadbalancing:region:account:listener/app/my-lb/id \
  --certificates CertificateArn=arn:aws:acm:region:account:certificate/cert-id
```

## Verification

After renewal:

1. **Certificate Valid**: Check expiration date is >90 days in future
2. **No Browser Warnings**: Access site in browser, no SSL errors
3. **API Clients Work**: Test API calls, no SSL/TLS errors
4. **Monitoring Updated**: Prometheus metric shows new expiration date
5. **Auto-Renewal Enabled**: Verify automatic renewal is configured
6. **All Domains Covered**: Check all subdomains have valid certificates

```bash
# Verify new certificate
echo | openssl s_client -servername configbuddy.example.com -connect configbuddy.example.com:443 2>/dev/null | openssl x509 -noout -dates

# Test HTTPS endpoint
curl -v https://configbuddy.example.com 2>&1 | grep -E "expire|valid"

# Test API
curl -v https://api.configbuddy.example.com/health 2>&1 | grep -E "expire|valid"
```

## Escalation

If renewal fails after 2 attempts:

1. **Escalate to**: Senior Infrastructure Engineer / Security Team
2. **Provide**:
   - Certificate expiration date
   - Domain names affected
   - CA being used
   - Error messages from renewal attempts
   - DNS configuration
3. **Consider**:
   - Switching to different CA
   - Temporary self-signed certificate (testing only!)
   - Emergency certificate purchase

## Post-Incident Actions

1. **Enable Auto-Renewal**: Ensure automated renewal is working
2. **Monitoring**: Add alerts for certificate expiration at 60, 30, 7 days
3. **Documentation**: Update certificate renewal procedures
4. **Calendar Reminders**: Set reminders 60 days before expiration
5. **Test Renewal Process**: Quarterly test of renewal procedure
6. **Backup Certificates**: Keep backup of current certificates
7. **Contact List**: Maintain list of CA contacts and emergency support

## Common Issues and Solutions

### Issue: Let's Encrypt Rate Limiting

```bash
# Error: too many certificates already issued
# Solution: Use --dry-run to test, wait 7 days, or use different validation method

# Check rate limits
curl -s "https://crt.sh/?q=example.com&output=json" | jq 'length'

# Use DNS validation instead of HTTP
sudo certbot certonly --dns-route53 -d configbuddy.example.com
```

### Issue: DNS Validation Failing

```bash
# Check DNS records are properly set
dig _acme-challenge.configbuddy.example.com TXT

# Verify DNS propagation
for ns in 8.8.8.8 1.1.1.1; do
  echo "=== $ns ==="
  dig @$ns _acme-challenge.configbuddy.example.com TXT +short
done

# Wait for DNS propagation (can take up to 24 hours)
```

### Issue: Certificate Chain Incomplete

```bash
# Test certificate chain
openssl s_client -connect configbuddy.example.com:443 -showcerts

# Verify against Mozilla CA bundle
openssl s_client -connect configbuddy.example.com:443 -CAfile /etc/ssl/certs/ca-certificates.crt

# Fix: Include intermediate certificates in bundle
cat certificate.crt intermediate.crt > fullchain.crt
```

## Related Runbooks

- [API Server Down](./api-server-down.md)
- [Performance Degradation](./performance-degradation.md)

## Useful Commands

```bash
# Check certificate expiration for all domains
for domain in configbuddy.example.com api.configbuddy.example.com; do
  echo "=== $domain ==="
  echo | timeout 5 openssl s_client -servername $domain -connect $domain:443 2>/dev/null | openssl x509 -noout -dates
done

# Monitor certificate expiration continuously
watch -n 3600 'certbot certificates'

# Export Prometheus metric for certificate expiration
curl -s http://localhost:9090/api/v1/query?query=ssl_certificate_expiry_timestamp_seconds | jq

# Backup current certificates
sudo tar czf /backup/ssl-certs-$(date +%Y%m%d).tar.gz /etc/ssl /etc/letsencrypt

# Test SSL configuration
curl https://www.ssllabs.com/ssltest/analyze.html?d=configbuddy.example.com
```

## Monitoring Queries

```promql
# Days until certificate expiration
(ssl_certificate_expiry_timestamp_seconds - time()) / 86400

# Certificates expiring in <30 days
(ssl_certificate_expiry_timestamp_seconds - time()) / 86400 < 30

# Certificates expiring in <7 days (critical)
(ssl_certificate_expiry_timestamp_seconds - time()) / 86400 < 7
```

## Certificate Renewal Checklist

- [ ] Check current certificate expiration date
- [ ] Verify domain ownership/DNS records
- [ ] Generate CSR or trigger automated renewal
- [ ] Obtain new certificate from CA
- [ ] Install certificate on servers/load balancers
- [ ] Reload/restart web servers
- [ ] Test HTTPS endpoints
- [ ] Verify certificate chain is complete
- [ ] Update monitoring with new expiration date
- [ ] Enable/verify auto-renewal is configured
- [ ] Document renewal in incident log
- [ ] Schedule next renewal check
