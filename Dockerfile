# Shared image for the web server and the render worker. They run the same code
# and need the same media tools; docker-compose picks the command.
FROM node:22-bookworm-slim

# ffmpeg does the rendering, yt-dlp fetches sources, fonts-nanum is what the burned-in
# Korean subtitles are rendered with (libass finds nothing readable without it).
RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg \
      python3 \
      python3-pip \
      fonts-nanum \
      fonts-nanum-coding \
      ca-certificates \
      curl \
    && pip3 install --no-cache-dir --break-system-packages yt-dlp \
    && fc-cache -f \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

RUN npm run build

ENV NODE_ENV=production
ENV STORAGE_DIR=/data
VOLUME ["/data"]

EXPOSE 3000
CMD ["npm", "run", "start"]
