import cron from 'node-cron';
import { pool } from './db';
import { getSlackWebClient } from './slack';

export function startScheduler() {
    cron.schedule('* * * * *', async () => {
        console.log('Running scheduled message check...');
        const now = Math.floor(Date.now() / 1000); 

        try {
            const messagesResult = await pool.query(
                "SELECT * FROM scheduled_messages WHERE (send_at / 1000) <= $1 AND status = 'scheduled'",
                [now]
            );

            for (const msg of messagesResult.rows) {
                try {
                    const slackClient = await getSlackWebClient(msg.user_id);
                    await slackClient.chat.postMessage({
                        channel: msg.channel_id,
                        text: msg.text,
                    });

                    console.log(`Sent scheduled message ${msg.id} to channel ${msg.channel_id}`);

                    await pool.query('UPDATE scheduled_messages SET status = $1 WHERE id = $2', ['sent', msg.id]);

                } catch (error) {
                    console.error(`Failed to send scheduled message ${msg.id}:`, error);
                    await pool.query('UPDATE scheduled_messages SET status = $1 WHERE id = $2', ['failed', msg.id]);
                }
            }
        } catch (error) {
            console.error('Error in scheduler:', error);
        }
    });
}