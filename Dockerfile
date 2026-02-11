FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install ws

# Copy application
COPY ufc-game/ ./ufc-game/

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "ufc-game/server.js"]
