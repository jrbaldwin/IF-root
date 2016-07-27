FROM node:6

ENV CONFIG_ENV=development_nlp

RUN mkdir /kip

ADD . /kip

WORKDIR /kip

RUN npm install --production && ln -s ../kip.js node_modules/kip.js && ln -s ../db node_modules/db

CMD node /kip/chat/components/reply_logic.js