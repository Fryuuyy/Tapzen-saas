FROM node:20-alpine

WORKDIR /app

# Install workspace dependencies first for Docker layer caching.
COPY package.json ./package.json
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
RUN npm install

# Copy the complete monorepo and generate the Prisma client.
COPY . .
RUN npm run prisma:generate -w @tapzen/api
RUN npm run build -w @tapzen/api

ENV NODE_ENV=production
EXPOSE 4000

# Apply committed migrations before starting the API.
CMD ["sh", "-c", "npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma && npm run start -w @tapzen/api"]
