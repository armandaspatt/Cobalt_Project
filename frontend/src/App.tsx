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

    const checkAuthStatus = async (id: string) => {
        try {
            const response = await axios.get(`${API_URL}/api/auth/status`, {
                headers: { 'X-User-ID': id }
            });
            if (response.data.isAuthenticated) {
                setIsAuthenticated(true);
            } else {
                localStorage.removeItem('userId');
                setIsAuthenticated(false);
            }
        } catch (error) {
            console.error("Error checking auth status:", error);
            localStorage.removeItem('userId');
            setIsAuthenticated(false);
        } finally {
            setIsLoading(false);
        }
    };

    if (userIdFromUrl) {
        // Case 1: Returned from Slack OAuth
        localStorage.setItem('userId', userIdFromUrl);
        checkAuthStatus(userIdFromUrl).then(() => {
            navigate('/', { replace: true });
        });
    } else {
        // Case 2: Normal load or refresh
        const storedUserId = localStorage.getItem('userId');
        if (!storedUserId) {
            setIsAuthenticated(false);
            setIsLoading(false);
            return;
        }
        checkAuthStatus(storedUserId);
    }
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
                    <Route
                        path="/scheduled"
                        element={
                            isAuthenticated
                                ? <ScheduledMessages />
                                : <Home isAuthenticated={isAuthenticated} />
                        }
                    />
                </Routes>
            </main>
        </div>
    );
}

export default App;
