FROM node:22-alpine
COPY . /app
RUN cd /app && npm install