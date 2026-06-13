const axios = require('axios');
const logger = require('../utils/logger');
const { getLatestTrends } = require('./redisService');
const { publisher } = require('../config/redis');

const fallbackDomains = {
  All: {
    framework: 'Fullstack Stack',
    details: 'Select a Target Country and Technology Domain to initialize the skill roadmap analyzer.'
  },
  Mobile: {
    framework: 'Flutter & Kotlin',
    details: 'Architecture trends point to high adoption of cross-platform frameworks alongside native Swift/Kotlin interfaces for core performance paths.'
  },
  Databases: {
    framework: 'PostgreSQL & Redis',
    details: 'Relational data models (PostgreSQL) form the core storage layers, paired with fast key-value caches (Redis) to support high-throughput operations.'
  },
  Frontend: {
    framework: 'React.js',
    details: 'Component-driven frontend architectures dominate corporate and startup interfaces, utilizing modular state management and advanced rendering engines.'
  },
  Backend: {
    framework: 'Node.js & Go',
    details: 'Microservice clusters rely heavily on Go for low-latency concurrency, alongside Node.js for rapid backend API prototyping and service boundaries.'
  },
  AI: {
    framework: 'Python (PyTorch / HuggingFace)',
    details: 'Deep learning frameworks (PyTorch) support model training workflows, while sentence embeddings and vector datastores power advanced semantic retrieval.'
  },
  DevOps: {
    framework: 'Kubernetes & Terraform',
    details: 'Infrastructure code (Terraform) is paired with container orchestrators (Kubernetes) to automate lifecycle deployments across distributed cloud environments.'
  },
  Security: {
    framework: 'Kali Linux & OWASP',
    details: 'Vulnerability analysis centers on OWASP Top 10 patterns, cryptographically secure identity verification (IAM), and regular cloud policy compliance audits.'
  },
  DataEng: {
    framework: 'Apache Spark & Python',
    details: 'Data engineering pipelines ingest high-volume feeds, leveraging distributed execution engines (Spark) and analytics warehouses (Snowflake).'
  },
  IoT: {
    framework: 'C++ (Arduino IDE) & MicroPython',
    details: 'Embedded engineering uses optimized low-level languages (C++) on microcontrollers, alongside MicroPython scripting for rapid hardware control loops.'
  }
};

const rules = {
  Morocco: {
    Mobile: {
      framework: 'Flutter (Dart)',
      details: 'Local product engineering in Casablanca and Rabat frequently deploys cross-platform frameworks for speed-to-market. Native modules are utilized for custom hardware integrations.'
    },
    Databases: {
      framework: 'PostgreSQL & MongoDB',
      details: 'Enterprise architectures favor PostgreSQL for transactional consistency. Startups lean toward document-oriented datastores for semi-structured product feeds.'
    },
    Backend: {
      framework: 'Spring Boot & Node.js',
      details: 'Financial and consulting systems leverage Spring Boot microservices. Newer product infrastructures lean on Node.js/Express layers.'
    },
    Frontend: {
      framework: 'React.js',
      details: 'Casablanca digital hubs and offshoring units heavily recruit for React.js engineering to support distributed application layouts.'
    }
  },
  France: {
    Mobile: {
      framework: 'React Native & Swift',
      details: 'Agencies favor cross-platform React Native codebases, while enterprise architectures deploy native Swift applications for deep platform alignment.'
    },
    Databases: {
      framework: 'MongoDB & Redis',
      details: 'MongoDB serves as the default document store for product indexes, while Redis clusters handle cache invalidation and session state.'
    },
    Backend: {
      framework: 'Symfony & Node.js',
      details: 'Modern frameworks like Nest.js and Go microservices run alongside existing PHP Symfony enterprise architectures.'
    },
    Frontend: {
      framework: 'React.js & Vue.js',
      details: 'Both React and Vue run concurrently across corporate structures, with Vue showing high localized adoption for administrative dashboards.'
    }
  },
  USA: {
    Mobile: {
      framework: 'iOS Native (Swift) & Flutter',
      details: 'US product companies prioritize native Swift engineering for main consumer touchpoints, relying on Flutter for early-stage prototype platforms.'
    },
    Databases: {
      framework: 'PostgreSQL & AWS DynamoDB',
      details: 'Data persistence relies on highly available relational databases paired with AWS serverless document stores for scalable microservices.'
    },
    Backend: {
      framework: 'Node.js (TypeScript) & Go',
      details: 'Golang handles highly concurrent data pipelines, while Node.js TypeScript defines the standard layer for developer endpoints.'
    },
    Frontend: {
      framework: 'React & Next.js (Vercel)',
      details: 'Next.js and component-based frontend systems define the architecture for modern high-performance web applications.'
    }
  }
};

