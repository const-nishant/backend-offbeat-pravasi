FROM node:20-alpine as base
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

FROM base as dev
ENV NODE_ENV=development
EXPOSE 4000
CMD ["npm","run","start:dev"]

FROM base as prod
RUN npm run build
ENV NODE_ENV=production
EXPOSE 4000
CMD ["npm","run","start:prod"]

