import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, Loader2, Sparkles } from 'lucide-react';
import { getChatMessages, sendChatMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

export default function ChatBubble() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, content: "Hi there! 👋 Let me know if you need any help with your request or quote. If you are logged in, this thread connects directly to our support team!", sender_id: 'bot', message_type: 'text', role: 'admin' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isTyping]);

  // Real-time Chat Sync if user is logged in
  useEffect(() => {
    if (!user || !isOpen) return;

    fetchRealMessages();
    const interval = setInterval(fetchRealMessages, 5000); // poll every 5s
    return () => clearInterval(interval);
  }, [user, isOpen]);

  const fetchRealMessages = async () => {
    try {
      const data = await getChatMessages(user.id);
      if (data && data.length > 0) {
        setMessages(data);
      }
    } catch (err) {
      console.error("ChatBubble sync error:", err);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const text = inputValue.trim();
    setInputValue('');

    if (user) {
      setSending(true);
      try {
        await sendChatMessage(user.id, { content: text, message_type: 'text' });
        await fetchRealMessages();
      } catch (err) {
        toast.error(err.message || "Failed to send message");
      } finally {
        setSending(false);
      }
    } else {
      // Guest Simulator
      const userMsg = { id: Date.now(), content: text, sender_id: 'guest', message_type: 'text' };
      setMessages(prev => [...prev, userMsg]);
      setIsTyping(true);

      // Simulated Bot Response
      setTimeout(() => {
        const botReply = {
          id: Date.now() + 1,
          content: "Thanks for reaching out! Since you are not logged in, this is a simulated offline chat. Please log in to your account to open a live ticket with our support team.",
          sender_id: 'bot',
          message_type: 'text',
          role: 'admin'
        };
        setMessages(prev => [...prev, botReply]);
        setIsTyping(false);
      }, 1500);
    }
  };

  return (
    <div className="fixed bottom-6 left-6 z-[9999]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-18 left-0 w-80 md:w-96 bg-[#07070a]/95 backdrop-blur-xl border border-white/10 rounded-3xl shadow-[0_20px_50px_rgba(124,58,237,0.3)] flex flex-col overflow-hidden"
            style={{ height: '480px' }}
          >
            {/* Top glowing bar */}
            <div className="h-[2px] w-full bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-accent animate-pulse" />

            {/* Header */}
            <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-brand-primary to-brand-secondary flex items-center justify-center shadow-lg shadow-brand-primary/20">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                    Starlit Support
                    {user && <Sparkles className="w-3.5 h-3.5 text-brand-secondary animate-pulse" />}
                  </h3>
                  <p className="text-[10px] text-green-400 font-bold uppercase tracking-widest flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Live Chat
                  </p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-brand-bg/30 scrollbar-thin scrollbar-thumb-white/10">
              {messages.map((msg, i) => {
                const isMe = user ? (msg.sender_id === user.id) : (msg.sender_id === 'guest');
                
                // Centered system notifications
                if (msg.message_type === 'system') {
                  return (
                    <div key={msg.id || i} className="flex justify-center my-1">
                      <div className="max-w-[90%] bg-brand-primary/5 border border-brand-primary/10 rounded-2xl px-3.5 py-2 text-center">
                        <p className="text-[11px] text-gray-400 leading-relaxed">{msg.content}</p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={msg.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className="flex flex-col max-w-[80%]">
                      {!isMe && (
                        <span className="text-[9px] text-brand-primary/80 font-bold uppercase tracking-wider mb-1 ml-1">
                          {msg.role === 'admin' ? 'Support Agent' : 'System Bot'}
                        </span>
                      )}
                      <div className={`rounded-2xl px-4 py-2.5 text-xs md:text-sm leading-relaxed ${
                        isMe
                          ? 'bg-brand-primary text-white rounded-tr-none shadow-md shadow-brand-primary/10'
                          : 'bg-white/5 text-gray-200 rounded-tl-none border border-white/5'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white/5 border border-white/5 rounded-2xl rounded-tl-none px-4 py-3 flex gap-1 items-center">
                    <div className="w-1.5 h-1.5 bg-brand-secondary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-brand-secondary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-brand-secondary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white/[0.02] border-t border-white/5">
              <form onSubmit={handleSend} className="relative flex items-center">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={user ? "Type a message..." : "Log in to chat with support..."}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-4 pr-12 py-2.5 text-xs md:text-sm text-white focus:outline-none focus:border-brand-primary transition-all placeholder:text-gray-600"
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || sending || isTyping}
                  className="absolute right-1.5 w-8 h-8 rounded-xl bg-brand-primary flex items-center justify-center text-white hover:bg-brand-secondary transition-colors disabled:opacity-50"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5 -ml-0.5" />
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-gradient-to-tr from-brand-primary to-brand-secondary flex items-center justify-center shadow-[0_8px_30px_rgba(124,58,237,0.4)] hover:scale-105 transition-transform"
      >
        {isOpen ? <X className="w-6 h-6 text-white" /> : <MessageCircle className="w-6 h-6 text-white animate-pulse" />}
      </button>
    </div>
  );
}
