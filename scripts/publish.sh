#!/bin/sh

set -e

npm profile enable-2fa auth-only

npm publish --provenance --access public

echo "✅ Publish completed"