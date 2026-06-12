#!/usr/bin/env sh
# Apply MongoDB indexes from MongoFUCK/create-indexes.js
#
# Usage:
#   ./scripts/mongo-create-indexes.sh local
#   ./scripts/mongo-create-indexes.sh docker [container_name]
#
# Docker with auth:
#   mongosh -u admin -p passwd --authenticationDatabase admin < MongoFUCK/create-indexes.js

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT="$ROOT/MongoFUCK/create-indexes.js"

case "${1:-local}" in
  local)
    mongosh < "$SCRIPT"
    ;;
  docker)
    CONTAINER="${2:-mongodb}"
    docker exec -i "$CONTAINER" mongosh < "$SCRIPT"
    ;;
  *)
    echo "Usage: $0 {local|docker [container_name]}"
    exit 1
    ;;
esac

echo "Indexes applied."
