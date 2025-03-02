FROM alpine:3.21.3

# jre-headless won't work -- it fails when running plantuml (regardless of if the -Djava.awt.headless=true is present)
# without these packages, plantuml fails with font related exception
# without these packages, plantuml fails on some graphs (dot required)
WORKDIR /_macro
RUN apk add --no-cache openjdk11-jre fontconfig ttf-dejavu graphviz wget \
    && wget https://repo1.maven.org/maven2/net/sourceforge/plantuml/plantuml/1.2025.0/plantuml-1.2025.0.jar \
    && apk del --no-cache wget
COPY run.sh .