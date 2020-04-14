FROM ubuntu:19.04
ARG DEBIAN_FRONTEND=noninteractive
RUN apt -y -qq update && apt-get -y -qq install texlive-base texlive-latex-extra
RUN rm -rf /var/lib/apt/lists/*