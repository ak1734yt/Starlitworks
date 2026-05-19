import { useState, useEffect, useRef } from 'react';
import { 
  Send, Image, Mic, Link as LinkIcon, X, 
  Download, Play, Pause, Paperclip, Loader2,
  Check, CheckCheck, Smile, MessageSquare, Square
} from 'lucide-react';
import { getChatMessages, sendChatMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

export default function UserChat({ userId, onClose }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, [userId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const fetchMessages = async () => {
    try {
      const data = await getChatMessages(userId);
      setMessages(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !attachment) return;

    setSending(true);
    try {
      const payload = {
        content: newMessage,
        message_type: attachment ? attachment.type : 'text',
        base64Data: attachment ? attachment.base64 : null
      };
      await sendChatMessage(userId, payload);
      setNewMessage('');
      setAttachment(null);
      fetchMessages();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File exceeds 10MB limit.');
      return;
    }

    const isImage = file.type.startsWith('image/');
    const isAudio = file.type.startsWith('audio/');
    const actualType = isImage ? 'media' : (isAudio ? 'voice' : 'link');

    const reader = new FileReader();
    reader.onloadend = () => {
      setAttachment({
        name: file.name,
        type: actualType,
        base64: reader.result
      });
    };
    reader.readAsDataURL(file);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          setAttachment({
            name: `Voice_Note_${new Date().getTime()}.webm`,
            type: 'voice',
            base64: reader.result
          });
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      toast.error('Microphone access denied or not supported.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingIntervalRef.current);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="flex flex-col h-full bg-[#0A0A0A] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-primary/20 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-brand-primary" />
          </div>
          <div>
            <h3 className="font-bold text-sm">Support Chat</h3>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">#{userId}</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-all">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-2 opacity-50">
            <div className="p-4 bg-white/5 rounded-full mb-2">
              <Smile className="w-8 h-8" />
            </div>
            <p className="text-sm">No messages yet.</p>
            <p className="text-xs">Start the conversation with us.</p>
          </div>
        ) : messages.map((msg, idx) => {
          const isMe = msg.sender_id === user.id;

          // System auto-responder messages — centered banner style
          if (msg.message_type === 'system') {
            return (
              <div key={msg.id} className="flex justify-center my-1">
                <div className="max-w-[85%] bg-brand-primary/5 border border-brand-primary/20 rounded-2xl px-4 py-2.5 text-center">
                  <p className="text-xs text-gray-300 leading-relaxed">{msg.content}</p>
                  <span className="text-[9px] text-gray-600 mt-1 block">
                    {new Date(msg.created_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                {!isMe && (
                  <span className={`text-[10px] mb-1 ml-2 font-bold uppercase tracking-wider ${
                    msg.role === 'admin' ? 'text-blue-400' : 
                    msg.role === 'manager' ? 'text-brand-secondary' : 
                    'text-gray-500'
                  }`}>
                    {msg.role === 'admin' ? 'Admin Message' : 
                     msg.role === 'manager' ? 'Manager Message' : 
                     msg.name}
                  </span>
                )}
                <div className={`px-4 py-2 rounded-2xl text-sm relative group ${
                  isMe 
                  ? 'bg-brand-primary text-white rounded-tr-none shadow-[0_5px_15px_rgba(124,58,237,0.2)]' 
                  : 'bg-white/5 text-gray-200 border border-white/10 rounded-tl-none'
                }`}>
                  {msg.message_type !== 'text' && (
                    <div className="absolute -top-2 -right-2 w-5 h-5 bg-black/80 border border-white/10 rounded-full flex items-center justify-center">
                      {msg.message_type === 'media' && <Image className="w-3 h-3 text-brand-primary" />}
                      {msg.message_type === 'voice' && <Mic className="w-3 h-3 text-brand-secondary" />}
                      {msg.message_type === 'link' && <LinkIcon className="w-3 h-3 text-blue-400" />}
                    </div>
                  )}
                  {msg.message_type === 'text' && <p>{msg.content}</p>}
                  
                  {msg.message_type === 'media' && (
                    <div className="space-y-2">
                      <img src={msg.content} alt="Attachment" className="max-w-full rounded-lg border border-white/10 shadow-lg" />
                      <a href={msg.content} download className="flex items-center gap-2 text-[10px] opacity-70 hover:opacity-100 transition-opacity">
                        <Download className="w-3 h-3" /> Download Image
                      </a>
                    </div>
                  )}

                  {msg.message_type === 'voice' && (
                    <div className="flex items-center gap-3 min-w-[200px] py-1">
                      <audio src={msg.content} controls className="h-8 w-full opacity-80" />
                    </div>
                  )}

                  {msg.message_type === 'link' && (
                    <a href={msg.content} target="_blank" rel="noreferrer" className="flex items-center gap-2 underline decoration-brand-secondary/50 underline-offset-4">
                      <LinkIcon className="w-3 h-3" /> {msg.content}
                    </a>
                  )}
                </div>
                <span className="text-[9px] text-gray-600 mt-1 px-1">
                  {new Date(msg.created_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white/[0.02] border-t border-white/10">
        {attachment && (
          <div className="mb-3 p-2 bg-brand-primary/10 border border-brand-primary/20 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              {attachment.type === 'media' ? <Image className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              <span className="text-xs font-medium truncate max-w-[150px]">{attachment.name}</span>
            </div>
            <button onClick={() => setAttachment(null)} className="p-1 hover:bg-white/10 rounded-lg">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-all"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={(e) => handleFileChange(e, 'media')} 
              accept="image/*,video/*,audio/*,.pdf"
            />
          </div>

          <div className="flex-1 relative flex items-center">
            {isRecording ? (
              <div className="flex-1 flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
                <div className="flex items-center gap-2 text-red-500">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-sm font-mono">{formatTime(recordingTime)}</span>
                </div>
                <button 
                  type="button" 
                  onClick={stopRecording}
                  className="p-1 hover:bg-red-500/20 rounded-lg text-red-400"
                >
                  <Square className="w-4 h-4 fill-current" />
                </button>
              </div>
            ) : (
              <input 
                type="text" 
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-primary transition-all pr-12"
              />
            )}
            {!isRecording && !newMessage && (
              <button 
                type="button"
                onClick={startRecording}
                className="absolute right-2 p-1.5 text-gray-400 hover:text-brand-primary transition-colors"
              >
                <Mic className="w-4 h-4" />
              </button>
            )}
          </div>

          <button 
            type="submit" 
            disabled={sending || (!newMessage.trim() && !attachment)}
            className="p-2.5 bg-brand-primary rounded-xl hover:shadow-[0_0_15px_rgba(124,58,237,0.4)] transition-all disabled:opacity-50 disabled:hover:shadow-none"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
