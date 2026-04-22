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

# Railway/Easypanel fallback ports
ENV PORT=80
EXPOSE 80 3000 3001 8080

# Starting command (Direct node for faster startup and better signal handling)
CMD ["node", "dist/server.js"]
