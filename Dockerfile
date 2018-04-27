FROM node:8.11
LABEL maintainer="Simon Scherzinger <scherzinger@entrecode.de>"

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package* /usr/src/app/
RUN npm i --only=prod && npm cache clean --force
COPY . /usr/src/app

CMD [ "npm", "start" ]