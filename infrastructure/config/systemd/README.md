# SystemD Service and Timer Configuration

This directory contains systemd service and timer units for automated ConfigBuddy database backups.

## Files

- `configbuddy-backup.service` - Main backup service unit
- `configbuddy-backup.timer` - Timer for daily backup execution (2:00 AM)
- `configbuddy-backup-healthcheck.service` - Backup health check service
- `configbuddy-backup-healthcheck.timer` - Timer for health checks (every 6 hours)

## Installation

### 1. Copy service and timer files

```bash
sudo cp *.service *.timer /etc/systemd/system/
```

### 2. Update paths in service files

Edit the service files and update the `WorkingDirectory` and `ExecStart` paths to match your installation:

```bash
sudo nano /etc/systemd/system/configbuddy-backup.service
# Update: WorkingDirectory=/opt/configbuddy/infrastructure/scripts
# Update: ExecStart=/opt/configbuddy/infrastructure/scripts/backup-all.sh
```

### 3. Create environment file (optional)

```bash
sudo mkdir -p /etc/configbuddy
sudo nano /etc/configbuddy/backup.env
```

Add your configuration:

```bash
BACKUP_DIR=/var/backups/configbuddy
POSTGRES_PASSWORD=your-postgres-password
NEO4J_PASSWORD=your-neo4j-password
BACKUP_UPLOAD_ENABLED=true
BACKUP_S3_BUCKET=my-backup-bucket
```

### 4. Create log directory

```bash
sudo mkdir -p /var/log/configbuddy/backups
sudo chown root:root /var/log/configbuddy/backups
sudo chmod 755 /var/log/configbuddy/backups
```

### 5. Reload systemd

```bash
sudo systemctl daemon-reload
```

### 6. Enable and start timers

```bash
# Enable backup timer (starts on boot)
sudo systemctl enable configbuddy-backup.timer
sudo systemctl start configbuddy-backup.timer

# Enable health check timer
sudo systemctl enable configbuddy-backup-healthcheck.timer
sudo systemctl start configbuddy-backup-healthcheck.timer
```

## Management Commands

### Check timer status

```bash
# List all timers
sudo systemctl list-timers

# Check specific timer
sudo systemctl status configbuddy-backup.timer
sudo systemctl status configbuddy-backup-healthcheck.timer
```

### Manual backup execution

```bash
# Run backup manually
sudo systemctl start configbuddy-backup.service

# Run health check manually
sudo systemctl start configbuddy-backup-healthcheck.service
```

### View logs

```bash
# View backup service logs
sudo journalctl -u configbuddy-backup.service -f

# View health check logs
sudo journalctl -u configbuddy-backup-healthcheck.service -f

# View backup script logs
sudo tail -f /var/log/configbuddy/backups/backup.log
sudo tail -f /var/log/configbuddy/backups/health-check.log
```

### Stop/disable timers

```bash
sudo systemctl stop configbuddy-backup.timer
sudo systemctl disable configbuddy-backup.timer
```

## Scheduling Details

### Backup Timer
- **Schedule**: Daily at 2:00 AM
- **Persistent**: Yes (runs on next boot if missed)
- **Randomized Delay**: Up to 15 minutes (prevents load spikes)

### Health Check Timer
- **Schedule**: Every 6 hours (00:00, 06:00, 12:00, 18:00)
- **Persistent**: Yes
- **Accuracy**: 5 minutes

## Customization

### Change backup schedule

Edit the timer file:

```bash
sudo nano /etc/systemd/system/configbuddy-backup.timer
```

Change `OnCalendar` value:

```ini
# Daily at 3:00 AM
OnCalendar=*-*-* 03:00:00

# Every 12 hours
OnCalendar=00/12:00:00

# Weekly on Sunday at 2:00 AM
OnCalendar=Sun *-*-* 02:00:00

# Multiple times per day
OnCalendar=*-*-* 02,14:00:00
```

Reload after changes:

```bash
sudo systemctl daemon-reload
sudo systemctl restart configbuddy-backup.timer
```

## Troubleshooting

### Timer not running

```bash
# Check if timer is enabled
sudo systemctl is-enabled configbuddy-backup.timer

# Check timer status
sudo systemctl status configbuddy-backup.timer

# View timer details
sudo systemctl show configbuddy-backup.timer
```

### Service failing

```bash
# Check service status
sudo systemctl status configbuddy-backup.service

# View recent logs
sudo journalctl -u configbuddy-backup.service -n 50

# Test service manually
sudo systemctl start configbuddy-backup.service
```

### Permissions issues

Ensure backup directories exist and are writable:

```bash
sudo mkdir -p /var/backups/configbuddy/{postgres,neo4j}/{daily,weekly,monthly}
sudo chmod 755 /var/backups/configbuddy
```

## Security Considerations

- **Passwords**: Store sensitive credentials in `/etc/configbuddy/backup.env` with restricted permissions (`chmod 600`)
- **User**: Services run as `root` (required for Docker access and backup directory writes)
- **Resource Limits**: CPU and memory limits prevent backup jobs from impacting production workloads
- **PrivateTmp**: Enabled for service isolation

## References

- [systemd.timer documentation](https://www.freedesktop.org/software/systemd/man/systemd.timer.html)
- [systemd.service documentation](https://www.freedesktop.org/software/systemd/man/systemd.service.html)
- [OnCalendar time formats](https://www.freedesktop.org/software/systemd/man/systemd.time.html)
