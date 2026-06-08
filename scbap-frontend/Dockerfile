FROM node:20-alpine AS build
WORKDIR /app
ARG VITE_API_URL
ARG VITE_SURVEILLANCE_WS_URL
ARG VITE_APP_TIME_ZONE=UTC
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SURVEILLANCE_WS_URL=$VITE_SURVEILLANCE_WS_URL
ENV VITE_APP_TIME_ZONE=$VITE_APP_TIME_ZONE
COPY package*.json ./
RUN npm config set fetch-retries 5 \
  && npm config set fetch-retry-mintimeout 20000 \
  && npm config set fetch-retry-maxtimeout 120000 \
  && npm config set fetch-timeout 600000 \
  && npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runner
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
