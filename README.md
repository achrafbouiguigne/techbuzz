# InptPulse / TechBuzz v2 — Telemetry & Trend Analysis Platform

InptPulse / TechBuzz v2 is a real-time technology trend telemetry system and career navigator. It ingests tech-related social feeds (such as Reddit), routes them through an **Event-Driven NLP Processing Pipeline** built on Redis Streams and Python-based deep learning models, and visualizes them on an ultra-premium, dark-slate cyberpunk dashboard.

> [!IMPORTANT]
> **Complete Architecture & System Documentation**: For a detailed technical overview, UML diagrams (Sequence, Class, Use Case, Component, Deployment), database ERD, and component specifications, refer to the **[Software Project Documentation Package](docs/project_documentation.md)**.

---

## System Architecture

The project is designed as a decoupled, multi-tier microservice architecture. 

### 1. Ingestion & Enrichment Pipeline (Data Flow)

Data ingestion and analysis is entirely event-driven. Redis Streams manages inter-service events asynchronously, replacing legacy queues:

```mermaid
graph TD;
    A[Reddit API / Ingestion Scripts] -->|JSON Stream| B(events:PostCollected)
    B --> C[classifierWorker Node.js]
    C -->|IT & Tech Filter| D(events:PostFilteredAsIT)
    D --> E[nlp-worker Python]
    E -->|DeBERTa Classification & Sentiment Analysis| F(events:PostNLPEnriched)
    F --> G[persistWorker Node.js]
    G -->|Atomic Upsert| H[(MongoDB: enriched_posts)]
    F --> I[trendWorker Node.js]
    I -->|TimeSeries Aggregation| J[(TimescaleDB)]
```

### 2. Full Architecture Diagram

```mermaid
flowchart TB
    subgraph Frontend [React Frontend Client]
        ClientApp[React & Vite Client]
        ThreeJS[Universe3D: Three.js / React Force Graph]
        Charts[Sector Radar & Sentiment Oscilloscope]
    end

    subgraph Gateway [API Gateway & Backend Services]
        GQL[Apollo GraphQL Server]
        NodeWorkers[Node.js Background Workers]
        Sched[Scheduler - Job Dispatcher]
    end

    subgraph Broker [Event Streaming]
        Redis[(Redis Streams)]
    end

    subgraph Processor [NLP Microservice]
        PythonNLP[Python NLP Worker: PyTorch / DeBERTa / sentence-transformers]
    end

    subgraph Storage [Databases & Storage]
        Mongo[(MongoDB: enriched_posts)]
        Timescale[(TimescaleDB: metrics & aggregations)]
    end

    subgraph Monitor [Telemetry & Monitoring]
        Prom[Prometheus Metrics]
        Graf[Grafana Dashboards]
    end

    %% Client Interactions
    ClientApp -->|GraphQL Queries / Subscriptions| GQL
    
    %% API & Worker Interactions
    GQL -->|Read Data| Mongo
    GQL -->|Read Analytics| Timescale
    NodeWorkers -->|Publish / Consume Streams| Redis
    NodeWorkers -->|Write Enriched Data| Mongo
    NodeWorkers -->|Write Timeseries| Timescale
    
    %% NLP interactions
    PythonNLP -->|Read Filtered / Publish Enriched| Redis
    
    %% Metrics
    NodeWorkers -->|Expose Metrics| Prom
    Prom --> Graf
```

---

## Project Folder Structure

The workspace is organized into two primary project directories:

```text
benmaissa/
├── docs/
│   └── screenshots/               # Component screenshots referenced in documentation
│       ├── market_terminal.png
│       ├── post_details.png
│       ├── career_navigator.png
│       └── telemetry_grid.png
├── techbuzz-backend/              # Ingestion, Analytics and Storage Services
│   ├── docker-compose.yml         # Starts DBs, Python NLP, Grafana & Prometheus
│   ├── prometheus.yml             # Prometheus Scrape Config
│   ├── init-timescaledb/          # Database table initializations
│   ├── python-services/
│   │   └── nlp-worker/            # Python PyTorch & HuggingFace classifier service
│   │       ├── Dockerfile
│   │       └── app.py             # Pulls tasks from Redis and enriches data
│   └── backend/                   # Node.js API Gateway & Stream Workers
│       ├── src/
│       │   ├── app.js             # Main server entry (Apollo GQL + Workers)
│       │   ├── workers/           # Stream workers (classifier, persist, cache, trend)
│       │   ├── graphql/           # GraphQL TypeDefs, Schema, and Resolvers
│       │   └── services/          # Data aggregation and scheduler services
│       ├── scripts/               # DB inspector, Check AI, & seed utilities
│       └── package.json
└── techbuzz-frontend/             # React Client Application
    ├── public/
    ├── src/
    │   ├── components/            # Visual Dashboard widgets
    │   │   ├── Universe3D.jsx     # 3D interactive force graph
    │   │   ├── TechDAQTerminal.jsx# Live counters, search controls & category list
    │   │   ├── SectorRadar.jsx    # SVG metrics spiderweb chart
    │   │   ├── SentimentOscilloscope.jsx # Sentiment waves signal timeline
    │   │   ├── LocationPulseMap.jsx # Interactive geographic map
    │   │   ├── GlobalTelemetryMap.jsx # High density timeline & forecasts view
    │   │   └── UseCaseExplorer.jsx # Career navigator tab component
    │   ├── App.jsx                # Main workspace routing and query coordinator
    │   ├── App.css                # Component visual overrides and dark-mode panels
    │   └── index.css              # Typography rules and color palette variables
    ├── vite.config.js
    └── package.json
```

