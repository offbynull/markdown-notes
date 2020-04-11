NAME=puml_$(md5sum < /input/input.data | cut -d " " -f1).svg
java -Djava.awt.headless=true -jar /opt/plantuml-1.2019.8.jar -tsvg -pipe < /input/input.data > /output/$NAME
if [ ! $? -eq 0 ]; then
    exit 1
fi
echo "![PlantUML diagram]($NAME)" > /output/output.md