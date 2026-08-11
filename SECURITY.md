# Security Policy

## Supported versions

`prisma-ltree` is pre-1.0 and follows a rolling-release model: security fixes land on the
latest published minor on npm. Please make sure you are on the most recent release before
reporting.

| Version | Supported          |
| ------- | ------------------ |
| `0.2.x` | :white_check_mark: |
| `< 0.2` | :x:                |

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub issues,
Discussions, or pull requests.**

Report privately through GitHub Security Advisories:

1. Go to the [Security tab](https://github.com/slovakian/prisma-ltree/security/advisories)
   of the repository.
2. Click **"Report a vulnerability"** to open a private advisory.

If you are unable to use GitHub Security Advisories, email **derproka@gmail.com** with the
details.

Please include, where possible:

- A description of the vulnerability and its impact
- Steps to reproduce (a minimal contract/query or migration that triggers it)
- Affected version(s) and environment (Node, PostgreSQL, `@prisma/orm-*` versions)

## What to expect

- **Acknowledgement** of your report within **5 business days**.
- An assessment and, where applicable, a coordinated fix and release.
- Credit for the disclosure unless you prefer to remain anonymous.

Because this is an ORM/database extension, please flag any issue that could lead to SQL
injection, unintended data exposure, or migration/DDL that diverges from the declared
contract.
