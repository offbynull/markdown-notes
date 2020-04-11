NAME=dot_$(md5sum < /input/input.data | cut -d " " -f1).svg
dot -Tsvg /input/input.data > /output/$NAME
echo "![Dot diagram]($NAME)" > /output/output.md