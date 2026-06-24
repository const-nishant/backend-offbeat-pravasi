FROM node:22.22.1 as base
WORKDIR /app
COPY package*.json ./
RUN npm install

FROM base as dev
COPY . .
RUN npm run build
ENV NODE_ENV=development
ENV PATH="/app/node_modules/.bin:$PATH"
EXPOSE 4000
CMD ["node", "dist/main"]

FROM base as prod
COPY . .
RUN npm run build
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "dist/main"]

