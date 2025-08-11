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
        const params = new URLSearchParams(location.search);
        const userIdFromUrl = params.get('userId');

        if (userIdFromUrl) {

            localStorage.setItem('userId', userIdFromUrl);
            setIsAuthenticated(true);
            setIsLoading(false);
            navigate('/', { replace: true });
            return; 
        }
        const checkAuthStatus = async () => {
            const userId = localStorage.getItem('userId');
            if (!userId) {
                setIsAuthenticated(false);
                setIsLoading(false);
                return;
            }

            try {
                const response = await axios.get(`${API_URL}/api/auth/status`, {
                    headers: { 'X-User-ID': userId }
                });
                if (response.data.isAuthenticated) {
                    setIsAuthenticated(true);
                } else {
                    localStorage.removeItem('userId');
                    setIsAuthenticated(false);
                }
            } catch (error) {
                console.error("Error checking auth status:", error);
                setIsAuthenticated(false);
                localStorage.removeItem('userId');
            } finally {
                setIsLoading(false);
            }
        };

        checkAuthStatus();
    }, [location.search, navigate]);

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
                    <Route path="/scheduled" element={isAuthenticated ? <ScheduledMessages isAuthenticated={isAuthenticated} /> : <Home isAuthenticated={isAuthenticated} />} />
                </Routes>
            </main>
        </div>
    );
}

export default App;
