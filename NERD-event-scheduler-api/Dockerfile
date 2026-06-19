FROM node:lts-alpine

WORKDIR /app

# Install production dependencies first for better layer caching.
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the application source.
COPY src ./src

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Run as the unprivileged user that ships with the base image.
USER node

CMD ["node", "src/server.js"]
