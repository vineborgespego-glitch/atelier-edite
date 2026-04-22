# Use node 20
FROM node:20-slim AS base

# Install openssl for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Create uploads directory
RUN mkdir -p uploads

# Railway uses PORT env var (defaults to 80)
ENV PORT=80
EXPOSE 80

# Starting command
CMD ["npm", "start"]
