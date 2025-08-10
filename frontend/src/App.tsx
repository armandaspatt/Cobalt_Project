import { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Home from './components/Home.tsx';
import ScheduledMessages from './components/ScheduledMessages.tsx';
import Navbar from './components/Navbar.tsx';
import axios from 'axios';

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const userIdFromUrl = params.get('userId');

        if (userIdFromUrl) {
            localStorage.setItem('userId', userIdFromUrl);
            // Clean the URL by removing the query parameter
            navigate('/', { replace: true });
        }
    }, [location, navigate]);

    useEffect(() => {
        const checkAuthStatus = async () => {
            const userId = localStorage.getItem('userId');
            if (!userId) {
                setIsAuthenticated(false);
                setIsLoading(false);
                return;
            }
            try {
                // Use relative path to go through the proxy
                const response = await axios.get('/api/auth/status', {
                    headers: { 'X-User-ID': userId }
                });
                setIsAuthenticated(response.data.isAuthenticated);
            } catch (error) {
                console.error("Error checking auth status:", error);
                setIsAuthenticated(false);
                // Clear invalid user id
                localStorage.removeItem('userId');
            } finally {
                setIsLoading(false);
            }
        };

        checkAuthStatus();
    }, []);

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