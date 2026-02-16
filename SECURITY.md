# Security Policy

## Supported Versions

We actively support security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| 0.x.x   | :warning: Pre-release (best effort) |

**Recommendation**: Always use the latest stable release (1.0.x or later) for production deployments.

## Reporting a Vulnerability

We take security seriously and appreciate responsible disclosure.

### How to Report

**Preferred method**: Use [GitHub Security Advisories](https://github.com/wordgarden-dev/mcp-server-obsidian/security/advisories/new) to privately report vulnerabilities.

**Alternative contact**: Email security@wordgarden.dev with:
- Description of the vulnerability
- Steps to reproduce
- Potential impact assessment
- Any suggested fixes (optional)

### What to Expect

- **Initial response**: Within 48 hours
- **Triage and assessment**: Within 5 business days
- **Fix development**: Depends on severity (critical issues expedited)
- **Disclosure timeline**: Coordinated with reporter, typically 90 days

### What We Ask

- **Do not** open public issues for security vulnerabilities
- **Do not** exploit vulnerabilities beyond proof-of-concept
- Allow reasonable time for fixes before public disclosure
- Act in good faith

## Security Features

This MCP server implements multiple layers of defense against common security threats:

### Path Traversal Prevention

**Implementation**: `validateVaultPath()` utility

- Validates all vault paths are absolute and normalized
- Prevents `../` path traversal attempts
- Blocks access to files outside specified vault boundaries
- Uses OS-safe path operations (`path.resolve`, `path.normalize`)

**Example protection**:
```typescript
// ❌ Blocked: Relative paths
validateVaultPath("../../etc/passwd")

// ❌ Blocked: Path traversal
validateVaultPath("/vault/path/../../../etc/passwd")

// ✅ Allowed: Absolute vault path
validateVaultPath("/home/user/Documents/vault")
```

### Input Sanitization

**Implementation**: `validateItemText()`, `validateColumnName()` utilities

- **Length limits**: Item text (10,000 chars), column names (100 chars)
- **Character filtering**: Removes control characters, null bytes
- **Markdown safety**: Preserves valid markdown, strips potentially harmful sequences
- **Schema validation**: Zod schemas enforce type safety on all inputs

**Protected against**:
- Null byte injection
- Control character abuse
- Excessively long inputs (memory exhaustion)
- Invalid UTF-8 sequences

### DOS Protection

**Implementation**: Multiple layers

- **Input size limits**: Enforced at schema and validation layers
- **Timeout handling**: Operations gracefully time out on stalled I/O
- **Memory constraints**: No unbounded buffers or arrays
- **Operation limits**: Bulk operations validate array sizes

**Example protections**:
```typescript
// ❌ Blocked: Oversized item text
kanban_item_add({ text: "x".repeat(100000) })

// ❌ Blocked: Too many bulk operations
kanban_merge({ sourceBoards: Array(1000).fill("board") })
```

### No Arbitrary Command Execution

**Design principle**: Read/write files only, never execute user-controlled commands

- **No shell spawning**: All file operations use Node.js `fs` module directly
- **No eval/Function**: No dynamic code execution
- **No template injection**: All output is escaped/serialized
- **Obsidian URI only**: `vault_open` uses safe `obsidian://` protocol (no file://, http://, etc.)

### Read-Only by Default

**Access model**: Explicit vault path required for all write operations

- **No global state**: Each operation specifies target vault explicitly
- **No default vault**: Server cannot write without user-specified path
- **No auto-discovery**: Will not search filesystem for vaults
- **Opt-in writes**: All mutations require explicit tool invocation

## Known Limitations

**We acknowledge these security boundaries and design constraints:**

### 1. Trusts Local Filesystem Permissions

**Limitation**: Server inherits filesystem permissions of the user running it.

**Impact**: If user has write access to `/etc`, server can write there if directed.

**Mitigation**: Run server with least-privilege user account.

### 2. No Encryption of Vault Contents

**Limitation**: Server reads/writes vault files in plaintext.

**Impact**: Sensitive vault data is not encrypted at rest or in transit (STDIO).

**Mitigation**: 
- Use OS-level encryption (FileVault, BitLocker, LUKS)
- Restrict vault directory permissions
- Run server only for trusted automation tasks

### 3. Assumes Vault Owner is Trusted

**Limitation**: Server does not validate vault authenticity or integrity.

**Impact**: Malicious vault contents could exploit parsing logic or downstream consumers.

**Mitigation**:
- Only use vaults you control or trust completely
- Do not point server at untrusted/third-party vaults
- Review vault contents before first use

### 4. No Rate Limiting

**Limitation**: Server does not limit request frequency.

**Impact**: Malicious MCP client could flood server with requests.

**Mitigation**: Deploy behind MCP client with built-in rate limiting (Claude Desktop does this).

### 5. No Audit Logging

**Limitation**: Server logs errors but not detailed operation history.

**Impact**: No forensic trail of who modified what and when.

**Mitigation**: Use OS-level audit tools (auditd, Windows Event Log) if needed.

## Best Practices for Users

Follow these guidelines to maximize security:

### 1. Run with Least Privilege

**Don't**: Run server as root/Administrator

**Do**: Create dedicated user account with minimal permissions:
```bash
# Linux/macOS
sudo useradd -m -s /bin/bash mcp-user
sudo -u mcp-user npx @wordgarden-dev/mcp-server-obsidian

# Windows
runas /user:mcp-user "npx @wordgarden-dev/mcp-server-obsidian"
```

### 2. Use Dedicated Vault for Automation

**Don't**: Point server at your personal vault with sensitive notes

**Do**: Create automation-specific vault:
```bash
mkdir ~/Documents/automation-vault
npx @wordgarden-dev/mcp-server-obsidian
# All operations use ~/Documents/automation-vault
```

### 3. Keep Dependencies Updated

**Check for updates regularly**:
```bash
npm outdated @wordgarden-dev/mcp-server-obsidian
npm update @wordgarden-dev/mcp-server-obsidian
```

**Enable security alerts**: Watch the GitHub repository for security advisories.

### 4. Validate Inputs from Untrusted Sources

**If using server in automation pipelines**:
```typescript
// ❌ Don't: Pass untrusted input directly
kanban_item_add({ text: userInput })

// ✅ Do: Validate first
if (userInput.length <= 1000 && /^[a-zA-Z0-9\s\-_.]+$/.test(userInput)) {
  kanban_item_add({ text: userInput })
}
```

### 5. Review Logs Regularly

**Monitor for suspicious activity**:
```bash
# Server logs errors to stderr
npx @wordgarden-dev/mcp-server-obsidian 2> server.log

# Review periodically
grep -i "error\|warn\|invalid" server.log
```

### 6. Restrict Network Access

**If deploying on server**: Use firewall rules to limit which processes can invoke the server.

```bash
# Linux: Only allow MCP client process
iptables -A OUTPUT -m owner --uid-owner mcp-user -j ACCEPT
```

### 7. Test with Read-Only Operations First

**When setting up**:
1. Start with `kanban_read`, `kanban_list` (read-only)
2. Verify expected behavior
3. Gradually enable write operations (`kanban_create`, `kanban_item_add`)
4. Test `kanban_delete` only after confirming backups work

### 8. Use Version Control for Vaults

**Track changes with git**:
```bash
cd ~/Documents/automation-vault
git init
git add -A
git commit -m "Baseline before automation"

# After each operation batch
git status
git diff
git add -A && git commit -m "Automated changes"
```

**Benefit**: Easy rollback if automation misbehaves.

## Security Checklist

Before deploying in production, verify:

- [ ] Running as non-privileged user account
- [ ] Vault directory has appropriate filesystem permissions (600/700)
- [ ] Dependencies are up-to-date (`npm outdated`)
- [ ] Vault is backed up regularly
- [ ] Logs are monitored for errors
- [ ] MCP client (Claude Desktop, etc.) is from trusted source
- [ ] Server version is 1.0.x or later (not pre-release)
- [ ] No sensitive data in vault (or vault is encrypted at rest)
- [ ] Firewall rules restrict server access (if networked)
- [ ] Vault is under version control (optional but recommended)

## Threat Model

### In Scope

**Server protects against**:
- Path traversal attacks
- Input injection (command, SQL, template)
- DOS via oversized inputs
- Unauthorized filesystem access outside vaults
- Accidental data corruption (via validation)

### Out of Scope

**Server does NOT protect against**:
- Malicious MCP client (assumes client is trusted)
- Compromised OS or filesystem
- Physical access to machine
- Memory dump analysis
- Timing attacks or side channels
- Social engineering

**Assumption**: Server runs in trusted environment, invoked by trusted automation.

## Reporting False Positives

If security scanners flag this package incorrectly, please report so we can:
- Add documentation to clarify safe usage
- Request CVE exclusion if applicable
- Update package metadata

Contact: security@wordgarden.dev

## Security Roadmap

Planned enhancements (not committed):
- [ ] Audit logging with structured log format
- [ ] Rate limiting per vault
- [ ] Cryptographic signing of board files
- [ ] Vault integrity verification
- [ ] Sandboxing via OS-level containers

**Contributions welcome**: See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

**Last updated**: February 15, 2026  
**Version**: 1.0.0
