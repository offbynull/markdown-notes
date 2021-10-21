NAME=`cat /input/.__UNIQUE_INPUT_ID`.svg
INPUT="$(cat /input/input.data)"

mkdir -p /tmp/work
cd /tmp/work
printf '\\documentclass{standalone}\n \\usepackage{chemfig}\n \\begin{document}\n %s\n \\end{document}' $INPUT > input.tex
latex input.tex
if [ ! $? -eq 0 ]; then
    exit 1
fi
dvisvgm input.dvi
if [ ! $? -eq 0 ]; then
    exit 1
fi
mv input-1.svg /output/$NAME
cd /
rm -rf /tmp/work

echo "![Chemfig diagram]($NAME)" > /output/output.md