const fallbackRoadmaps = {
  All: [
    { name: 'Fundamentals', type: 'fundamental', description: 'Master git, basic HTML, CSS, and Javascript' },
    { name: 'Framework selection', type: 'core', description: 'Choose a specialization: React, Node, or Flutter' },
    { name: 'Databases & APIs', type: 'advanced', description: 'Learn SQL/NoSQL databases and REST API integration' },
    { name: 'Local market fit', type: 'market', description: 'Build portfolio projects matching local job posts' }
  ],
  Mobile: [
    { name: 'Dart / Swift / Kotlin', type: 'fundamental', description: 'Learn the primary language of your chosen mobile ecosystem' },
    { name: 'Flutter / React Native', type: 'core', description: 'Master a cross-platform mobile framework' },
    { name: 'State Management', type: 'advanced', description: 'Learn production-ready architectures (Bloc, Riverpod, or Redux)' },
    { name: 'Native Plugins & CI/CD', type: 'market', description: 'Understand platform channels and App Store/Play Store deployment' }
  ],
  Databases: [
    { name: 'SQL Fundamentals', type: 'fundamental', description: 'Master relational schema design and complex SQL queries' },
    { name: 'PostgreSQL / MySQL', type: 'core', description: 'Learn indexing, clustering, and transactions in relational DBs' },
    { name: 'NoSQL & Caching (Redis)', type: 'advanced', description: 'Understand caching strategies and key-value/document stores' },
    { name: 'DB Administration & Scaling', type: 'market', description: 'Configure replication, connection pooling, and backups' }
  ],
  Frontend: [
    { name: 'HTML, CSS & modern JS', type: 'fundamental', description: 'Master DOM manipulation, CSS layouts, and ES6+' },
    { name: 'React.js / Vue.js', type: 'core', description: 'Learn component lifecycle, props, hooks, and virtual DOM' },
    { name: 'State Managers & Routing', type: 'advanced', description: 'Understand Zustand, Redux Toolkit, and react-router' },
    { name: 'Next.js & Performance', type: 'market', description: 'Master Server-Side Rendering (SSR), SSG, and SEO optimization' }
  ],
  Backend: [
    { name: 'Node.js / Java / Python', type: 'fundamental', description: 'Master backend scripting, asynchronous code, and syntax' },
    { name: 'Express / Spring Boot', type: 'core', description: 'Build web applications, middleware, routing, and controllers' },
    { name: 'Relational & Document DBs', type: 'advanced', description: 'Integrate PostgreSQL and MongoDB with ORMs/ODMs' },
    { name: 'Security & Microservices', type: 'market', description: 'Implement JWT authentication, Docker containers, and clean architecture' }
  ],
  AI: [
    { name: 'Python & NumPy / Pandas', type: 'fundamental', description: 'Learn python syntax and scientific data libraries' },
    { name: 'PyTorch / TensorFlow', type: 'core', description: 'Train simple neural networks, CNNs, and RNNs' },
    { name: 'HuggingFace & Transformers', type: 'advanced', description: 'Leverage pre-trained LLMs, fine-tuning, and tokenizers' },
    { name: 'Vector DBs & RAG systems', type: 'market', description: 'Build Retrieval-Augmented Generation applications using LangChain' }
  ],
  DevOps: [
    { name: 'Linux Command Line & Git', type: 'fundamental', description: 'Master bash scripting, file permissions, and version control' },
    { name: 'Docker Containerization', type: 'core', description: 'Package apps, write Dockerfiles, and manage compose files' },
    { name: 'Kubernetes & CI/CD', type: 'advanced', description: 'Orchestrate containers and build automated deployment pipelines' },
    { name: 'Terraform & Cloud (AWS)', type: 'market', description: 'Implement Infrastructure as Code and manage cloud resources' }
  ],
  Security: [
    { name: 'Networking & Linux Admin', type: 'fundamental', description: 'Master TCP/IP, DNS, firewall rules, and system configuration' },
    { name: 'OWASP Top 10 & PenTesting', type: 'core', description: 'Learn web vulnerabilities like XSS, SQLi, and CSRF' },
    { name: 'Cryptography & IAM', type: 'advanced', description: 'Implement SSL/TLS certificates, hashing, and token auth' },
    { name: 'SecOps & Compliance', type: 'market', description: 'Configure vulnerability scanners, SIEM tools, and audits' }
  ],
  DataEng: [
    { name: 'SQL & Python Advanced', type: 'fundamental', description: 'Write complex window queries and script data extractions' },
    { name: 'ETL Pipelines & Pandas', type: 'core', description: 'Design pipelines to extract, transform, and load data' },
    { name: 'Apache Spark & Hadoop', type: 'advanced', description: 'Understand distributed big data computing frameworks' },
    { name: 'Data Warehouses (Snowflake)', type: 'market', description: 'Store structured data for analytics and BI dashboards' }
  ],
  IoT: [
    { name: 'C / C++ & Electronics', type: 'fundamental', description: 'Learn pointer arithmetic, breadboarding, and basic circuit design' },
    { name: 'Arduino IDE & Microcontrollers', type: 'core', description: 'Program ESP32/ESP8266 boards, read analog/digital pins' },
    { name: 'Sensors & MQTT Protocols', type: 'advanced', description: 'Connect Wi-Fi, publish sensor readings, handle subscriptions' },
    { name: 'MicroPython & Edge Computing', type: 'market', description: 'Implement low-power modes and run local edge analytics' }
  ]
};

