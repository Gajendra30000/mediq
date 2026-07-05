import React, { useState, useRef, useEffect } from 'react';
import { PageShell, Spinner } from '../../components/ui';
import { aiAPI } from '../../services/api';

export function PatientChatbot() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I am your AI health assistant. You can ask me about medicines, symptoms, or general health advice. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    
    // Add user message to UI
    const newMessages = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setLoading(true);

    try {
      // Send history to API
      const response = await aiAPI.chat(newMessages);
      setMessages([...newMessages, { role: 'assistant', content: response.data.text }]);
    } catch (err) {
      const errorText = err.response?.data?.text || 'Sorry, I am having trouble connecting right now.';
      setMessages([...newMessages, { role: 'assistant', content: errorText }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell title="AI Health Assistant" subtitle="Ask about medicines or general health advice">
      <div className="card" style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: 'calc(100vh - 180px)', 
        padding: 0,
        overflow: 'hidden'
      }}>
        
        {/* Chat History */}
        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          background: 'var(--surface-2)'
        }}>
          {messages.map((msg, idx) => (
            <div key={idx} style={{ 
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '80%',
              display: 'flex',
              flexDirection: 'column',
              gap: 4
            }}>
              <div style={{
                fontSize: 12,
                color: 'var(--text-secondary)',
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                padding: '0 4px'
              }}>
                {msg.role === 'user' ? 'You' : 'AI Assistant'}
              </div>
              <div style={{
                background: msg.role === 'user' ? 'var(--primary)' : 'var(--surface)',
                color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                padding: '12px 16px',
                borderRadius: '16px',
                borderTopRightRadius: msg.role === 'user' ? '4px' : '16px',
                borderTopLeftRadius: msg.role === 'assistant' ? '4px' : '16px',
                boxShadow: 'var(--shadow-sm)',
                fontSize: 14,
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap'
              }}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ alignSelf: 'flex-start', padding: 12 }}>
              <Spinner size={24} />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSend} style={{ 
          padding: '16px 24px', 
          background: 'var(--surface)',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          gap: 12
        }}>
          <input
            type="text"
            className="input"
            placeholder="Type your health question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            style={{ flex: 1, borderRadius: 'var(--radius-full)' }}
          />
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={!input.trim() || loading}
            style={{ borderRadius: 'var(--radius-full)', padding: '0 24px' }}
          >
            Send
          </button>
        </form>
      </div>
    </PageShell>
  );
}
