FROM python:3.12-bookworm

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    NODE_ENV=production \
    PORT=3000

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/* \
    && node --version && npm --version

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc gfortran pkg-config libopenblas-dev \
    && rm -rf /var/lib/apt/lists/*


COPY pipeline/requirements.txt ./pipeline/requirements.txt
RUN python3 -m venv /app/pipeline/venv \
    && /app/pipeline/venv/bin/pip install --no-cache-dir --upgrade pip \
    && /app/pipeline/venv/bin/pip install --no-cache-dir -r /app/pipeline/requirements.txt

RUN (corepack enable && corepack prepare pnpm@11.22.0 --activate) || npm install -g pnpm@11.22.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile


COPY . .
RUN mkdir -p /app/pipeline/cache \
    && pnpm build

EXPOSE 3000


CMD ["pnpm", "start"]
