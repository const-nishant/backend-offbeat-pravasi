FROM node:22.22.1-alpine as base
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci

FROM base as dev
ENV NODE_ENV=development
# Source code will be mounted as volume in docker-compose for hot-reload
# Ensure node_modules/.bin is in PATH
ENV PATH="/app/node_modules/.bin:$PATH"
EXPOSE 4000
# Command will be overridden by docker-compose to install deps first
CMD ["npm","run","start:dev"]

FROM base as prod
RUN npm run build
ENV NODE_ENV=production
EXPOSE 4000
CMD ["npm","run","start:prod"]

