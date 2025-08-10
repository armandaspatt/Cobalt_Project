import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

interface ScheduledMessage {
    id: number;
    channel_id: string;
    text: string;
    send_at: number; // Unix timestamp
}

interface ScheduledMessagesProps {
    isAuthenticated: boolean;
}

const ScheduledMessages = ({ isAuthenticated }: ScheduledMessagesProps) => {
    const [messages, setMessages] = useState<ScheduledMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchScheduledMessages = async () => {
            if (isAuthenticated) {
                setIsLoading(true);
                try {
                    const userId = localStorage.getItem('userId');
                    const response = await axios.get(`${API_URL}/api/messages/scheduled`, {
                        headers: { 'X-User-ID': userId }
                    });
                    setMessages(response.data);
                } catch (err) {
                    setError('Failed to fetch scheduled messages.');
                    console.error(err);
                } finally {
                    setIsLoading(false);
                }
            }
        };

        fetchScheduledMessages();
    }, [isAuthenticated]); // <-- THE FIX: Re-run this effect when auth status changes.

    const handleCancelMessage = async (messageId: number) => {
        if (!window.confirm('Are you sure you want to cancel this scheduled message?')) {
            return;
        }
        try {
            const userId = localStorage.getItem('userId');
            await axios.delete(`${API_URL}/api/messages/scheduled/${messageId}`, {
                headers: { 'X-User-ID': userId }
            });
            // Refresh the list after cancelling by filtering the state directly
            setMessages(currentMessages => currentMessages.filter(msg => msg.id !== messageId));
        } catch (err) {
            setError('Failed to cancel the message.');
            console.error(err);
        }
    };
    
    if (isLoading) return <div className="text-center">Loading scheduled messages...</div>;
    if (error) return <div className="text-center text-red-500">{error}</div>;

    return (
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-6">Your Scheduled Messages</h2>
            {messages.length === 0 ? (
                <p>You have no messages scheduled.</p>
            ) : (
                <div className="space-y-4">
                    {messages.map(msg => (
                        <div key={msg.id} className="p-4 border rounded-md flex justify-between items-center">
                            <div>
                                <p className="font-semibold">To Channel: #{msg.channel_id}</p>
                                <p className="text-gray-600 my-2">"{msg.text}"</p>
                                <p className="text-sm text-gray-500">
                                    Scheduled for: {new Date(msg.send_at * 1000).toLocaleString()}
                                </p>
                            </div>
                            <button
                                onClick={() => handleCancelMessage(msg.id)}
                                className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded"
                            >
                                Cancel
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ScheduledMessages;