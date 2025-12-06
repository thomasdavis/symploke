#!/bin/bash

# Symploke Full Pipeline Script
# Runs: sync → embed → weave discovery for a plexus
# Uses incremental processing (only processes changed files based on SHA)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
PLEXUS_ID=""
SKIP_SYNC=false
SKIP_EMBED=false
SKIP_WEAVES=false

# Print usage
usage() {
    echo "Usage: $0 --plexus-id <id> [options]"
    echo ""
    echo "Options:"
    echo "  --plexus-id <id>   Required. Plexus ID to process"
    echo "  --skip-sync        Skip the file sync phase"
    echo "  --skip-embed       Skip the embedding phase"
    echo "  --skip-weaves      Skip the weave discovery phase"
    echo "  --help             Show this help message"
    echo ""
    echo "Incremental Processing:"
    echo "  - Sync: Skips files with unchanged SHA"
    echo "  - Embed: Skips files where lastChunkedSha matches current SHA"
    echo "  - Embed: Only generates embeddings for chunks without embeddedAt"
    echo ""
    echo "Examples:"
    echo "  $0 --plexus-id abc123                  # Full pipeline"
    echo "  $0 --plexus-id abc123 --skip-sync      # Only embed + weave"
    echo "  $0 --plexus-id abc123 --skip-weaves    # Only sync + embed"
    exit 1
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --plexus-id)
            PLEXUS_ID="$2"
            shift 2
            ;;
        --skip-sync)
            SKIP_SYNC=true
            shift
            ;;
        --skip-embed)
            SKIP_EMBED=true
            shift
            ;;
        --skip-weaves)
            SKIP_WEAVES=true
            shift
            ;;
        --help)
            usage
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            usage
            ;;
    esac
done

# Validate required args
if [[ -z "$PLEXUS_ID" ]]; then
    echo -e "${RED}Error: --plexus-id is required${NC}"
    usage
fi

# Navigate to engine directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENGINE_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ENGINE_DIR"

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  Symploke Pipeline Runner${NC}"
echo -e "${BLUE}================================${NC}"
echo ""
echo -e "Plexus ID: ${GREEN}$PLEXUS_ID${NC}"
echo -e "Skip Sync: $SKIP_SYNC"
echo -e "Skip Embed: $SKIP_EMBED"
echo -e "Skip Weaves: $SKIP_WEAVES"
echo ""

START_TIME=$(date +%s)

# Build options for the daily command
DAILY_OPTS="--plexus-id $PLEXUS_ID"

if [[ "$SKIP_SYNC" == "true" ]]; then
    DAILY_OPTS="$DAILY_OPTS --skip-sync"
fi

if [[ "$SKIP_EMBED" == "true" ]]; then
    DAILY_OPTS="$DAILY_OPTS --skip-embed"
fi

if [[ "$SKIP_WEAVES" == "true" ]]; then
    DAILY_OPTS="$DAILY_OPTS --skip-weaves"
fi

# Run the daily command
echo -e "${YELLOW}Running pipeline...${NC}"
npx tsx src/cli/index.ts daily $DAILY_OPTS

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}  Pipeline Complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo -e "Duration: ${DURATION}s"
