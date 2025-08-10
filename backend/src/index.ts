import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import https from 'https';
import http from 'http'; // Import the http module
import fs from 'fs';
import path from 'path';
import { exchangeCodeForTokens, getSlackWebClient } from './slack';
import { pool, initializeDb } from './db';
import { startScheduler } from './scheduler';

const app = express();
const PORT = process.env.PORT || 8080;

// --- UPDATED CORS CONFIGURATION ---
const corsOptions = {
  origin: process.env.FRONTEND_URL,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true, // Allow cookies to be sent
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
// ------------------------------------

app.use(express.json());

// ... (all your API routes remain the same) ...
// --- OAuth Routes ---
app.get('/auth/slack', (req, res) => {
    const botScopes = ['chat:write', 'channels:read', 'groups:read', 'mpim:read', 'im:read', 'users:read'].join(' ');
    const userScopes = ['chat:write', 'channels:read', 'groups:read', 'im:read', 'mpim:read'].join(',');
    const url = `https://slack.com/oauth/v2/authorize?client_id=${process.env.SLACK_CLIENT_ID}&scope=${botScopes}&user_scope=${userScopes}&redirect_uri=${process.env.SLACK_REDIRECT_URI}`;
    res.redirect(url);
});
app.get('/auth/slack/callback', async (req, res) => {
    const { code } = req.query;
    if (!code || typeof code !== 'string') return res.status(400).send('Invalid code');
    try {
        const { userId } = await exchangeCodeForTokens(code as string);
        res.redirect(`${process.env.FRONTEND_URL}/?userId=${userId}`);
    } catch (error) {
        console.error('OAuth callback error:', error);
        res.status(500).send('Authentication failed');
    }
});
// --- API Routes ---
app.get('/api/auth/status', async (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.json({ isAuthenticated: false });
    const result = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
    res.json({ isAuthenticated: (result.rowCount ?? 0) > 0 });
});
app.get('/api/channels', async (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).send('User ID required');
    try {
        const slackClient = await getSlackWebClient(userId);
        const result = await slackClient.users.conversations({ types: 'public_channel,private_channel,mpim,im' });
        res.json(result.channels);
    } catch (error: any) {
        if (error.data) {
            console.error('Slack API Error fetching channels:', error.data);
            res.status(500).send(`Failed to fetch channels: ${error.data.error}`);
        } else {
            console.error('Generic Error fetching channels:', error);
            res.status(500).send('Failed to fetch channels');
        }
    }
});
app.post('/api/messages/send', async (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).send('User ID required');
    const { channelId, text } = req.body;
    if (!channelId || !text) return res.status(400).send('Channel ID and text are required');
    try {
        const slackClient = await getSlackWebClient(userId);
        await slackClient.chat.postMessage({ channel: channelId, text });
        res.status(200).send('Message sent');
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).send('Failed to send message');
    }
});
app.post('/api/messages/schedule', async (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).send('User ID required');
    const { channelId, text, sendAt } = req.body;
    if (!channelId || !text || !sendAt) return res.status(400).send('Channel ID, text, and sendAt timestamp are required');
    try {
        const sendAtMs = sendAt * 1000;
        await pool.query('INSERT INTO scheduled_messages (user_id, channel_id, text, send_at) VALUES ($1, $2, $3, $4)', [userId, channelId, text, sendAtMs]);
        res.status(201).send('Message scheduled');
    } catch (error) {
        console.error('Error scheduling message:', error);
        res.status(500).send('Failed to schedule message');
    }
});
app.get('/api/messages/scheduled', async (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).send('User ID required');
    try {
        const result = await pool.query("SELECT id, channel_id, text, send_at FROM scheduled_messages WHERE user_id = $1 AND status = 'scheduled' ORDER BY send_at ASC", [userId]);
        const messages = result.rows.map(msg => ({ ...msg, send_at: Math.floor(msg.send_at / 1000) }));
        res.json(messages);
    } catch (error) {
        console.error('Error fetching scheduled messages:', error);
        res.status(500).send('Failed to fetch scheduled messages');
    }
});
app.delete('/api/messages/scheduled/:id', async (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).send('User ID required');
    const { id } = req.params;
    try {
        const result = await pool.query("DELETE FROM scheduled_messages WHERE id = $1 AND user_id = $2", [id, userId]);
        if (result.rowCount === 0) return res.status(404).send('Message not found or you do not have permission to delete it.');
        res.status(200).send('Scheduled message cancelled');
    } catch (error) {
        console.error('Error cancelling message:', error);
        res.status(500).send('Failed to cancel message');
    }
});

// Start the server
const startServer = async () => {
    try {
        await initializeDb();

        // Use HTTPS for local development, HTTP for production
        if (process.env.NODE_ENV === 'production') {
            http.createServer(app).listen(PORT, () => {
                console.log(`Backend server running on http://localhost:${PORT}`);
                startScheduler();
            });
        } else {
            const httpsOptions = {
                key: fs.readFileSync(path.join(__dirname, '..', 'key.pem')),
                cert: fs.readFileSync(path.join(__dirname, '..', 'cert.pem'))
            };
            https.createServer(httpsOptions, app).listen(PORT, () => {
                console.log(`Backend server running on https://localhost:${PORT}`);
                startScheduler();
            });
        }

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();