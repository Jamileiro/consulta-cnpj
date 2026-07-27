#!/usr/bin/env python3
"""Fix app.py - removes HTML entities from the file."""
import os

app_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'app.py')
with open(app_path, 'r', encoding='utf-8') as f:
    content = f.read()

# The issue: HTML entities " < > &#x27; got into the file
# Replace them back (only the ones that broke the syntax)
content = content.replace('"', '"')
content = content.replace('<', '<')
content = content.replace('>', '>')
content = content.replace('&#x27;', "'")

with open(app_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed!")

