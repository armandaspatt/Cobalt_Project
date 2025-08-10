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
        const handleAuthentication = async () => {
            const params = new URLSearchParams(location.search);
            const userIdFromUrl = params.get('userId');
            const userIdFromStorage = localStorage.getItem('userId');

            let finalUserId = userIdFromUrl || userIdFromStorage;

            if (userIdFromUrl) {
                // If we get a new ID from the URL, it's the source of truth.
                localStorage.setItem('userId', userIdFromUrl);
                // Clean the URL to prevent this block from running on refresh.
                navigate('/', { replace: true });
            }
            
            if (!finalUserId) {
                // If no ID from URL or storage, user is not logged in.
                setIsAuthenticated(false);
                setIsLoading(false);
                return;
            }

            // If we have a user ID, verify it with the backend.
            try {
                const response = await axios.get(`${API_URL}/api/auth/status`, {
                    headers: { 'X-User-ID': finalUserId }
                });
                setIsAuthenticated(response.data.isAuthenticated);
            } catch (error) {
                console.error("Error checking auth status:", error);
                setIsAuthenticated(false);
                localStorage.removeItem('userId'); // Clear invalid ID
            } finally {
                setIsLoading(false);
            }
        };

        handleAuthentication();
    }, [location.search, navigate]); // Rerun whenever the URL query string changes

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