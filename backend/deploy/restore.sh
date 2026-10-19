#!/usr/bin/env bash
# Restore a backup made by backup.sh. Default target is a NEW database name so a
# restore can be verified before anything live is touched.
#
#   deploy/restore.sh /var/backups/velisqa/velisqa-20261020T021500Z.archive.gz.gpg [target_db]
#
# To replace production: stop the API (pm2 stop velisqa-api), restore with
# target_db=velisqa and --drop, run `npm run verify:migration`-style checks, start the API.
set -euo pipefail
source /etc/velisqa/backup.env

SRC=${1:?usage: restore.sh <backup.archive.gz.gpg> [target_db]}
TARGET=${2:-velisqa_restore_$(date -u +%Y%m%d%H%M)}
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

sha256sum -c "$SRC.sha256"
gpg --batch --decrypt --output "$WORK/backup.archive.gz" "$SRC"

DROP=()
if [[ "$TARGET" == "velisqa" ]]; then
  read -r -p "Restoring OVER the live 'velisqa' database. Type RESTORE to continue: " answer
  [[ "$answer" == "RESTORE" ]] || { echo "aborted"; exit 1; }
  DROP=(--drop)
fi

mongorestore --uri="$BACKUP_MONGO_URI" --gzip --archive="$WORK/backup.archive.gz" \
  --oplogReplay "${DROP[@]}" --nsFrom='velisqa.*' --nsTo="$TARGET.*"
echo "restored into database: $TARGET"
