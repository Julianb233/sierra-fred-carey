# Vercel Staging Deployment Setup

## Project Configuration

**Repository:** Julianb233/sierra-fred-carey
**Staging Branch:** staging
**Deployment Environment:** Vercel (Staging)
**Vercel Organization ID:** team_Fs8nLavBTXBbOfb7Yxcydw83
**Vercel Project ID:** prj_SMYMDJ30eBOJKoFWxFwLoI73rupP

## Prerequisites

- GitHub CLI (`gh`) installed and authenticated
- Access to Vercel account with organization permissions
- Access to the sierra-fred-carey GitHub repository as owner/admin

## Step 1: Obtain Vercel Token

1. Go to: https://vercel.com/account/tokens
2. Click "Create New Token"
3. Name it: `sierra-fred-carey-ci` or similar
4. Select appropriate scopes:
   - Read access to account settings
   - Read/Write access to deployments
5. Copy the generated token (starts with `vk_`)

## Step 2: Set GitHub Secrets

Use one of these methods:

### Method A: GitHub CLI (Recommended)

```bash
#!/bin/bash

# Set the Vercel token (replace YOUR_TOKEN_HERE)
gh secret set VERCEL_TOKEN --body "YOUR_TOKEN_HERE" -R Julianb233/sierra-fred-carey

# Set the Vercel organization ID
gh secret set VERCEL_ORG_ID --body "team_Fs8nLavBTXBbOfb7Yxcydw83" -R Julianb233/sierra-fred-carey

# Set the Vercel project ID
gh secret set VERCEL_PROJECT_ID --body "prj_SMYMDJ30eBOJKoFWxFwLoI73rupP" -R Julianb233/sierra-fred-carey

# Verify the secrets were set
gh secret list -R Julianb233/sierra-fred-carey
```

### Method B: GitHub Web Interface

1. Navigate to: https://github.com/Julianb233/sierra-fred-carey/settings/secrets/actions
2. Click "New repository secret"
3. Add each secret:

   **Secret 1: VERCEL_TOKEN**
   - Name: `VERCEL_TOKEN`
   - Value: `YOUR_VERCEL_TOKEN_HERE`

   **Secret 2: VERCEL_ORG_ID**
   - Name: `VERCEL_ORG_ID`
   - Value: `team_Fs8nLavBTXBbOfb7Yxcydw83`

   **Secret 3: VERCEL_PROJECT_ID**
   - Name: `VERCEL_PROJECT_ID`
   - Value: `prj_SMYMDJ30eBOJKoFWxFwLoI73rupP`

## Step 3: Optional - Set Slack Webhook (for notifications)

If you want deployment status notifications in Slack:

1. Create a Slack webhook: https://api.slack.com/apps/
2. Set the secret:

```bash
gh secret set SLACK_WEBHOOK --body "YOUR_SLACK_WEBHOOK_URL" -R Julianb233/sierra-fred-carey
```

## Step 4: Trigger Deployment

Once secrets are set, deployment is triggered automatically on:
- Push to `staging` branch
- Push to `main` branch (deploys to production)

Or manually trigger:

```bash
# View recent workflows
gh run list -R Julianb233/sierra-fred-carey --limit 5

# Re-run a specific workflow
gh run rerun 20559764257 -R Julianb233/sierra-fred-carey
```

## Deployment Process

The GitHub Actions workflow will:

1. **Build Stage**
   - Checkout code
   - Setup Node.js v20
   - Install dependencies
   - Run linting
   - Run type checking
   - Run tests
   - Build the application

2. **Security Stage**
   - Run npm audit
   - Run Trivy vulnerability scanning

3. **Deploy Stage** (only for main/staging branches)
   - Deploy to Vercel using CLI
   - Set as production if on `main` branch
   - Set as preview if on `staging` branch

4. **Notify Stage**
   - Send Slack notification with deployment status

## Configuration Files

### Build Configuration
**File:** `vercel.json`
```json
{
  "installCommand": "npm install --legacy-peer-deps",
  "buildCommand": "npm run build"
}
```

### Workflow Configuration
**File:** `.github/workflows/deploy.yml`
- Triggers on push to `main` and `staging` branches
- Also runs on pull requests for validation
- Requires secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

## Verification Checklist

- [ ] Vercel token obtained from https://vercel.com/account/tokens
- [ ] `VERCEL_TOKEN` secret set in GitHub
- [ ] `VERCEL_ORG_ID` secret set in GitHub (team_Fs8nLavBTXBbOfb7Yxcydw83)
- [ ] `VERCEL_PROJECT_ID` secret set in GitHub (prj_SMYMDJ30eBOJKoFWxFwLoI73rupP)
- [ ] Workflow file syntax validated (no YAML errors)
- [ ] Latest commit pushed to staging branch

## Troubleshooting

### "option requires argument: --token" Error
- Cause: VERCEL_TOKEN secret not set or empty
- Solution: Verify secret is properly set in GitHub repo settings

### "VERCEL_PROJECT_ID not recognized"
- Cause: Project ID doesn't match Vercel project
- Solution: Verify project ID matches actual Vercel project

### Deployment succeeds but app is not updated
- Cause: Vercel cache or build issues
- Solution: Check Vercel deployment logs at https://vercel.com/dashboard

### Slack notifications not received
- Cause: Optional feature, not critical for deployment
- Solution: SLACK_WEBHOOK secret is optional

## Additional Resources

- Vercel CLI Documentation: https://vercel.com/docs/cli
- GitHub Actions Secrets: https://docs.github.com/en/actions/security-guides/encrypted-secrets
- Vercel Deployments: https://vercel.com/dashboard
- GitHub Actions Workflow: https://github.com/Julianb233/sierra-fred-carey/actions

## Support

For deployment issues, check:
1. GitHub Actions workflow logs
2. Vercel deployment logs
3. Verify all secrets are properly set
4. Ensure Vercel token has correct permissions
