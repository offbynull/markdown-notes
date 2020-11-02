INPUT="$(cat /input/input.data)"
echo "<span class=\"SCRIPTINJECT_CLASS\">$INPUT</span>" > /output/output.md
cat /input/scriptinject_sample.css > /output/scriptinject_sample.css
cat /input/scriptinject_sample.js > /output/scriptinject_sample.js