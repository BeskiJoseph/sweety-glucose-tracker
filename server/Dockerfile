FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application code
COPY . .

# Expose API port
EXPOSE 5000

# Run migrations, seeds, then start server
CMD ["sh", "-c", "npm run migrate && npm run seed && npm start"]
