import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { toast } from 'react-hot-toast';
import { FaPaperPlane, FaTimes, FaChevronLeft, FaSearch, FaCheck, FaCheckDouble, FaSync } from 'react-icons/fa';

export default function UserChat() {
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const messagesEndRef = useRef(null);
    // Determine current user id from localStorage token/user
    const getCurrentUserId = () => {
        try {
            const stored = localStorage.getItem('user');
            if (!stored) return null;
            const parsed = JSON.parse(stored);
            return parsed.id || parsed._id || parsed.userId || parsed.sub || null;
        } catch (err) {
            return null;
        }
    };
    const currentUserId = getCurrentUserId();
    const getCurrentUserEmail = () => {
        try {
            const stored = localStorage.getItem('user');
            if (!stored) return null;
            const parsed = JSON.parse(stored);
            return parsed.email || parsed.userEmail || null;
        } catch (err) {
            return null;
        }
    };
    const currentUserEmail = getCurrentUserEmail();

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
    const normalizedCurrentUserId = normalizeId(currentUserId);

    const generateConversationId = (id1, id2) => {
        if (!id1 || !id2) return null;
        const a = id1.toString();
        const b = id2.toString();
        return [a, b].sort().join('-');
    };

    // Fetch conversations
    useEffect(() => {
        fetchConversations();
        // Auto-refresh conversations every 4 seconds to catch new messages
        const interval = setInterval(fetchConversations, 4000);
        return () => clearInterval(interval);
    }, []);

    const fetchConversations = async () => {
        try {
            console.log('[UserChat] Fetching conversations...');
            const response = await api.get('/chat/conversations');
            console.log('[UserChat] ✓ Conversations fetched:', Array.isArray(response.data) ? response.data.length : 0, 'conversations');

            if (Array.isArray(response.data) && response.data.length > 0) {
                setConversations(response.data);
                // Auto-select first conversation if none selected yet
                if (!selectedConversation && response.data.length > 0) {
                    console.log('[UserChat] Auto-selecting conversation from fetchConversations');
                    setSelectedConversation(response.data[0]);
                }
                return;
            }

            // Fallback: query debug endpoint and synthesize conversations
            console.warn('[UserChat] No conversations returned; trying fallback via debug/all-messages');
            try {
                const all = await api.get('/chat/debug/all-messages');
                const myMsgs = (all.data.messages || []).filter(m => m.senderId === normalizedCurrentUserId || m.receiverId === normalizedCurrentUserId);
                const byConv = {};
                myMsgs.forEach(m => {
                    byConv[m.conversationId] = byConv[m.conversationId] || m;
                });
                const convs = Object.keys(byConv).map(convId => ({
                    conversationId: convId,
                    latestMessage: byConv[convId],
                    partner: {
                        id: byConv[convId].senderId === normalizedCurrentUserId ? byConv[convId].receiverId : byConv[convId].senderId,
                        email: byConv[convId].senderEmail || ''
                    }
                }));
                setConversations(convs);
                if (!selectedConversation && convs.length > 0) setSelectedConversation(convs[0]);
            } catch (err) {
                console.error('[UserChat] Fallback failed', err);
                setConversations([]);
            }

        } catch (err) {
            console.error('[UserChat] ❌ Error fetching conversations:', err.response?.data || err.message || err);
            setConversations([]);
        }
    };

    // Manual refresh for conversations
    const handleRefreshConversations = async () => {
        setRefreshing(true);
        await fetchConversations();
        setRefreshing(false);
        toast.success('Conversations refreshed');
    };

    // Manual refresh for messages
    const handleRefreshMessages = async () => {
        setRefreshing(true);
        await fetchMessages();
        setRefreshing(false);
        toast.success('Messages refreshed');
    };

    // Fetch messages for selected conversation
    useEffect(() => {
        console.log('[UserChat] Selected conversation changed:', selectedConversation?.conversationId);

        if (selectedConversation && !selectedConversation.isNew) {
            console.log('[UserChat] Fetching messages for conversation:', selectedConversation.conversationId);
            fetchMessages();
            // Auto-refresh messages every 4 seconds when conversation is selected
            const interval = setInterval(fetchMessages, 4000);
            return () => clearInterval(interval);
        } else if (selectedConversation?.isNew) {
            console.log('[UserChat] New conversation, no messages to fetch');
            setMessages([]);
        }
    }, [selectedConversation]);

    const fetchMessages = async () => {
        if (!selectedConversation) {
            console.log('[UserChat] ❌ No selected conversation');
            return;
        }

        if (selectedConversation.isNew) {
            console.log('[UserChat] New conversation, skipping fetch');
            setMessages([]);
            return;
        }

        try {
            setLoading(true);
            // The conversationId comes from aggregation as `conversationId` field
            const conversationId = selectedConversation.conversationId || selectedConversation._id || generateConversationId(currentUserId, selectedConversation?.partner?.id);
            console.log('[UserChat] Fetching messages for conversationId:', conversationId);
            console.log('[UserChat] Full conversation object:', JSON.stringify(selectedConversation, null, 2));

            const response = await api.get(`/chat/messages/${conversationId}`);
            console.log('[UserChat] ✓ Messages fetched:', response.data.length, 'messages');

            if (Array.isArray(response.data)) {
                setMessages(response.data);
            } else {
                console.warn('[UserChat] Response is not array:', response.data);
                setMessages([]);
            }

            setTimeout(() => scrollToBottom(), 100);
        } catch (err) {
            console.error('[UserChat] ❌ Error fetching messages:', err.response?.data || err.message);
            setMessages([]);
        } finally {
            setLoading(false);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
    // Send message to admin (works even if no prior conversation)
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            const messageData = {
                receiverId: 'admin',
                receiverRole: 'admin',
                message: newMessage.trim()
            };

            console.log('[UserChat] ===== SENDING MESSAGE =====');
            console.log('[UserChat] Payload:', messageData);

            const response = await api.post('/chat/send', messageData);
            console.log('[UserChat] ✓ Message sent successfully:', response.data._id);
            console.log('[UserChat] ✓ ConversationId:', response.data.conversationId);

            // Add message to current messages immediately
            setMessages([...messages, response.data]);
            setNewMessage('');
            scrollToBottom();
            toast.success('Message sent to admin');

            // Refresh conversations list after a delay
            setTimeout(() => fetchConversations(), 800);
        } catch (err) {
            console.error('[UserChat] ❌ Error sending message:', err.response?.data || err.message);
            console.error('[UserChat] Full error:', err);
            toast.error(err.response?.data?.error || 'Failed to send message');
        }
    };

    // Format time
    const formatTime = (date) => {
        return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    // Auto-load first conversation or create new one
    useEffect(() => {
        console.log('[UserChat] Auto-load effect:', conversations.length, 'conversations, selectedConversation:', !!selectedConversation);

        if (conversations.length > 0 && !selectedConversation) {
            console.log('[UserChat] Loading first conversation...');
            setSelectedConversation(conversations[0]);
        } else if (conversations.length === 0 && !selectedConversation) {
            console.log('[UserChat] No conversations, creating new one');
            setSelectedConversation({ isNew: true });
        }
    }, [conversations]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#f8e6f2] via-[#f3f0fa] to-[#f7f7fa] py-4 px-4">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl font-bold text-[#57123f] mb-8">Support Chat</h1>

                {/* Debug Info */}
                <div className="mb-4 p-3 bg-blue-100 border border-blue-300 rounded text-xs text-blue-800">
                    <p><strong>Debug:</strong> Conversations: {conversations.length} | Selected: {selectedConversation?.conversationId?.substring(0, 12) || 'none'} | Messages: {messages.length} | Loading: {loading ? 'yes' : 'no'}</p>
                    <p className="mt-1 text-xs">UserId: {String(currentUserId)?.substring(0, 12) || 'none'} | Email: {currentUserEmail || 'none'}</p>
                </div>

                {/* Chat Panel - Always Visible */}
                <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col h-[70vh]">
                    {/* Header */}
                    <div className="p-4 bg-gradient-to-r from-[#57123f] to-[#3d0c2a] text-white flex justify-between items-center">
                        <div>
                            <h3 className="font-bold">Zumar Law Firm Support</h3>
                            <p className="text-xs opacity-75">Chat with our admin team</p>
                        </div>
                        <button
                            onClick={handleRefreshMessages}
                            disabled={refreshing}
                            className="hover:opacity-75 transition disabled:opacity-50"
                            title="Refresh messages"
                        >
                            <FaSync className={refreshing ? 'animate-spin' : ''} />
                        </button>
                    </div>

                    {/* Chat Records / Messages - Always Show */}
                    <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                        {loading ? (
                            <div className="text-center text-gray-500 mt-8">Loading messages...</div>
                        ) : messages.length === 0 ? (
                            <div className="text-center text-gray-500 mt-8">
                                <p>No messages yet</p>
                                <p className="text-xs mt-2">Send a message to start chatting with admin</p>
                            </div>
                            ) : (
                            messages.map((msg) => {
                                            // Use senderRole to determine ownership: 'user' = current user (left), anything else = admin/employee (right)
                                            const isFromCurrentUser = msg.senderRole === 'user';
                                // Desired layout: admin/employee messages on the right, user messages on the left
                                const alignmentClass = isFromCurrentUser ? 'justify-start' : 'justify-end';
                                const bubbleClass = isFromCurrentUser ? 'bg-gray-200 text-gray-900' : 'bg-[#57123f] text-white';

                                return (
                                    <div key={msg._id} className={`mb-4 flex ${alignmentClass}`}>
                                        <div className={`max-w-xs px-4 py-2 rounded-lg ${bubbleClass}`}>
                                            <p className="text-sm">{msg.message}</p>
                                            <div className="flex justify-between items-center mt-1 gap-2">
                                                <p className="text-xs opacity-75">{formatTime(msg.createdAt)}</p>
                                                {isFromCurrentUser && (
                                                    <span className="text-xs opacity-75">
                                                        {msg.isRead ? <FaCheckDouble /> : <FaCheck />}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input - Always Show */}
                    <form onSubmit={handleSendMessage} className="p-4 border-t flex gap-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message to admin..."
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#57123f]"
                        />
                        <button
                            type="submit"
                            disabled={!newMessage.trim()}
                            className="bg-[#57123f] text-white px-4 py-2 rounded-lg hover:opacity-90 transition disabled:opacity-50"
                        >
                            <FaPaperPlane />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