---

## How to Run the Project (Step-by-Step)

### Prerequisites
Make sure you have [Node.js v18+](https://nodejs.org/), [Docker Desktop](https://www.docker.com/products/docker-desktop/), and [Git](https://git-scm.com/) installed on your machine.

---

### Step 1: Start the Infrastructure Services (Docker)
Open a terminal in the `techbuzz-backend` folder and run the docker-compose command. This downloads and runs MongoDB, Redis Streams, TimescaleDB, Prometheus, Grafana, and the Python NLP service:

```bash
cd techbuzz-backend
docker compose up -d --build
```
*Verify that all containers are healthy in Docker Desktop or by checking logs:*
```bash
docker compose logs -f nlp-worker
```

---

### Step 2: Run the Node.js API & Workers
The backend repository houses the GraphQL Gateway as well as the Javascript event workers.

1. Navigate to the `backend/` directory:
   ```bash
   cd techbuzz-backend/backend
   ```
2. Install the node packages:
   ```bash
   npm install
   ```
3. Set up the environment parameters. Copy `.env.example` to `.env` (or verify that `.env` contains the default config):
   ```env
   PORT=3001
   MONGO_URI=mongodb://admin:password123@localhost:27017/techbuzz?authSource=admin
   REDIS_URL=redis://localhost:6379
   ```
4. Start the server in development mode:
   ```bash
   npm run dev
   ```
   *The server starts Apollo GraphQL at `http://localhost:3001/graphql` and launches the stream processors.*

---

### Step 3: Seed the Pipeline (Backfill Reddit Data)
Inject test documents to spin up the NLP pipeline:
```bash
cd techbuzz-backend/backend
node scripts/backfill-reddit.js
```
*This script will load raw reddit posts into the Redis Stream `events:PostCollected`. The classifier worker filters it, the Python NLP container runs sentiment analysis/classification, and the persist worker saves the output to MongoDB.*

---

### Step 4: Run the React Frontend App
Start the Vite developer client.

1. Open a new terminal in the `techbuzz-frontend` directory:
   ```bash
   cd techbuzz-frontend
   ```
2. Install packages:
   ```bash
   npm install
   ```
3. Start the dev client:
   ```bash
   npm run dev
   ```
4. Open the browser to **`http://localhost:5173/`**.

---

## Frontend Components Walkthrough

### 1. Market Terminal Dashboard
The **Market Terminal** serves as the central control room. It shows the total volume of tech datagrams processed, active node networks, a list of **Top Market Movers** matching current categories, and feeds filter filters.
* Path: [TechDAQTerminal.jsx](file:///c:/Users/hp/benmaissa/techbuzz-frontend/src/components/TechDAQTerminal.jsx)

![Market Terminal Dashboard](docs/screenshots/market_terminal.png)

---

### 2. 3D Universe Graph & Post Drawer
An interactive 3D Force Graph displaying technology hubs and social posts orbiting them. 
* Clicking a post sphere (red for negative/neutral sentiment, green for positive sentiment) opens the **Post Details Drawer** in the upper-right corner at `z-index: 100`.
* Path: [Universe3D.jsx](file:///c:/Users/hp/benmaissa/techbuzz-frontend/src/components/Universe3D.jsx) and `App.jsx`

![3D Universe Graph & Post Details](docs/screenshots/post_details.png)

---

### 3. Career Navigator
A highly focused, professional engineering interface designed with a clean, dark-slate background. It lets developers filter salary trends, job counts, and advice metrics across major sub-domains (AI, Backend, Frontend, Databases, DevOps, Security) using professional technical copy.
* Path: [UseCaseExplorer.jsx](file:///c:/Users/hp/benmaissa/techbuzz-frontend/src/components/UseCaseExplorer.jsx)

![Career Navigator](docs/screenshots/career_navigator.png)

---

### 4. Telemetry Grid
The **Telemetry Grid** offers high-density analytics including 7-Day Tech Demand Forecasting, Projection Insights, and Signal Strength charts. It highlights active topics in a clean list format on the left with a subtle highlight, white borders, and indicator dots.
* Path: [GlobalTelemetryMap.jsx](file:///c:/Users/hp/benmaissa/techbuzz-frontend/src/components/GlobalTelemetryMap.jsx)

![Telemetry Grid](docs/screenshots/telemetry_grid.png)

---

### 5. Global Telemetry Map (Geographic Pulse)
An interactive geographic map mapping tech feeds and signals across localized global regions (e.g., Canada, USA, UK, France, Germany, Morocco, India).
* Path: [LocationPulseMap.jsx](file:///c:/Users/hp/benmaissa/techbuzz-frontend/src/components/LocationPulseMap.jsx)

![Global Telemetry Map](docs/screenshots/global_telemetry_map.png)

---

### 6. Sentiment Oscilloscope
Displays real-time sentiment wave dynamics and incoming data packet counts.
* Path: [SentimentOscilloscope.jsx](file:///c:/Users/hp/benmaissa/techbuzz-frontend/src/components/SentimentOscilloscope.jsx)

![Sentiment Oscilloscope](docs/screenshots/sentiment_oscilloscope.png)

---

## Monitoring & Interfaces
* **GraphQL Gateway**: `http://localhost:3001/graphql`
* **Vite Web Client**: `http://localhost:5173/`
* **Mongo-Express (MongoDB UI)**: `http://localhost:8081/` (Login: `admin` / `password123`)
* **Prometheus Server**: `http://localhost:9090/`
* **Grafana Dashboard**: `http://localhost:3002/` (Login: `admin` / `admin123`)
