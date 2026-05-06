import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import api from '../../utils/api';
import { toast } from 'react-hot-toast';
import { FaPaperPlane, FaTimes, FaCheckDouble, FaCheck, FaSearch, FaSync, FaUserCircle, FaEnvelope, FaCheckCircle, FaComments } from 'react-icons/fa';

export default function AdminChat() {
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const messagesEndRef = useRef(null);

    // Get current admin info from token
    const getCurrentAdminId = () => {
        try {
            const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
            if (!token) return null;
            const decoded = JSON.parse(atob(token.split('.')[1]));
            return decoded.id || decoded._id || decoded.userId || decoded.sub || null;
        } catch (err) {
            return null;
        }
    };

    const getCurrentAdminEmail = () => {
        try {
            const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
            if (!token) return null;
            const decoded = JSON.parse(atob(token.split('.')[1]));
            return decoded.email || decoded.userEmail || null;
        } catch (err) {
            return null;
        }
    };

    const getCurrentAdminName = () => {
        try {
            const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
            if (!token) return 'Admin';
            const decoded = JSON.parse(atob(token.split('.')[1]));
            return decoded.name || 'Admin';
        } catch (err) {
            return 'Admin';
        }
    };

    const currentAdminId = getCurrentAdminId();
    const currentAdminEmail = getCurrentAdminEmail();
    const currentAdminName = getCurrentAdminName();

    const renderMessageBubble = (msg) => {
        // Check if message is from admin/staff (sender === 'admin')
        const isFromAdmin = msg.sender === 'admin';
        const alignment = isFromAdmin ? 'justify-end' : 'justify-start';
        const bubbleClass = isFromAdmin
            ? 'bg-gradient-to-r from-[#57123f] to-[#3d0c2a] text-white rounded-br-none'
            : 'bg-white text-gray-900 rounded-bl-none border border-gray-200';

        return (
            <div key={msg._id} className={`mb-4 flex ${alignment}`}>
                <div className={`max-w-xs px-4 py-3 rounded-xl shadow-sm ${bubbleClass}`}>
                    <p className="text-xs opacity-80 mb-1 font-semibold">
                        {msg.senderName || (isFromAdmin ? 'Admin' : 'User')}
                    </p>
                    <p className="text-sm">{msg.message}</p>
                    <div className="flex justify-between items-center mt-2 gap-2">
                        <p className="text-xs opacity-70">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {isFromAdmin && (
                            <span className="text-xs opacity-70">
                                {msg.isRead ? <FaCheckDouble /> : <FaCheck />}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // Fetch conversations
    useEffect(() => {
        fetchConversations();
        // Auto-refresh conversations every 10 seconds
        const interval = setInterval(fetchConversations, 10000);
        return () => clearInterval(interval);
    }, []);

    // Fetch all conversations
    const fetchConversations = async () => {
        try {
            const response = await api.get('/api/forms/conversations?limit=100');
            if (response.data && response.data.data) {
                setConversations(response.data.data);
            }
        } catch (err) {
            console.error('Error fetching conversations:', err);
            toast.error('Failed to fetch conversations');
        }
    };

    const handleRefreshUsers = async () => {
        setRefreshing(true);
        await fetchConversations();
        setRefreshing(false);
        toast.success('Conversations refreshed');
    };

    const handleRefreshMessages = async () => {
        setRefreshing(true);
        await fetchMessages();
        setRefreshing(false);
        toast.success('Messages refreshed');
    };

    useEffect(() => {
        if (selectedConversation) {
            fetchMessages();
        }
    }, [selectedConversation]);

    // Fetch messages for selected conversation
    const fetchMessages = async () => {
        if (!selectedConversation) return;
        try {
            setLoading(true);
            const response = await api.get(`/api/forms/conversations/${selectedConversation._id}`);
            if (response.data && response.data.data) {
                setMessages(response.data.data.messages || []);
            }
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        } catch (err) {
            console.error('Error fetching messages:', err);
            toast.error('Failed to load messages');
        } finally {
            setLoading(false);
        }
    };

    // Search/Filter Conversations
    const filteredConversations = Array.isArray(conversations)
        ? conversations.filter(conv => (
            (conv.userName && conv.userName.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (conv.userEmail && conv.userEmail.toLowerCase().includes(searchQuery.toLowerCase()))
        ))
        : [];
    // Send message to user
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedConversation) return;
        try {
            const response = await api.post('/api/forms/message', {
                userEmail: selectedConversation.userEmail,
                message: newMessage,
                senderName: currentAdminName
            });
            if (response.data && response.data.data) {
                setMessages(response.data.data.messages || []);
                setNewMessage('');
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                toast.success('Message sent');
            }
        } catch (err) {
            console.error('Error sending message:', err);
            toast.error('Failed to send message');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#f8e6f2] via-[#f3f0fa] to-[#f7f7fa] py-4 px-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-[#57123f] mb-2">Chat Support</h1>
                    <p className="text-gray-600">Manage customer inquiries and chat conversations</p>
                    <p className="text-xs text-gray-500 mt-1">Admin: {currentAdminName} | Email: {currentAdminEmail || 'none'}</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[75vh]">

                    {/* CONVERSATIONS LIST PANEL */}
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col border border-gray-100">
                        {/* Header */}
                        <div className="p-5 bg-gradient-to-r from-[#57123f] to-[#3d0c2a] text-white">
                            <div className="flex justify-between items-center mb-3">
                                <div>
                                    <h2 className="font-bold text-lg">Conversations</h2>
                                    <p className="text-xs opacity-75">{filteredConversations.length} available</p>
                                </div>
                                <button
                                    onClick={handleRefreshUsers}
                                    disabled={refreshing}
                                    className="hover:opacity-75 transition disabled:opacity-50 text-lg"
                                    title="Refresh"
                                >
                                    <FaSync className={refreshing ? 'animate-spin' : ''} />
                                </button>
                            </div>

                            {/* Search */}
                            <div className="relative">
                                <FaSearch className="absolute left-3 top-3 text-gray-300 text-sm" />
                                <input
                                    type="text"
                                    placeholder="Search by name or email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-white bg-opacity-90 text-gray-800 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-400"
                                />
                            </div>
                        </div>

                        {/* Conversations List */}
                        <div className="flex-1 overflow-y-auto">
                            {filteredConversations.length === 0 ? (
                                <div className="p-6 text-center text-gray-400">
                                    <FaComments className="text-4xl mx-auto mb-2 opacity-30" />
                                    <p className="font-medium">No conversations found</p>
                                </div>
                            ) : (
                                filteredConversations.map((conv) => (
                                    <div
                                        key={conv._id}
                                        onClick={() => setSelectedConversation(conv)}
                                        className={`p-4 border-b cursor-pointer transition-all hover:shadow-md ${
                                            selectedConversation && selectedConversation._id === conv._id
                                                ? 'bg-gradient-to-r from-[#57123f] to-[#3d0c2a] text-white shadow-md'
                                                : 'hover:bg-gray-50'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <p className={`font-semibold text-sm ${selectedConversation && selectedConversation._id === conv._id ? 'text-white' : 'text-gray-900'}`}>
                                                    {conv.userName || 'Unknown User'}
                                                </p>
                                                <p className={`text-xs truncate ${selectedConversation && selectedConversation._id === conv._id ? 'text-gray-200' : 'text-gray-500'}`}>
                                                    {conv.userEmail}
                                                </p>
                                                <div className="flex items-center gap-1 mt-1">
                                                    <span className={`text-xs truncate ${selectedConversation && selectedConversation._id === conv._id ? 'text-gray-200' : 'text-gray-600'}`}>
                                                        {conv.lastMessage}
                                                    </span>
                                                </div>
                                            </div>

                                            {selectedConversation && selectedConversation._id === conv._id && (
                                                <div className="ml-2">
                                                    <FaCheckCircle className="text-green-300 text-lg" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* CHAT WINDOW */}
                    <div className="lg:col-span-3 bg-white rounded-xl shadow-lg overflow-hidden flex flex-col border border-gray-100">
                        {selectedConversation ? (
                            <>
                                {/* HEADER WITH CONVERSATION INFO */}
                                <div className="p-5 bg-gradient-to-r from-[#57123f] to-[#3d0c2a] text-white">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-white bg-opacity-20 flex items-center justify-center text-lg">
                                                <FaUserCircle className="text-white text-xl" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg">{selectedConversation.userName || 'Unknown'}</h3>
                                                <p className="text-xs opacity-80">{selectedConversation.userEmail}</p>
                                            </div>
                                        </div>

                                        <div className="flex gap-3">
                                            <button
                                                onClick={handleRefreshMessages}
                                                disabled={refreshing}
                                                className="hover:opacity-75 transition disabled:opacity-50 text-lg"
                                                title="Refresh messages"
                                            >
                                                <FaSync className={refreshing ? 'animate-spin' : ''} />
                                            </button>

                                            <button onClick={() => setSelectedConversation(null)} className="lg:hidden hover:opacity-75 transition text-lg">
                                                <FaTimes />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* CONVERSATION INFO CARD */}
                                {selectedConversation && (
                                    <div className="p-4 bg-gradient-to-r from-[#f8e6f2] to-[#f3f0fa] border-b border-gray-200">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="bg-white p-3 rounded-lg shadow-sm">
                                                <p className="text-xs text-gray-600 font-medium">Name</p>
                                                <p className="text-sm font-semibold text-[#57123f] mt-1">
                                                    {selectedConversation.userName}
                                                </p>
                                            </div>

                                            <div className="bg-white p-3 rounded-lg shadow-sm flex items-center gap-2">
                                                <FaEnvelope className="text-[#57123f] text-sm" />
                                                <div>
                                                    <p className="text-xs text-gray-600 font-medium">Email</p>
                                                    <p className="text-xs font-semibold text-[#57123f] truncate">
                                                        {selectedConversation.userEmail}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="bg-white p-3 rounded-lg shadow-sm">
                                                <p className="text-xs text-gray-600 font-medium">Messages</p>
                                                <p className="text-sm font-bold text-[#57123f] mt-1">
                                                    {selectedConversation.messageCount || 0}
                                                </p>
                                            </div>

                                            <div className="bg-white p-3 rounded-lg shadow-sm">
                                                <p className="text-xs text-gray-600 font-medium">Status</p>
                                                <p className="text-sm font-bold text-[#57123f] mt-1">
                                                    {selectedConversation.status || 'active'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* MESSAGES AREA */}
                                <div className="flex-1 overflow-y-auto p-5 bg-gray-50">
                                    {loading ? (
                                        <div className="text-center text-gray-500 mt-8">
                                            <div className="animate-spin text-3xl mb-2">⚙️</div>
                                            <p>Loading messages...</p>
                                        </div>
                                    ) : messages.length === 0 ? (
                                        <div className="text-center text-gray-400 mt-8">
                                            <FaComments className="text-4xl mx-auto mb-2 opacity-30" />
                                            <p className="font-medium">No messages yet</p>
                                            <p className="text-xs mt-2">Start chatting with this customer</p>
                                        </div>
                                    ) : (
                                        messages.map((msg) => renderMessageBubble(msg))
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* INPUT AREA */}
                                <form className="p-4 border-t bg-white flex gap-2" onSubmit={handleSendMessage}>
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Type your message here..."
                                        className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#57123f] focus:border-transparent bg-gray-50"
                                    />

                                    <button
                                        type="submit"
                                        disabled={!newMessage.trim()}
                                        className="bg-gradient-to-r from-[#57123f] to-[#3d0c2a] text-white px-5 py-3 rounded-lg hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
                                    >
                                        <FaPaperPlane className="text-sm" />
                                        <span className="hidden sm:inline">Send</span>
                                    </button>
                                </form>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                                <FaComments className="text-6xl mb-4 opacity-20" />
                                <p className="font-medium text-lg">No conversation selected</p>
                                <p className="text-sm mt-2">Choose a conversation from the left panel to start chatting</p>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
