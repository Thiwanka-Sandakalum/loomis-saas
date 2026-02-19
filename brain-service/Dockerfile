# Loomis Brain Service (Node.js + TypeScript)
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --production
COPY . .
EXPOSE 8000
EXPOSE 3000
RUN npm run build || npx tsc
CMD ["npm", "run", "api"]
