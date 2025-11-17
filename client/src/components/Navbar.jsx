import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { HashLink } from 'react-router-hash-link';
import { FaHome, FaSignOutAlt, FaUserCircle, FaTachometerAlt } from 'react-icons/fa';
import { MdMiscellaneousServices } from 'react-icons/md';
import Logo from '../assets/ZumarLogo.png';

const Navbar = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
  }, [location.pathname]);

  const isActive = (path) => location.pathname === path;

  const getLinkStyles = (path) => {
    return `flex items-center justify-center transition-all p-3 rounded-full border border-[#ecd4bc] ${
      isActive(path)
        ? 'bg-[#57123f] text-[#ecd4bc]'
        : 'bg-white text-[#57123f] hover:bg-opacity-90'
    }`;
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <nav className="bg-[#57123f] text-white py-4 px-6 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold hover:opacity-90 transition-opacity">
          <img src={Logo} alt="Zumar Law Firm" width={150} />
        </Link>

        {isLoggedIn && (
          <div className="flex items-center gap-6">
            <Link to="/" className={getLinkStyles('/')}> 
              <FaHome className="text-2xl" />
            </Link>
            <Link to="/userpanel" className={getLinkStyles('/userpanel')}>
              <FaTachometerAlt className="text-2xl" />
            </Link>
            <Link to="/chat" className={getLinkStyles('/chat')} title="Support Chat">
              <span className="relative flex items-center">
                <FaUserCircle className="text-2xl" />
                <span className="ml-2 text-sm font-semibold">Chat</span>
              </span>
            </Link>
            <button
              onClick={handleLogout}
              className={getLinkStyles('/logout')}
              title="Logout"
            >
              <FaSignOutAlt className="text-2xl" />
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}

export default Navbar;
