import { MongoClient, ServerApiVersion, Db } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI || "";
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

let db: Db;

export async function initDb() {
    try {
        await client.connect();
        db = client.db("loomis");
        console.log("Connected to MongoDB Atlas!");

        // Seed data if collections are empty
        await seedCollections();
    } catch (error) {
        console.error("Failed to connect to MongoDB:", error);
        process.exit(1);
    }
}

async function seedCollections() {
    const knowledgeBase = db.collection('knowledge_base');
    const kbCount = await knowledgeBase.countDocuments();
    if (kbCount === 0) {
        await knowledgeBase.insertMany([
            { topic: 'Services', content: 'We offer Standard, Express, and Overnight delivery services.' },
            { topic: 'Pricing', content: 'Pricing is based on weight and distance. See courier_rates for details.' },
            { topic: 'Schedules', content: 'Standard: 3-5 days, Express: 1-2 days, Overnight: Next day.' },
        ]);
        console.log('Seeded knowledge_base');
    }

    const courierRates = db.collection('courier_rates');
    const ratesCount = await courierRates.countDocuments();
    if (ratesCount === 0) {
        await courierRates.insertMany([
            { service_type: 'Standard', weight_range: '0-5kg', base_rate: 10.0, additional_kg: 2.0 },
            { service_type: 'Express', weight_range: '0-5kg', base_rate: 25.0, additional_kg: 5.0 },
            { service_type: 'Overnight', weight_range: '0-5kg', base_rate: 50.0, additional_kg: 10.0 },
        ]);
        console.log('Seeded courier_rates');
    }

    const packageTypes = db.collection('package_types');
    const packageCount = await packageTypes.countDocuments();
    if (packageCount === 0) {
        await packageTypes.insertMany([
            { name: 'A4 Envelope', length: 32, width: 24, height: 1 },
            { name: 'One or two books', length: 23, width: 14, height: 4 },
            { name: 'Shoe box', length: 35, width: 20, height: 15 },
            { name: 'Moving box', length: 75, width: 35, height: 35 },
        ]);
        console.log('Seeded package_types');
    }
}


export function getDb(): Db {
    if (!db) {
        throw new Error("Database not initialized. Call initDb() first.");
    }
    return db;
}
