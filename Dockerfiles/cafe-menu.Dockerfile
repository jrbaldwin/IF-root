FROM node:6
RUN mkdir /kip
WORKDIR /kip
ENV NODE_ENV=canary
ENV CONFIG_ENV=canary
ADD package.json /kip/package.json
COPY src/ /kip
RUN npm install --canary && ln -s ../kip.js node_modules/kip.js && ln -s ../db node_modules/db && ln -s ../logging.js node_modules/logging.js
EXPOSE 8001
CMD node /kip/menus/menu_server.js