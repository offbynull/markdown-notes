svgoutputfile="svgbob_$(sha1sum /input/input.data | cut -d ' ' -f1)"

/rust/bin/svgbob < /input/input.data > /output/$svgoutputfile.svg
echo "![Kroki diagram output]($svgoutputfile.svg)" > /output/output.md