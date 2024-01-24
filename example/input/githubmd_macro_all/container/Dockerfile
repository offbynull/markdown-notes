FROM alpine:3.19.0
WORKDIR /_macro
COPY run.sh .
RUN apk add --no-cache wget tar sed \
    && wget https://github.com/sindresorhus/github-markdown-css/archive/refs/tags/v5.5.0.tar.gz \
    && tar -xvzf v5.5.0.tar.gz \
    && sed -i -e 's/.markdown-body/body/g' github-markdown-css-5.5.0/github-markdown.css \
    && apk --no-cache del wget tar sed