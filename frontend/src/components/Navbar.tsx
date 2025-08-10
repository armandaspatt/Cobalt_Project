import { Link } from 'react-router-dom';

interface NavbarProps {
    isAuthenticated: boolean;
    onLogout: () => void;
}

const Navbar = ({ isAuthenticated, onLogout }: NavbarProps) => {
    return (
        <nav className="bg-white shadow-md">
            <div className="container mx-auto px-6 py-3 flex justify-between items-center">
                <Link to="/" className="text-xl font-bold text-gray-800">Slack Connect</Link>
                <div>
                    {isAuthenticated && (
                        <>
                            <Link to="/scheduled" className="text-gray-600 hover:text-blue-500 mx-2">Scheduled</Link>
                            <button onClick={onLogout} className="text-gray-600 hover:text-blue-500 mx-2">Logout</button>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;