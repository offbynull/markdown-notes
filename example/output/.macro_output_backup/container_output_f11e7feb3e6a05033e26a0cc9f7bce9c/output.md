<div style="margin:2em; background-color: #e0e0e0;">

<strong>⚠️NOTE️️️⚠️</strong>

You can streamline the generation of `/output/[RANDOM_DIR]` via the shell -- for example:

```bash
rand=$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 13)
# Script should write markdown to /output/output.md
# Script should write markdown resources to /output/$rand/ but reference them
#   in markdown as $rand/ (e.g. output to /output/$rand/out.png but reference
#   in output.md as $rand/out.png).
mkdir /output/$rand
npm start -- $rand
```
</div>

