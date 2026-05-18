FROM node:22-alpine AS base
WORKDIR /app
RUN npm install -g pnpm
RUN pnpm config set ignore-scripts false


FROM base AS backend-build

ENV CI=true
ENV NODE_ENV=development

COPY shared  /app/shared
COPY backend /app/backend

WORKDIR /app/shared
RUN pnpm install --no-frozen-lockfile --reporter=silent

WORKDIR /app/backend
RUN pnpm install --no-frozen-lockfile --reporter=silent
RUN pnpm build


FROM base AS frontend-build

ENV CI=true
ENV NODE_ENV=development
ENV VITE_API_BASE_URL=/api

COPY shared   /app/shared
COPY frontend /app/frontend

WORKDIR /app/shared
RUN pnpm install --no-frozen-lockfile --reporter=silent

WORKDIR /app/frontend
RUN pnpm install --no-frozen-lockfile --reporter=silent
RUN pnpm build

# runtime
FROM node:22-alpine AS runtime

RUN apk add --no-cache nginx

COPY shared                                          /app/shared
COPY backend/package.json                            /app/backend/
COPY backend/tsconfig.json                           /app/backend/
COPY --from=backend-build /app/backend/node_modules /app/backend/node_modules
COPY --from=backend-build /app/backend/dist         /app/backend/dist
COPY --from=frontend-build /app/frontend/dist       /usr/share/nginx/html
COPY nginx/reverseproxy.conf                         /etc/nginx/http.d/default.conf

EXPOSE 80
CMD ["sh", "-c", "node /app/backend/dist/backend/src/index.js & nginx -g 'daemon off;'"]