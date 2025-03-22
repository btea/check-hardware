#!/bin/sh

set -e

npm publish --provenance --access public

echo "✅ Publish completed"