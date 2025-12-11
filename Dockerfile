# 1. Image Node
FROM node:20-alpine

# 2. Cài pnpm
RUN npm install -g pnpm

# 3. Tạo thư mục app
WORKDIR /app

# 4. Copy file lock + package
COPY package.json pnpm-lock.yaml ./

# 5. Install dependencies
RUN pnpm install

# 6. Copy toàn project
COPY . .

# 7. Build Next.js
RUN pnpm build

# 8. Start
EXPOSE 3000
CMD ["pnpm", "start"]
