# dep-installer

Vet an npm package before installing it. This skill MUST be run before any `npm install <package>`.

## Process

Given a package name (e.g., `leaflet`):

1. **npm registry check**: Run `npm view <package> --json` to get:
   - Weekly download count
   - Last publish date
   - Number of maintainers
   - License

2. **GitHub repo check**: Find the repo URL from npm metadata, then:
   - Check GitHub stars count via `gh api repos/<owner>/<repo> --jq '.stargazers_count,.pushed_at,.archived'`
   - Check last commit date
   - Check if repo is archived

3. **Security check**: Search the web for `"<package>" npm vulnerability 2025 2026` to find:
   - Known CVEs
   - Supply chain attack history
   - Typosquatting warnings

4. **Decision criteria**:
   - **INSTALL** if ALL of: >10K weekly downloads, published in last 12 months OR well-established (>1M downloads), 2+ maintainers (or well-known author), no known unpatched vulnerabilities
   - **REJECT** if ANY of: <10K weekly downloads, no updates in 24+ months AND <100K downloads, single anonymous maintainer with <50K downloads, known unpatched security issues, name suspiciously similar to popular package (typosquatting risk)

5. **Output**: Print a verdict table:

```
Package: <name>@<version>
| Check            | Result              |
|------------------|---------------------|
| Weekly downloads | ✅ 4.2M             |
| Last published   | ✅ 2 months ago     |
| Maintainers      | ✅ 5                |
| GitHub stars     | ✅ 42K              |
| Last commit      | ✅ 3 weeks ago      |
| Known vulns      | ✅ None             |
| Verdict          | ✅ SAFE TO INSTALL  |
```

Or if rejected:

```
| Verdict          | ❌ DO NOT INSTALL — [reason] |
```

6. Only after a SAFE TO INSTALL verdict, proceed with `npm install <package>`.
