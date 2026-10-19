#!/usr/bin/env bash
# Nightly MongoDB backup: compressed archive, encrypted, kept 14 days locally,
# copied off the VPS. Schedule with cron as the deploy user:
#   15 2 * * * /srv/velisqa/backend/deploy/backup.sh >> /var/log/velisqa-backup.log 2>&1
#
# Needs: mongodump (mongodb-database-tools), gpg, and either rclone (off-site remote)
# or another copy step. Reads BACKUP_* from /etc/velisqa/backup.env (chmod 600):
#   BACKUP_MONGO_URI="mongodb://velisqa_backup:<pw>@127.0.0.1:27017/velisqa?authSource=admin&replicaSet=rs0"
#   BACKUP_GPG_RECIPIENT="ops@velisqa.com"     # public key imported for the deploy user
#   BACKUP_RCLONE_REMOTE="offsite:velisqa-backups"   # optional
set -euo pipefail
source /etc/velisqa/backup.env

DIR=/var/backups/velisqa
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
FILE="$DIR/velisqa-$STAMP.archive.gz"
mkdir -p "$DIR"
chmod 700 "$DIR"

# --oplog gives a consistent point-in-time snapshot on a replica set.
mongodump --uri="$BACKUP_MONGO_URI" --oplog --gzip --archive="$FILE"
gpg --batch --yes --trust-model always --encrypt --recipient "$BACKUP_GPG_RECIPIENT" --output "$FILE.gpg" "$FILE"
rm -f "$FILE"
sha256sum "$FILE.gpg" > "$FILE.gpg.sha256"

if [[ -n "${BACKUP_RCLONE_REMOTE:-}" ]]; then
  rclone copy "$FILE.gpg" "$BACKUP_RCLONE_REMOTE/"
  rclone copy "$FILE.gpg.sha256" "$BACKUP_RCLONE_REMOTE/"
fi

find "$DIR" -name 'velisqa-*.archive.gz.gpg*' -mtime +14 -delete
echo "$(date -u) backup ok: $(basename "$FILE").gpg ($(du -h "$FILE.gpg" | cut -f1))"
