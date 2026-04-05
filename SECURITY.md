# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 3.0.x   | Yes |
| < 3.0   | No  |

## Reporting a Vulnerability

**Do not report security vulnerabilities through public GitHub issues.**

Report via:

1. **GitHub Security Advisories**: Use the "Report a vulnerability" button on the Security tab.
2. **Email**: security@happy-tech.biz

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Affected versions
- Potential impact

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial assessment**: Within 5 business days
- **Fix timeline**: Critical issues targeted within 14 days

### Scope

**In scope**: Authentication/authorization bypass, injection (SQL, Cypher, command), XSS, credential exposure, privilege escalation, exploitable dependency vulnerabilities.

**Out of scope**: DoS via resource exhaustion (unless trivially exploitable), issues requiring physical access, social engineering.

## Security Documentation

For operational security guidance, see: `doc-site/docs/configuration/security/`

## Known Dependency Advisories

- `node-nmap` -> `xml2js`: Prototype pollution (no upstream fix available)
- `tough-cookie`: Prototype pollution (transitive via deprecated `request` library)

These are documented and monitored.
