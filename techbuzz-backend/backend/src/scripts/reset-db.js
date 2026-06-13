

















require('dotenv').config();

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const mongoose = require('mongoose');
const { Client: PgClient } = require('pg');
const Redis = require('ioredis');





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





async function resetMongo() {
    log.info(`MongoDB : connexion à ${CONFIG.mongo.uri} (base: ${CONFIG.mongo.db})`);
    await mongoose.connect(CONFIG.mongo.uri, { dbName: CONFIG.mongo.db });
    const before = await mongoose.connection.db.listCollections().toArray();
    log.info(`MongoDB : ${before.length} collection(s) trouvée(s) avant reset`);

    await mongoose.connection.db.dropDatabase();
    log.ok(`MongoDB : base "${CONFIG.mongo.db}" droppée`);

    
    
    const EnrichedPost = require('../models/EnrichedPost');
    await EnrichedPost.createCollection();
    await EnrichedPost.syncIndexes();
    log.ok(`MongoDB : collection enriched_posts recréée avec ses index`);

    await mongoose.disconnect();
}





async function resetTimescaleDB() {
    log.info(`TimescaleDB : connexion à ${CONFIG.postgres.host}:${CONFIG.postgres.port}/${CONFIG.postgres.database}`);

    const client = new PgClient(CONFIG.postgres);
    await client.connect();

    
    
    if (!fs.existsSync(CONFIG.schemaSqlPath)) {
        throw new Error(`Schema SQL introuvable : ${CONFIG.schemaSqlPath}`);
    }
    const sql = fs.readFileSync(CONFIG.schemaSqlPath, 'utf8');
    log.info(`TimescaleDB : exécution de schema.sql (${sql.length} caractères)`);

    await client.query(sql);
    log.ok(`TimescaleDB : tables trend_snapshots et predictions recréées`);

    
    const { rows } = await client.query(`
        SELECT hypertable_name
        FROM timescaledb_information.hypertables
        WHERE hypertable_schema = 'public'
        ORDER BY hypertable_name
    `);
    log.ok(`TimescaleDB : hypertables actives = [${rows.map(r => r.hypertable_name).join(', ')}]`);

    await client.end();
}





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