function getStaticRecommendation(country, domain) {
  const d = domain === 'All' ? 'All' : domain;
  const roadmap = fallbackRoadmaps[d] || fallbackRoadmaps.All;

  if (country === 'All' && domain === 'All') {
    return { ...fallbackDomains.All, roadmap };
  }

  const c = country;
  
  let matched = rules[c]?.[domain];
  if (matched) {
    return { ...matched, roadmap };
  }

  if (domain !== 'All') {
    const baseDetails = fallbackDomains[domain] || { framework: 'Varies', details: 'Varies' };
    if (country !== 'All') {
      return {
        framework: baseDetails.framework,
        details: `Production structures in ${c} utilize ${baseDetails.framework} extensively for ${domain} modules. Regional requirements prioritize scalable container design, system integration boundaries, and performant data layers.`,
        roadmap
      };
    }
    return { ...baseDetails, roadmap };
  }

  return {
    framework: 'Multi-stack',
    details: `Focus on mastering a core stack in ${c}. Mobile developers lean toward Flutter; web developers lean toward React.js. Combine this with backend Node.js and SQL database skills.`,
    roadmap
  };
}

function generateMockLLMResponse(country, domain, trends) {
  const trendList = trends.length > 0 
    ? trends.slice(0, 3).map(t => `'${t.keyword}'`).join(', ') 
    : "'Rust programming', 'Docker containerization'";
    
  const frameworks = {
    Mobile: 'Flutter & Kotlin',
    Frontend: 'React.js & Next.js',
    Backend: 'Node.js (TypeScript) & Go',
    Databases: 'PostgreSQL & Redis',
    AI: 'Python (PyTorch & HuggingFace)',
    DevOps: 'Kubernetes & Terraform',
    Security: 'Kali Linux & OWASP',
    DataEng: 'Apache Spark & Python',
    IoT: 'C++ (Arduino IDE) & MicroPython',
    All: 'Fullstack Stack'
  };
  
  const fw = frameworks[domain] || 'Fullstack Stack';
  
  const details = `Production environments in ${country === 'All' ? 'global clusters' : country} show consistent adoption of ${fw} architectures. High-frequency signals capture active integration paths surrounding ${trendList}. Engineering prioritizes low-latency API endpoint design, performant database index optimization, and scalable concurrency models.`;
  
  const roadmap = fallbackRoadmaps[domain] || fallbackRoadmaps.All;
  
  return {
    framework: fw,
    details,
    roadmap
  };
}

