import { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Home from './components/Home.tsx';
import ScheduledMessages from './components/ScheduledMessages.tsx';
import Navbar from './components/Navbar.tsx';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const handleAuthFlow = async () => {
            const params = new URLSearchParams(location.search);
            const userIdFromUrl = params.get('userId');

            let userIdToCheck: string | null = null;

            if (userIdFromUrl) {
                // Case 1: Just returned from Slack OAuth
                localStorage.setItem('userId', userIdFromUrl);
                userIdToCheck = userIdFromUrl;
                // Clean the URL immediately
                navigate('/', { replace: true });
            } else {
                // Case 2: Normal page load or refresh
                userIdToCheck = localStorage.getItem('userId');
            }

            if (!userIdToCheck) {
                setIsAuthenticated(false);
                setIsLoading(false);
                return;
            }

            // Now, check the status with the determined userId
            try {
                const response = await axios.get(`${API_URL}/api/auth/status`, {
                    headers: { 'X-User-ID': userIdToCheck }
                });
                setIsAuthenticated(response.data.isAuthenticated);
            } catch (error) {
                console.error("Error checking auth status:", error);
                setIsAuthenticated(false);
                localStorage.removeItem('userId');
            } finally {
                setIsLoading(false);
            }
        };

        handleAuthFlow();
    }, [location.search, navigate]); // Depend on location.search to re-run on redirect

    const handleLogout = () => {
        localStorage.removeItem('userId');
        setIsAuthenticated(false);
        navigate('/');
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-100">
            <Navbar isAuthenticated={isAuthenticated} onLogout={handleLogout} />
            <main className="container mx-auto p-4 md:p-8">
                <Routes>
                    <Route path="/" element={<Home isAuthenticated={isAuthenticated} />} />
                    <Route path="/scheduled" element={isAuthenticated ? <ScheduledMessages /> : <Home isAuthenticated={isAuthenticated} />} />
                </Routes>
            </main>
        </div>
    );
}

export default App;