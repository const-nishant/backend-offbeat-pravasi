FROM node:20-alpine as base
WORKDIR /app
# Copy package files first for better caching
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

