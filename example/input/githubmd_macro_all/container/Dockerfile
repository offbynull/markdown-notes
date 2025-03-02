FROM alpine:3.21.3
WORKDIR /_macro
COPY run.sh .
RUN apk add --no-cache wget tar sed \
    && wget https://github.com/sindresorhus/github-markdown-css/archive/refs/tags/v5.8.1.tar.gz \
    && tar -xvzf v5.8.1.tar.gz \
    && sed -i -e 's/.markdown-body/body/g' github-markdown-css-5.8.1/github-markdown.css \
    && apk --no-cache del wget tar sed