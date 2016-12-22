FROM node:6
RUN mkdir /kip
WORKDIR /kip
ADD package.json /kip/package.json
RUN npm install --production && ln -s ../kip.js node_modules/kip.js && ln -s ../db node_modules/db
COPY src/ /kip
EXPOSE 8000
CMD node /kip/chat/components/slack/slack.js