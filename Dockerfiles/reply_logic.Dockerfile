FROM node:7
RUN mkdir /kip
WORKDIR /kip
ENV NODE_ENV=kubernetes
ENV CONFIG_ENV=kubernetes
ADD package.json /kip/package.json
RUN npm install -g yarn && yarn
COPY src/ /kip
CMD node /kip/chat/components/reply_logic.js
