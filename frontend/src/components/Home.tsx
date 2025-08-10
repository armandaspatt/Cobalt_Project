// frontend/src/components/Home.tsx

import { useState, useEffect, FormEvent } from 'react';
import axios from 'axios';

// Get the API URL from environment variables.
// Vite uses `import.meta.env.VITE_...`
const API_URL = import.meta.env.VITE_API_URL || '';

interface HomeProps {
    isAuthenticated: boolean;
}

interface SlackChannel {
    id: string;
    name: string;
}

const Home = ({ isAuthenticated }: HomeProps) => {
    const [channels, setChannels] = useState<SlackChannel[]>([]);
    const [selectedChannel, setSelectedChannel] = useState('');
    const [message, setMessage] = useState('');
    const [scheduleDateTime, setScheduleDateTime] = useState('');
    const [status, setStatus] = useState({ message: '', type: '' });

    useEffect(() => {
        const fetchChannels = async () => {
            if (isAuthenticated) {
                try {
                    const userId = localStorage.getItem('userId');
                    const response = await axios.get<SlackChannel[]>(`${API_URL}/api/channels`, {
                        headers: { 'X-User-ID': userId }
                    });
                    setChannels(response.data);
                    if (response.data && response.data.length > 0) {
                        setSelectedChannel(response.data[0].id);
                    }
                } catch (error) {
                    console.error('Failed to fetch channels:', error);
                    setStatus({ message: 'Failed to fetch channels.', type: 'error' });
                }
            }
        };
        fetchChannels();
    }, [isAuthenticated]);
    
    const handleSendMessage = async (e: FormEvent) => {
        e.preventDefault();
        if (!selectedChannel || !message) {
            setStatus({ message: 'Please select a channel and write a message.', type: 'error' });
            return;
        }

        const userId = localStorage.getItem('userId');
        const endpoint = scheduleDateTime ? '/api/messages/schedule' : '/api/messages/send';
        
        const payload: any = {
            channelId: selectedChannel,
            text: message,
        };

        if (scheduleDateTime) {
            payload.sendAt = Math.floor(new Date(scheduleDateTime).getTime() / 1000);
        }

        try {
            await axios.post(`${API_URL}${endpoint}`, payload, {
                headers: { 'X-User-ID': userId }
            });
            setStatus({ message: `Message ${scheduleDateTime ? 'scheduled' : 'sent'} successfully!`, type: 'success' });
            setMessage('');
            setScheduleDateTime('');
        } catch (error) {
            console.error('Failed to send message:', error);
            setStatus({ message: 'Failed to send message.', type: 'error' });
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="text-center p-10 bg-white rounded-lg shadow-lg">
                <h1 className="text-3xl font-bold mb-4">Welcome to Slack Connect</h1>
                <p className="mb-6">Connect your Slack workspace to send and schedule messages.</p>
                <a href={`${API_URL}/auth/slack`} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                    Connect to Slack
                </a>
            </div>
        );
    }

    return (
        // ... (rest of the component is the same)
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-6">Send a Message</h2>
            {status.message && (<div className={`p-3 mb-4 rounded ${status.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{status.message}</div>)}
            <form onSubmit={handleSendMessage}>
                <div className="mb-4">
                    <label htmlFor="channel" className="block text-gray-700 font-bold mb-2">Channel</label>
                    <select id="channel" value={selectedChannel} onChange={(e) => setSelectedChannel(e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline">
                        {channels.map(channel => (<option key={channel.id} value={channel.id}>#{channel.name}</option>))}
                    </select>
                </div>
                <div className="mb-4">
                    <label htmlFor="message" className="block text-gray-700 font-bold mb-2">Message</label>
                    <textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline h-32" placeholder="What do you want to say?"></textarea>
                </div>
                <div className="mb-6">
                    <label htmlFor="schedule" className="block text-gray-700 font-bold mb-2">Schedule (Optional)</label>
                    <input type="datetime-local" id="schedule" value={scheduleDateTime} onChange={(e) => setScheduleDateTime(e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
                </div>
                <div className="flex items-center justify-between">
                    <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
                        {scheduleDateTime ? 'Schedule Message' : 'Send Now'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Home;