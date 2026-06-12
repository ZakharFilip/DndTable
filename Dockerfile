# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
COPY packages/shared/package.json packages/shared/
COPY packages/scripts-sdk/package.json packages/scripts-sdk/

RUN npm ci

COPY . .

ARG VITE_API_BASE=
ARG VITE_SOCKET_URL=
ENV VITE_API_BASE=$VITE_API_BASE
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL

RUN npm run build

FROM node:20-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV SERVE_STATIC=true
ENV PORT=4000

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY packages/shared/package.json packages/shared/

RUN npm ci --omit=dev --workspace backend --workspace @dnd-table/shared

COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/frontend/dist ./frontend/dist

RUN mkdir -p backend/uploads/avatars

EXPOSE 4000

CMD ["npm", "start"]
