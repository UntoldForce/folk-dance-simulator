#!/bin/sh
# Writes a copy of index.html without the document wrapper lines, for publishing as a preview page.
# Usage: tools/preview.sh OUTPUT_FILE
grep -v '<!--wrap-->' "$(dirname "$0")/../index.html" > "$1"
