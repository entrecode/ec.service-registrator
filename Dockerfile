FROM node:10.0
LABEL maintainer="Simon Scherzinger <scherzinger@entrecode.de>"

RUN mkdir -p /usr/src/app \
  && apk add --no-cache tini
WORKDIR /usr/src/app
ENTRYPOINT [ "/sbin/tini", "--" ]
CMD [ "npm", "start" ]

COPY package* /usr/src/app/
RUN npm i --only=prod && npm cache clean --force
COPY . /usr/src/app
