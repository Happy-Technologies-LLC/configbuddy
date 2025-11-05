# Test SSH Server for Discovery Testing
FROM alpine:3.19

# Install OpenSSH and comprehensive system tools for discovery testing
RUN apk add --no-cache \
    openssh \
    bash \
    sudo \
    curl \
    net-tools \
    procps \
    coreutils \
    iproute2 \
    util-linux \
    lsblk \
    tzdata \
    ca-certificates \
    && mkdir -p /var/run/sshd \
    && ssh-keygen -A

# Create test user with password
RUN adduser -D -s /bin/bash testuser \
    && echo "testuser:testpass123" | chpasswd \
    && echo "testuser ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers

# Create root password for testing
RUN echo "root:rootpass123" | chpasswd

# Configure SSH
RUN sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config \
    && sed -i 's/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config \
    && sed -i 's/#PubkeyAuthentication yes/PubkeyAuthentication yes/' /etc/ssh/sshd_config \
    && sed -i 's/#PermitEmptyPasswords no/PermitEmptyPasswords no/' /etc/ssh/sshd_config

# Expose SSH port
EXPOSE 22

# Start SSH daemon
CMD ["/usr/sbin/sshd", "-D", "-e"]
