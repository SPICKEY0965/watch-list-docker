FROM node:18 AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .

FROM node:18 AS runner
WORKDIR /usr/src/app
COPY --from=builder /usr/src/app ./
ENV NODE_ENV production
EXPOSE 5000
CMD ["npm", "start"]
