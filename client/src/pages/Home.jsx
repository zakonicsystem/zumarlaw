import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Services from '../components/Services';
import axios from 'axios';

const Home = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [currentAnnouncement, setCurrentAnnouncement] = useState(0);

  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState(null);
  const isTokenExpired = (token) => {
    try {
      const base64Payload = token.split('.')[1];
      const decodedPayload = JSON.parse(atob(base64Payload));
      const currentTime = Math.floor(Date.now() / 1000); // seconds
      return decodedPayload.exp < currentTime;
    } catch (err) {
      console.error('Token parse error:', err);
      return true; // Treat as expired if it fails
    }
  };

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await axios.get('https://app.zumarlawfirm.com/announcements');
        setAnnouncements(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        setAnnouncements([]);
      }
    };
    fetchAnnouncements();
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (storedUser && token) {
      const expired = isTokenExpired(token);
      if (expired) {
        console.log('Token expired — logging out');
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }

      try {
        // Decode token first
        const decodedToken = JSON.parse(atob(token.split('.')[1]));
        console.log('Decoded token:', decodedToken);

        // Parse stored user data
        const parsedUser = JSON.parse(storedUser);
        console.log('Stored user:', parsedUser);

        // Use the data from the token as it's more reliable
        const userData = {
          ...decodedToken,
          firstName: decodedToken.firstName || parsedUser.firstName || '',
        };

        console.log('Final user data:', userData);
        // Update stored user data
        localStorage.setItem('user', JSON.stringify(userData));
        setUserInfo(userData);
      } catch (error) {
        console.error('Error parsing user data:', error);
        navigate('/login');
      }

      const verifyUser = async () => {
        try {
          const res = await fetch('https://app.zumarlawfirm.com/auth/verify-user', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (res.status === 401) {
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            navigate('/login');
          }
        } catch (error) {
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          navigate('/login');
        }
      };

      verifyUser();
    }
  }, []);


  return (
    <div className="min-h-[calc(100vh-80px)] bg-gray-50">
      {/* Announcement popups */}
      <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
        {announcements.length > 0 && (
          <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
            <div
              key={announcements[currentAnnouncement]._id}
              className="relative border-4 border-[#57123f] shadow-2xl rounded-xl px-6 py-6 w-full max-w-md flex flex-col items-center pointer-events-auto animate-announcement-fadein"
              style={{
                boxSizing: 'border-box',
                background: 'linear-gradient(135deg, #facc15 0%, #fff 60%, #57123f 100%)',
                boxShadow: '0 8px 32px 0 rgba(87,18,63,0.25), 0 1.5px 6px 0 rgba(87,18,63,0.15)'
              }}
            >
              <h2 className="text-lg font-bold text-[#57123f] mb-2 tracking-wide uppercase">Announcement</h2>
              <button
                className="absolute top-3 right-3 text-[#57123f] bg-white border border-[#57123f] hover:bg-[#57123f] hover:text-white rounded-full px-3 py-1 text-sm font-bold shadow transition duration-200"
                onClick={() => setAnnouncements(anns => anns.filter((_, i) => i !== currentAnnouncement))}
                aria-label="Close announcement"
              >✕</button>
              <h3 className="text-2xl font-extrabold mb-3 text-[#57123f] text-center">{announcements[currentAnnouncement].heading}</h3>
              <p className="mb-4 text-lg text-gray-700 text-center">{announcements[currentAnnouncement].paragraph}</p>
              <div className="flex justify-between items-center w-full mt-2">
                <button
                  className={`text-[#57123f] bg-white border border-[#57123f] rounded-full px-3 py-1 text-lg font-bold shadow transition duration-200 ${currentAnnouncement === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => currentAnnouncement > 0 && setCurrentAnnouncement(currentAnnouncement - 1)}
                  disabled={currentAnnouncement === 0}
                  aria-label="Previous announcement"
                >&lt;</button>
                <span className="text-[#57123f] font-semibold">{currentAnnouncement + 1} / {announcements.length}</span>
                <button
                  className={`text-[#57123f] bg-white border border-[#57123f] rounded-full px-3 py-1 text-lg font-bold shadow transition duration-200 ${currentAnnouncement === announcements.length - 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => currentAnnouncement < announcements.length - 1 && setCurrentAnnouncement(currentAnnouncement + 1)}
                  disabled={currentAnnouncement === announcements.length - 1}
                  aria-label="Next announcement"
                >&gt;</button>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:justify-between items-center mb-8 gap-4 text-center md:text-left">
          <div className="md:w-2/3">
            <h2 className="text-[#57123f] text-xl md:text-2xl font-bold mb-2">
              Hey {userInfo && userInfo.firstName ? userInfo.firstName : 'there'} 👋
            </h2>
            <p className="text-gray-600 text-lg md:text-xl">Select your Services</p>
          </div>
          <div className="mt-4 md:mt-0">
            <button
              type="button"
              onClick={() => navigate('/refund')}
              className="bg-[#57123f] text-white rounded-full px-4 py-2 text-sm font-semibold shadow-md hover:opacity-95"
            >
              Request Refund
            </button>
          </div>
        </div>
      </div>
      <Services />
    </div>
  );
};

export default Home;
