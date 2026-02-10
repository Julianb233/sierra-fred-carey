FROM node:22-slim

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy only what the worker needs
COPY workers/voice-agent/ ./workers/voice-agent/
COPY lib/fred-brain.ts ./lib/fred-brain.ts

# The @livekit/agents CLI handles the process lifecycle
CMD ["npx", "tsx", "workers/voice-agent/index.ts", "start"]
