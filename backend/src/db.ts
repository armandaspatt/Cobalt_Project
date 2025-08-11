import { Pool } from 'pg';
import 'dotenv/config';


export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

export async function initializeDb() {
    const client = await pool.connect();
    try {
        await client.query(`DROP TABLE IF EXISTS scheduled_messages;`);
        await client.query(`DROP TABLE IF EXISTS users;`);

        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                access_token TEXT NOT NULL,
                refresh_token TEXT, -- Changed to allow NULL
                token_expires_at BIGINT NOT NULL,
                slack_user_id TEXT NOT NULL
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS scheduled_messages (
                id SERIAL PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                channel_id TEXT NOT NULL,
                text TEXT NOT NULL,
                send_at BIGINT NOT NULL,
                status TEXT DEFAULT 'scheduled'
            );
        `);
        console.log('Database tables are ready.');
    } catch (err) {
        console.error('Error initializing database', err);
        throw err;
    } finally {
        client.release();
    }
}