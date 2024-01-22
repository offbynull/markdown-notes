NAME=`cat /input/.__UNIQUE_INPUT_ID`.svg
dot -Tsvg /input/input.data > /output/$NAME
echo "![Dot diagram]($NAME)" > /output/output.md

