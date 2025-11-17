import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import api from '../../utils/api';
import { toast } from 'react-hot-toast';
import { FaPaperPlane, FaTimes, FaCheckDouble, FaCheck, FaSearch, FaSync, FaUserCircle, FaEnvelope, FaCheckCircle, FaComments } from 'react-icons/fa';

export default function AdminChat() {
    const [chatUsers, setChatUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUserRecord, setSelectedUserRecord] = useState(null);
    const messagesEndRef = useRef(null);

    // Parse admin token to get current admin id
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
    const currentAdminId = getCurrentAdminId();
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
    const currentAdminEmail = getCurrentAdminEmail();

    const normalizeId = (val) => {
        if (!val && val !== 0) return null;
        try {
            if (typeof val === 'string') return val;
            if (typeof val === 'object') {
                if (val.$oid) return String(val.$oid);
                if (val.toString && typeof val.toString === 'function') return val.toString();
                if (val._id) return String(val._id);
            }
            return String(val);
        } catch (err) {
            return null;
        }
    };
    const normalizedAdminId = normalizeId(currentAdminId);

    const renderMessageBubble = (msg) => {
        // Use senderRole to determine ownership: 'user' = user message (left), 'admin'/'employee' = admin/employee message (right)
        const isFromCurrentAdmin = msg.senderRole !== 'user';
        const alignment = isFromCurrentAdmin ? 'justify-end' : 'justify-start';
        const bubbleClass = isFromCurrentAdmin
            ? 'bg-gradient-to-r from-[#57123f] to-[#3d0c2a] text-white rounded-br-none'
            : 'bg-white text-gray-900 rounded-bl-none border border-gray-200';

        return (
            <div key={msg._id} className={`mb-4 flex ${alignment}`}>
                <div className={`max-w-xs px-4 py-3 rounded-xl shadow-sm ${bubbleClass}`}>
                    <p className="text-sm">{msg.message}</p>
                    <div className="flex justify-between items-center mt-2 gap-2">
                        <p className="text-xs opacity-70">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {isFromCurrentAdmin && (
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
        fetchChatUsers();
        // Auto-refresh users list every 10 seconds to catch new messages
        const interval = setInterval(fetchChatUsers, 10000);
        return () => clearInterval(interval);
    }, []);

    // Fetch all users from /admin/customers endpoint
    const fetchChatUsers = async () => {
        try {
            const response = await api.get('/admin/customers');
            // Defensive: ensure array
            if (Array.isArray(response.data)) {
                setChatUsers(response.data);
            } else {
                setChatUsers([]);
            }
        } catch (err) {
            setChatUsers([]);
            console.error('Error fetching chat users:', err);
        }
    };

    const handleRefreshUsers = async () => {
        setRefreshing(true);
        await fetchChatUsers();
        setRefreshing(false);
        toast.success('Users list refreshed');
    };

    const handleRefreshMessages = async () => {
        setRefreshing(true);
        await fetchMessages();
        setRefreshing(false);
        toast.success('Messages refreshed');
    };

    useEffect(() => {
        if (selectedUser) {
            fetchMessages();
            fetchUserRecord(selectedUser._id);
        } else {
            setSelectedUserRecord(null);
        }
    }, [selectedUser]);

    // Fetch user record by ID
    const fetchUserRecord = async (userId) => {
        try {
            const response = await api.get(`/admin/customers/${userId}`);
            setSelectedUserRecord(response.data);
        } catch (err) {
            setSelectedUserRecord(null);
        }
    };

    // Fetch messages for selected user
    const fetchMessages = async () => {
        if (!selectedUser) return;
        try {
            setLoading(true);
            // Use the backend endpoint which will handle getting admin ID from the JWT
            // The backend generateConversationId function uses the authenticated user's ID
            const response = await api.get(`/chat/messages/user/${selectedUser._id}`);
            setMessages(response.data);
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        } catch (err) {
            console.error('Error fetching messages:', err);
            // Fallback: try to construct conversation ID manually
            // This won't work perfectly but allows graceful degradation
            toast.error('Failed to load messages');
        } finally {
            setLoading(false);
        }
    };

    // Searching Filter
    const filteredUsers = Array.isArray(chatUsers)
        ? chatUsers.filter(user => (
            (user.name && user.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase()))
        ))
        : [];
    // Send message to user
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedUser) return;
        try {
            const response = await api.post('/chat/send', {
                receiverId: selectedUser._id,
                receiverRole: selectedUser.role || 'user',
                receiverEmail: selectedUser.email,
                message: newMessage
            });
            setMessages([...messages, response.data]);
            setNewMessage('');
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            toast.success('Message sent');
            // Refresh messages to ensure we have the latest
            await fetchMessages();
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
                    <h1 className="text-4xl font-bold text-[#57123f] mb-2">Support Center</h1>
                    <p className="text-gray-600">Manage customer inquiries and provide support</p>
                    <p className="text-xs text-gray-500 mt-1">AdminId: {String(currentAdminId)?.substring(0,12) || 'none'} | Email: {currentAdminEmail || 'none'}</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[75vh]">

                    {/* USERS LIST PANEL */}
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col border border-gray-100">
                        {/* Header */}
                        <div className="p-5 bg-gradient-to-r from-[#57123f] to-[#3d0c2a] text-white">
                            <div className="flex justify-between items-center mb-3">
                                <div>
                                    <h2 className="font-bold text-lg">Customers</h2>
                                    <p className="text-xs opacity-75">{filteredUsers.length} available</p>
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

                        {/* Users List */}
                        <div className="flex-1 overflow-y-auto">
                            {filteredUsers.length === 0 ? (
                                <div className="p-6 text-center text-gray-400">
                                    <FaUserCircle className="text-4xl mx-auto mb-2 opacity-30" />
                                    <p className="font-medium">No customers found</p>
                                </div>
                            ) : (
                                filteredUsers.map((user) => (
                                    <div
                                        key={user._id}
                                        onClick={() => setSelectedUser(user)}
                                        className={`p-4 border-b cursor-pointer transition-all hover:shadow-md ${
                                            selectedUser && selectedUser._id === user._id
                                                ? 'bg-gradient-to-r from-[#57123f] to-[#3d0c2a] text-white shadow-md'
                                                : 'hover:bg-gray-50'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <p className={`font-semibold text-sm ${selectedUser && selectedUser._id === user._id ? 'text-white' : 'text-gray-900'}`}>
                                                    {user.firstName} {user.lastName}
                                                </p>
                                                <p className={`text-xs truncate ${selectedUser && selectedUser._id === user._id ? 'text-gray-200' : 'text-gray-500'}`}>
                                                    {user.email}
                                                </p>
                                                <div className="flex items-center gap-1 mt-1">
                                                    {user.isActive && (
                                                        <span className={`text-xs px-2 py-1 rounded-full ${selectedUser && selectedUser._id === user._id ? 'bg-green-400 bg-opacity-30 text-white' : 'bg-green-100 text-green-700'}`}>
                                                            Active
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {selectedUser && selectedUser._id === user._id && (
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
                        {selectedUser ? (
                            <>
                                {/* HEADER WITH USER INFO */}
                                <div className="p-5 bg-gradient-to-r from-[#57123f] to-[#3d0c2a] text-white">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-white bg-opacity-20 flex items-center justify-center text-lg">
                                                <FaUserCircle className="text-white text-xl" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg">{selectedUser.firstName} {selectedUser.lastName}</h3>
                                                <p className="text-xs opacity-80">{selectedUser.email}</p>
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

                                            <button onClick={() => setSelectedUser(null)} className="lg:hidden hover:opacity-75 transition text-lg">
                                                <FaTimes />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* USER RECORD CARD */}
                                {selectedUserRecord && (
                                    <div className="p-4 bg-gradient-to-r from-[#f8e6f2] to-[#f3f0fa] border-b border-gray-200">
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                            <div className="bg-white p-3 rounded-lg shadow-sm">
                                                <p className="text-xs text-gray-600 font-medium">Full Name</p>
                                                <p className="text-sm font-semibold text-[#57123f] mt-1">
                                                    {selectedUserRecord.firstName} {selectedUserRecord.lastName}
                                                </p>
                                            </div>

                                            <div className="bg-white p-3 rounded-lg shadow-sm flex items-center gap-2">
                                                <FaEnvelope className="text-[#57123f] text-sm" />
                                                <div>
                                                    <p className="text-xs text-gray-600 font-medium">Email</p>
                                                    <p className="text-xs font-semibold text-[#57123f] truncate">
                                                        {selectedUserRecord.email}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="bg-white p-3 rounded-lg shadow-sm">
                                                <p className="text-xs text-gray-600 font-medium">Status</p>
                                                <p className="text-sm font-bold text-[#57123f] mt-1">
                                                    {selectedUserRecord.isActive ? '✓ Active' : 'Inactive'}
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
                                            <p className="text-xs mt-2">Start a conversation with this customer</p>
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
                                <p className="font-medium text-lg">No customer selected</p>
                                <p className="text-sm mt-2">Choose a customer from the left panel to start chatting</p>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
