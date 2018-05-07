FROM node:10.0-alpine
LABEL maintainer="Simon Scherzinger <scherzinger@entrecode.de>"

RUN mkdir -p /usr/src/app \
  && apk add --no-cache tini
WORKDIR /usr/src/app
ENTRYPOINT [ "/sbin/tini", "--" ]
CMD [ "npm", "start" ]

COPY package* ./
RUN apk add --no-cache --virtual .node-deps python make g++ \
  && npm i --only=prod && npm cache clean --force \
  && apk del .node-deps
COPY . .