// ============================================================================
// InptPulse v2 — Script de remise à zéro complète
// ============================================================================
//
// USAGE :
//   node scripts/reset-db.js              # mode confirmation interactive
//   node scripts/reset-db.js --force      # sans confirmation (CI / scripts)
//
// CE QUE FAIT LE SCRIPT :
//   1. Drop la base MongoDB (toutes collections : enriched_posts, etc.)
//   2. Drop & recrée les tables TimescaleDB (trend_snapshots, predictions)
//      via le schema.sql
//   3. Flush Redis (streams, DLQ, cache, topic_registry, BullMQ jobs,
//      compteurs d'idempotence)
//
// ⚠️ DESTRUCTIF — toutes les données sont perdues.
// ============================================================================

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const mongoose = require('mongoose');
const { Client: PgClient } = require('pg');
const Redis = require('ioredis');

// ----------------------------------------------------------------------------
// Configuration depuis l'env
// ----------------------------------------------------------------------------

const CONFIG = {
    mongo: {
        uri: process.env.MONGO_URI || 'mongodb://localhost:27017',
        db:  process.env.MONGO_DB  || 'inptpulse'
    },
    postgres: {
        host:     process.env.POSTGRES_HOST     || 'localhost',
        port:     parseInt(process.env.POSTGRES_PORT, 10) || 5432,
        database: process.env.POSTGRES_DB       || 'inptpulse',
        user:     process.env.POSTGRES_USER     || 'inptpulse',
        password: process.env.POSTGRES_PASSWORD || ''
    },
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT, 10) || 6379
    },
    schemaSqlPath: path.resolve(__dirname, '../../../init-timescaledb/schema.sql')
};

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

const log = {
    info:  (msg) => console.log(`\x1b[36m[reset-db]\x1b[0m ${msg}`),
    ok:    (msg) => console.log(`\x1b[32m[reset-db]\x1b[0m ✓ ${msg}`),
    warn:  (msg) => console.log(`\x1b[33m[reset-db]\x1b[0m ⚠ ${msg}`),
    error: (msg) => console.error(`\x1b[31m[reset-db]\x1b[0m ✗ ${msg}`)
};

function confirm(question) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.trim().toLowerCase());
        });
    });
}

// ----------------------------------------------------------------------------
// MongoDB — drop complet de la base
// ----------------------------------------------------------------------------

async function resetMongo() {
    log.info(`MongoDB : connexion à ${CONFIG.mongo.uri} (base: ${CONFIG.mongo.db})`);
    await mongoose.connect(CONFIG.mongo.uri, { dbName: CONFIG.mongo.db });
    const before = await mongoose.connection.db.listCollections().toArray();
    log.info(`MongoDB : ${before.length} collection(s) trouvée(s) avant reset`);

    await mongoose.connection.db.dropDatabase();
    log.ok(`MongoDB : base "${CONFIG.mongo.db}" droppée`);

    // Reconnecte et crée la collection avec ses index en chargeant le modèle
    // (Mongoose crée les index au premier accès si on lui demande)
    const EnrichedPost = require('../models/EnrichedPost');
    await EnrichedPost.createCollection();
    await EnrichedPost.syncIndexes();
    log.ok(`MongoDB : collection enriched_posts recréée avec ses index`);

    await mongoose.disconnect();
}

// ----------------------------------------------------------------------------
// TimescaleDB — drop + recréation via schema.sql
// ----------------------------------------------------------------------------

async function resetTimescaleDB() {
    log.info(`TimescaleDB : connexion à ${CONFIG.postgres.host}:${CONFIG.postgres.port}/${CONFIG.postgres.database}`);

    const client = new PgClient(CONFIG.postgres);
    await client.connect();

    // Le schema.sql contient déjà les DROP TABLE IF EXISTS, donc il est
    // idempotent. On l'exécute tel quel.
    if (!fs.existsSync(CONFIG.schemaSqlPath)) {
        throw new Error(`Schema SQL introuvable : ${CONFIG.schemaSqlPath}`);
    }
    const sql = fs.readFileSync(CONFIG.schemaSqlPath, 'utf8');
    log.info(`TimescaleDB : exécution de schema.sql (${sql.length} caractères)`);

    await client.query(sql);
    log.ok(`TimescaleDB : tables trend_snapshots et predictions recréées`);

    // Vérification rapide
    const { rows } = await client.query(`
        SELECT hypertable_name
        FROM timescaledb_information.hypertables
        WHERE hypertable_schema = 'public'
        ORDER BY hypertable_name
    `);
    log.ok(`TimescaleDB : hypertables actives = [${rows.map(r => r.hypertable_name).join(', ')}]`);

    await client.end();
}

// ----------------------------------------------------------------------------
// Redis — flush total (streams, DLQ, cache, BullMQ, idempotence)
// ----------------------------------------------------------------------------

async function resetRedis() {
    log.info(`Redis : connexion à ${CONFIG.redis.host}:${CONFIG.redis.port}`);

    const redis = new Redis(CONFIG.redis);

    const beforeSize = await redis.dbsize();
    log.info(`Redis : ${beforeSize} clés présentes avant flush`);

    await redis.flushdb();
    log.ok(`Redis : FLUSHDB exécuté (toutes clés effacées)`);

    const afterSize = await redis.dbsize();
    log.ok(`Redis : ${afterSize} clés après flush (devrait être 0)`);

    await redis.quit();
}

// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------

async function main() {
    const force = process.argv.includes('--force');

    log.warn('═══════════════════════════════════════════════════════════════');
    log.warn('  RESET COMPLET DE LA BASE InptPulse v2');
    log.warn('  Ce script va EFFACER :');
    log.warn(`    • MongoDB     : base "${CONFIG.mongo.db}" entière`);
    log.warn(`    • TimescaleDB : tables trend_snapshots, predictions`);
    log.warn(`    • Redis       : TOUTES les clés (streams, cache, BullMQ...)`);
    log.warn('═══════════════════════════════════════════════════════════════');

    if (!force) {
        const answer = await confirm('Tape "RESET" pour confirmer : ');
        if (answer !== 'reset') {
            log.error('Annulé.');
            process.exit(1);
        }
    } else {
        log.warn('Mode --force : pas de confirmation demandée.');
    }

    const start = Date.now();

    try {
        await resetMongo();
        await resetTimescaleDB();
        await resetRedis();

        const elapsed = ((Date.now() - start) / 1000).toFixed(2);
        log.ok(`═══════════════════════════════════════════════════════════════`);
        log.ok(`  RESET TERMINÉ en ${elapsed}s. Base prête pour la v2.`);
        log.ok(`═══════════════════════════════════════════════════════════════`);
    } catch (err) {
        log.error(`Échec du reset : ${err.message}`);
        console.error(err);
        process.exit(1);
    }
}

main();