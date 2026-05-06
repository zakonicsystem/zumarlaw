import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { FaEnvelope, FaTimes } from 'react-icons/fa';

const ChatButton = () => {
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [userEmail, setUserEmail] = useState('');
    const [conversationId, setConversationId] = useState(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [showUserForm, setShowUserForm] = useState(false);
    const [userName, setUserName] = useState('');
    const messagesEndRef = useRef(null);

    const API = import.meta.env.VITE_API_URL || '';

    // Get logged-in user's email and name from JWT token
    const getLoggedInUser = () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return null;
            const decoded = JSON.parse(atob(token.split('.')[1]));
            const email = decoded.email || decoded.userEmail || null;
            const name = decoded.name || decoded.userName || 'User';
            return email ? { email, name } : null;
        } catch (err) {
            return null;
        }
    };

    // Initialize and monitor login status changes
    useEffect(() => {
        let lastToken = localStorage.getItem('token');

        const checkAuthStatus = () => {
            const currentToken = localStorage.getItem('token');

            // Only update if token status changed
            if (currentToken !== lastToken) {
                lastToken = currentToken;

                const user = getLoggedInUser();
                if (user) {
                    // User is logged in
                    setUserEmail(user.email);
                    setUserName(user.name);
                    setIsLoggedIn(true);
                    setShowUserForm(false);
                    const savedUnread = localStorage.getItem('chatUnreadCount');
                    if (savedUnread) {
                        setUnreadCount(parseInt(savedUnread));
                    }
                    checkUnreadMessagesImmediate(user.email);
                } else {
                    // User is logged out
                    setIsLoggedIn(false);
                    setUserEmail('');
                    setUserName('');
                    setShowUserForm(true);
                    setIsChatOpen(false);
                }
            }
        };

        // Initial check
        checkAuthStatus();

        // Poll every 500ms to detect token changes
        const interval = setInterval(checkAuthStatus, 500);

        return () => clearInterval(interval);
    }, []);

    // Auto scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Load user conversation when chat opens
    useEffect(() => {
        if (isChatOpen && userEmail && !conversationId) {
            fetchUserConversation();
        }
    }, [isChatOpen, userEmail]);

    // Poll for new messages every 3 seconds when chat is open
    useEffect(() => {
        if (!isChatOpen || !conversationId) return;

        const interval = setInterval(() => {
            fetchUserConversation();
        }, 3000);

        return () => clearInterval(interval);
    }, [isChatOpen, conversationId]);

    // Background polling for unread messages (every 5 seconds, even when chat is closed)
    useEffect(() => {
        const bgInterval = setInterval(() => {
            if (userEmail) {
                checkUnreadMessages();
            }
        }, 5000);

        return () => clearInterval(bgInterval);
    }, [userEmail]);

    const fetchUserConversation = async () => {
        if (!userEmail) return;

        try {
            const response = await fetch(`${API}/api/forms/user?email=${encodeURIComponent(userEmail)}`);
            if (response.ok) {
                const data = await response.json();
                if (data.data) {
                    setConversationId(data.data._id);
                    setMessages(data.data.messages || []);

                    // Count unread messages from admin
                    const unreadFromAdmin = (data.data.messages || []).filter(
                        msg => msg.sender === 'admin' && !msg.isRead
                    ).length;
                    setUnreadCount(unreadFromAdmin);
                    localStorage.setItem('chatUnreadCount', unreadFromAdmin);
                }
            }
        } catch (error) {
            console.error('Error fetching conversation:', error);
        }
    };

    // Check unread messages immediately
    const checkUnreadMessagesImmediate = async (email) => {
        if (!email) return;

        try {
            const response = await fetch(`${API}/api/forms/user?email=${encodeURIComponent(email)}`);
            if (response.ok) {
                const data = await response.json();
                if (data.data && data.data.messages) {
                    const unreadFromAdmin = data.data.messages.filter(
                        msg => msg.sender === 'admin' && !msg.isRead
                    ).length;
                    setUnreadCount(unreadFromAdmin);
                    localStorage.setItem('chatUnreadCount', unreadFromAdmin);
                }
            }
        } catch (error) {
            console.error('Error checking unread messages:', error);
        }
    };

    // Check unread messages in background
    const checkUnreadMessages = async () => {
        if (!userEmail) return;

        try {
            const response = await fetch(`${API}/api/forms/user?email=${encodeURIComponent(userEmail)}`);
            if (response.ok) {
                const data = await response.json();
                if (data.data && data.data.messages) {
                    // Count unread messages from admin
                    const unreadFromAdmin = data.data.messages.filter(
                        msg => msg.sender === 'admin' && !msg.isRead
                    ).length;
                    setUnreadCount(unreadFromAdmin);
                    localStorage.setItem('chatUnreadCount', unreadFromAdmin);
                }
            }
        } catch (error) {
            console.error('Error checking unread messages:', error);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();

        const trimmedMessage = inputMessage.trim();

        // Validate message
        if (!trimmedMessage) {
            toast.error('Please enter a message');
            return;
        }

        // Ensure user is logged in
        if (!userEmail) {
            toast.error('Please log in first');
            return;
        }

        setSending(true);

        try {
            const payload = {
                name: userName || 'User',
                email: userEmail,
                message: trimmedMessage,
                subject: 'Chat Support'
            };
            const response = await fetch(`${API}/api/forms/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const responseData = await response.json();
            if (!response.ok) {
                throw new Error(responseData.message || `Server error: ${response.status}`);
            }

            if (responseData.success && responseData.data) {
                setMessages(responseData.data.messages || []);
                setConversationId(responseData.data._id);
                setInputMessage('');
                toast.success('Message sent successfully');
            } else {
                throw new Error('Invalid response from server');
            }
        } catch (error) {
            toast.error(error.message || 'Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const handleStartChat = (e) => {
        e.preventDefault();

        const trimmedName = userName.trim();
        const trimmedEmail = userEmail.trim();

        if (!trimmedName) {
            toast.error('Please enter your name');
            return;
        }

        if (!trimmedEmail) {
            toast.error('Please enter your email');
            return;
        }

        // Save email to localStorage for future sessions
        localStorage.setItem('chatUserEmail', trimmedEmail);
        setUserName(trimmedName);
        setUserEmail(trimmedEmail);
        setShowUserForm(false);
        toast.success('Chat started!');
    };

    const handleClearChat = () => {
        setUserName('');
        setUserEmail('');
        setMessages([]);
        setConversationId(null);
        setUnreadCount(0);
        setShowUserForm(true);
        localStorage.removeItem('chatUserEmail');
        localStorage.removeItem('chatUnreadCount');
    };

    const toggleChat = () => {
        // Only allow logged-in users to open chat
        if (!isLoggedIn) {
            toast.error('Please log in to use chat');
            return;
        }

        setIsChatOpen(!isChatOpen);
        if (!isChatOpen) {
            // When opening chat, clear unread count (user is viewing messages)
            setUnreadCount(0);
            localStorage.setItem('chatUnreadCount', '0');
            // Fetch latest messages
            if (userEmail) {
                fetchUserConversation();
            }
        }
    };

    const handleCloseChat = () => {
        setIsChatOpen(false);
        // DO NOT clear unreadCount when closing - keep showing the badge
    };



    return (
        <>
            {/* Chat Window */}
            {isChatOpen && (
                <div
                    className="fixed bottom-24 right-6 w-80 h-96 bg-white rounded-lg shadow-2xl flex flex-col z-[9998] border border-gray-200"
                    style={{
                        position: 'fixed',
                        bottom: '96px',
                        right: '24px',
                        zIndex: 9998,
                        maxHeight: '400px'
                    }}
                >
                    {/* Chat Header */}
                    <div className="text-white p-4 rounded-t-lg flex justify-between items-center" style={{ backgroundColor: '#57123f' }}>
                        <div>
                            <h3 className="font-bold text-lg">Chat with us</h3>
                            <p className="text-xs opacity-90">{userName}</p>
                            <p className="text-xs opacity-90">{userEmail}</p>
                        </div>
                        <button
                            onClick={handleCloseChat}
                            className="text-white rounded-full p-1 transition duration-300"
                            style={{ backgroundColor: '#57123f' }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#8B4E7C'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = '#57123f'}
                            aria-label="Close chat"
                        >
                            <FaTimes />
                        </button>
                    </div>

                    {/* Chat Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
                        {messages.length === 0 ? (
                            <div className="text-center text-gray-500 text-sm py-8">
                                <p>Hello! How can we help you today?</p>
                                <p className="text-xs mt-4">Our team is here to assist you with any questions.</p>
                            </div>
                        ) : (
                            messages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-xs px-3 py-2 rounded-lg text-sm ${msg.sender === 'user' ? 'text-white rounded-br-none' : 'bg-gray-200 text-gray-800 rounded-bl-none'
                                            }`}
                                        style={msg.sender === 'user' ? { backgroundColor: '#57123f' } : {}}
                                    >
                                        <p className="font-semibold text-xs mb-1">
                                            {msg.senderName || (msg.sender === 'user' ? 'You' : 'Admin')}
                                        </p>
                                        {msg.senderEmail && (
                                            <p className="text-xs opacity-80 mb-1">
                                                {msg.senderEmail}
                                            </p>
                                        )}
                                        <p>{msg.message}</p>
                                        <p className="text-xs mt-1 opacity-70">
                                            {new Date(msg.createdAt).toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Chat Input */}
                    <div className="border-t border-gray-200 p-4 bg-white rounded-b-lg">
                        <form onSubmit={handleSendMessage} className="space-y-2">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Type your message..."
                                    value={inputMessage}
                                    onChange={(e) => setInputMessage(e.target.value)}
                                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                                    style={{ focusRingColor: '#57123f' }}
                                    disabled={sending}
                                />
                                <button
                                    type="submit"
                                    className="text-white rounded-lg px-4 py-2 text-sm transition duration-300 disabled:opacity-50"
                                    style={{ backgroundColor: '#57123f' }}
                                    onMouseEnter={(e) => !sending && (e.target.style.backgroundColor = '#8B4E7C')}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = '#57123f'}
                                    disabled={sending}
                                >
                                    {sending ? '...' : 'Send'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Chat Button */}
            <button
                onClick={toggleChat}
                className="fixed bottom-6 right-6 w-16 h-16 text-white rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 z-[9999] hover:scale-110 transform pointer-events-auto"
                title="Open chat"
                aria-label="Open chat"
                style={{
                    position: 'fixed',
                    bottom: '24px',
                    right: '24px',
                    zIndex: 9999,
                    overflow: 'visible',
                    backgroundColor: '#57123f'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#8B4E7C'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#57123f'}
            >
                {isChatOpen ? (
                    <FaTimes className="text-2xl" />
                ) : (
                    <FaEnvelope className="text-2xl" />
                )}

                {/* Unread Message Badge */}
                {unreadCount > 0 && (
                    <div
                        className="absolute bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white shadow-lg"
                        style={{
                            position: 'absolute',
                            top: '-6px',
                            right: '-6px',
                            backgroundColor: '#dc2626',
                            width: '28px',
                            height: '28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            zIndex: 10000
                        }}
                    >
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </div>
                )}
            </button>
        </>
    );
};

export default ChatButton;