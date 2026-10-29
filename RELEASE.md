# Release order

Owner instruction: keep a local backup before uploading any release changes to GitHub.

1. Prepare and verify the release locally. Keep the original source and data backups.
2. Commit the exact files to be uploaded.
3. Create a Git bundle outside the public repository with `git bundle create <backup-path> --all`.
4. Verify it with `git bundle verify <backup-path>` and record the bundle SHA-256 and release commit locally.
5. Only after backup verification succeeds, push the commit to GitHub.
6. Verify the published build fingerprint, version catalog and prototype entry. A pending Pages build is not a verified live release.

Never upload credentials, browser profiles or private runtime configuration. The public site and repository contain browser-delivered code and data.
