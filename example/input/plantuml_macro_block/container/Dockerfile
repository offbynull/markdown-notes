FROM alpine:3.10

# jre-headless won't work -- it fails when running plantuml (regardless of if the -Djava.awt.headless=true is present)
RUN apk add --no-cache openjdk11-jre          
# without these packages, plantuml fails with font related exception
RUN apk add --no-cache fontconfig ttf-dejavu  
# without these packages, plantuml fails on some graphs (dot required)
RUN apk add --no-cache graphviz               
# install temporarily so we can download plantuml
RUN apk add --no-cache wget                   
RUN mkdir -p /opt
WORKDIR /opt
RUN wget https://repo1.maven.org/maven2/net/sourceforge/plantuml/plantuml/1.2019.8/plantuml-1.2019.8.jar
RUN apk del --no-cache wget