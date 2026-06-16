"""Wrapper to run ingest_openalex --only-none with output flushed to stdout."""
import sys
sys.argv.append('--only-none')
from app.core.ingest_openalex import main
main()
