import { WebClient } from '@slack/web-api';
import axios from 'axios';
import { pool } from './db';

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID;
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET;
const SLACK_REDIRECT_URI = process.env.SLACK_REDIRECT_URI;

// Exchanges the OAuth code for an access token and refresh token
export async function exchangeCodeForTokens(code: string) {
    const response = await axios.post('https://slack.com/api/oauth.v2.access', null, {
        params: {
            client_id: SLACK_CLIENT_ID,
            client_secret: SLACK_CLIENT_SECRET,
            code: code,
            redirect_uri: SLACK_REDIRECT_URI,
        }
    });

    if (!response.data.ok) {
        throw new Error(response.data.error || 'Slack OAuth failed');
    }
    
    const { authed_user } = response.data;

    // IMPORTANT: Use the user token (xoxp), not the bot token (xoxb)
    // The user token is required to act on behalf of the user (e.g., get their channel list).
    const userAccessToken = authed_user.access_token;
    if (!userAccessToken) {
        throw new Error('User access token not found in Slack response.');
    }

    // Note: Refresh tokens and expiration are typically associated with the user token.
    const { refresh_token, expires_in } = authed_user;

    // If expires_in is not provided, default to a long time (e.g., 12 hours) to prevent NaN error.
    const expiresInSeconds = expires_in || 43200; 
    const token_expires_at = Date.now() + expiresInSeconds * 1000;

    const query = `
        INSERT INTO users (id, access_token, refresh_token, token_expires_at, slack_user_id)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET
            access_token = EXCLUDED.access_token,
            refresh_token = EXCLUDED.refresh_token,
            token_expires_at = EXCLUDED.token_expires_at;
    `;
    
    // If refresh_token is not provided by Slack, store NULL in the database.
    const finalRefreshToken = refresh_token || null;

    await pool.query(query, [authed_user.id, userAccessToken, finalRefreshToken, token_expires_at, authed_user.id]);
    
    return { userId: authed_user.id };
}

// Gets a WebClient instance, refreshing the token if necessary
export async function getSlackWebClient(userId: string): Promise<WebClient> {
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);

    if (userResult.rowCount === 0) {
        throw new Error('User not found');
    }
    const user = userResult.rows[0];

    // Check if the token is expired or close to expiring (e.g., within 5 minutes)
    // and if a refresh token exists.
    if (user.refresh_token && Date.now() >= user.token_expires_at - 5 * 60 * 1000) {
        console.log('Access token expired, refreshing...');
        try {
            const response = await axios.post('https://slack.com/api/oauth.v2.access', null, {
                params: {
                    client_id: SLACK_CLIENT_ID,
                    client_secret: SLACK_CLIENT_SECRET,
                    grant_type: 'refresh_token',
                    refresh_token: user.refresh_token,
                }
            });

            if (!response.data.ok) {
                throw new Error(response.data.error || 'Failed to refresh token');
            }

            const { access_token, refresh_token, expires_in } = response.data;
            const new_token_expires_at = Date.now() + expires_in * 1000;

            await pool.query(
                'UPDATE users SET access_token = $1, refresh_token = $2, token_expires_at = $3 WHERE id = $4',
                [access_token, refresh_token, new_token_expires_at, userId]
            );
            
            console.log('Token refreshed successfully.');
            return new WebClient(access_token);

        } catch (error) {
            console.error('Error refreshing token:', error);
            // If refresh fails, we might need to prompt for re-authentication
            throw new Error('Could not refresh token. Please re-authenticate.');
        }
    }

    return new WebClient(user.access_token);
}
