# Fly-Log agent notes

## Testing App Check features in a Netlify deploy preview

The flight-status function and the AI flight parser only work with a Firebase App Check
token. App Check gets that token from a reCAPTCHA Enterprise key, and the key only works on
its allowed domains. By default those are `fly-log.netlify.app` and `localhost`, so a deploy
preview such as `deploy-preview-83--fly-log.netlify.app` gets no token, and both features
fail there.

Do not allow all of `netlify.app`. reCAPTCHA has no wildcards, so that would let any Netlify
site mint tokens for this key and spend the AeroDataBox and Gemini quota.

When a PR needs testing against the real APIs, add its preview domain for the life of the PR:

1. After the PR is open, add the domain. `--domains` replaces the whole list, so repeat the
   two permanent domains and any other open PR's preview domain. Changes can take up to
   30 minutes to apply.

   ```bash
   gcloud recaptcha keys update 6LdsTagtAAAAADLWgLFvh_Ai_aZllrofB0D2Lx4Q \
     --project=fly-log-78b66 --web \
     --domains=fly-log.netlify.app,localhost,deploy-preview-83--fly-log.netlify.app
   ```

2. Add this checklist line to the PR description, so the clean-up is visible to whoever
   merges or closes it:

   ```markdown
   - [ ] Clean-up: remove `deploy-preview-83--fly-log.netlify.app` from the reCAPTCHA key
   ```

3. When the PR is merged or closed, run the same command without that domain and tick the
   checklist line.

To find leftovers, list the current domains and remove any whose PR is no longer open:

```bash
gcloud recaptcha keys describe 6LdsTagtAAAAADLWgLFvh_Ai_aZllrofB0D2Lx4Q \
  --project=fly-log-78b66 --format="value(webSettings.allowedDomains)"
```

The functions also need their Netlify environment variables (for example
`RAPIDAPI_AERODATABOX_KEY`) set for the Deploy Previews context.
