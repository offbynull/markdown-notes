svgoutputfile=`cat /input/.__UNIQUE_INPUT_ID`.svg

/rust/bin/svgbob < /input/input.data > /output/$svgoutputfile.svg
echo "![Kroki diagram output]($svgoutputfile.svg)" > /output/output.md