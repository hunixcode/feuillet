#!/usr/bin/env sh
# Usage : ./generer.sh chemin/vers/plantuml.jar
set -e
cd "$(dirname "$0")"
java -jar "${1:-plantuml.jar}" -tsvg -o .. src/*.puml
sed -i.bak 's/font-family="DejaVu Sans"/font-family="DejaVu Sans, Verdana, sans-serif"/g' *.svg && rm -f *.svg.bak
