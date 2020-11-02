INPUT="$(cat /input/input.data)"
echo "<span class=\"SCRIPTINJECT_CLASS\">$INPUT</span>" > /output/output.md
cp /input/scriptinject_sample.css /output/scriptinject_sample.css
cp /input/scriptinject_sample.js /output/scriptinject_sample.js
echo "[ [\"scriptinject_sample.css\", \"css\"], [\"scriptinject_sample.js\", \"js\"] ]" > /output/output.injects