async function getAIRecommendation(country, domain) {
  const cacheKey = `ai:recommendation:${country}:${domain}`;
  
  
  try {
    const cached = await publisher.get(cacheKey);
    if (cached) {
      logger.info(`[AI Service] Cache Hit for key: ${cacheKey}`);
      return JSON.parse(cached);
    }
  } catch (cacheErr) {
    logger.warn(`[AI Service] Cache read error: ${cacheErr.message}`);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    logger.warn('[AI Service] GEMINI_API_KEY is not defined. Using static fallbacks.');
    const fallback = getStaticRecommendation(country, domain);
    return {
      framework: fallback.framework,
      details: fallback.details,
      roadmap: fallback.roadmap
    };
  }

  try {
    const trends = await getLatestTrends() || [];
    const trendKeywords = trends.map(t => `${t.keyword} (count: ${t.count}, momentum: ${t.momentum})`).slice(0, 10).join(', ');

    const prompt = `You are the TechDAQ Career Paths Advisor. Write high-quality, professional tech insights based on:
- Target Country: ${country}
- Selected Tech Domain: ${domain}
- Current Trending Keywords: ${trendKeywords || 'None'}

CONSTRAINTS FOR "details":
- NEVER use generic, low-value AI copywriting patterns (e.g., avoid: "is crucial", "is essential", "in today's digital landscape", "has a strong presence", "offers a competitive edge", "roles are strong", "seamlessly integrated", "elevate your career", "dynamics").
- Write in a dry, highly technical, and direct engineering tone. Focus only on concrete technology architecture, scaling requirements, database models, and hard engineering skills.
- Incorporate current trends where relevant without forcing them.
- Keep the description strictly under 3 sentences. Be extremely concise.

CONSTRAINTS FOR "roadmap":
- Provide a clean, logical 4-step progression to master the stack:
  1. fundamental: Core language or protocol basics.
  2. core: Framework or system layer.
  3. advanced: Production state/database/concurrency tools.
  4. market: Real-world engineering context (e.g., CI/CD, performance tuning, localized market scale).`;

    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
      {
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              framework: { type: 'STRING' },
              details: { type: 'STRING' },
              roadmap: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  properties: {
                    name: { type: 'STRING' },
                    type: { type: 'STRING' },
                    description: { type: 'STRING' }
                  },
                  required: ['name', 'type', 'description']
                }
              }
            },
            required: ['framework', 'details', 'roadmap']
          }
        }
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 20000
      }
    );

    const resultText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText) {
      throw new Error('Empty response from Gemini API');
    }

    const parsed = JSON.parse(resultText);
    const recommendation = {
      framework: parsed.framework || 'N/A',
      details: parsed.details || '',
      roadmap: parsed.roadmap || []
    };

    
    try {
      await publisher.setEx(cacheKey, 7200, JSON.stringify(recommendation));
      logger.info(`[AI Service] Cached new recommendation in Redis for key: ${cacheKey}`);
    } catch (cacheErr) {
      logger.warn(`[AI Service] Cache write error: ${cacheErr.message}`);
    }

    return recommendation;
  } catch (error) {
    if (error.response) {
      logger.error(`[AI Service] Gemini API Error: Status ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else {
      logger.error(`[AI Service] Error calling Gemini API: ${error.message}`);
    }
    
    
    const trends = await getLatestTrends() || [];
    const mockRes = generateMockLLMResponse(country, domain, trends);
    const recommendation = {
      framework: mockRes.framework,
      details: mockRes.details,
      roadmap: mockRes.roadmap
    };
    
    return recommendation;
  }
}

module.exports = { getAIRecommendation };
