# Stage 1: Build React PWA
FROM node:20-alpine as build

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Build-time arguments for Vite (must be declared before COPY to be available at build time)
ARG VITE_API_URL
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Force cache invalidation to ensure fresh build (increment on each deploy)
ARG CACHEBUST=2
RUN echo "Rebuilding with cache bust: $CACHEBUST"

# Copy source and build
COPY . .
RUN npx vite build

# Stage 2: Serve with Nginx for EasyPanel
FROM nginx:alpine

# Copy custom nginx config to handle SPA routing correctly
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
    error_page 500 502 503 504 /50x.html; \
    location = /50x.html { \
        root /usr/share/nginx/html; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Copy build artifacts to nginx
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
