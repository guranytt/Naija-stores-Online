import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Minimize2, Maximize2 } from 'lucide-react';

export default function FAQWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
    { role: 'assistant', content: "Hi there! I'm the Naija Online Stores AI assistant. How can I help you today?" }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen, isMinimized]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    
    const userMessage = inputValue.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInputValue('');
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/chat-faq', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: userMessage })
      });
      
      let data;
      try {
        data = await response.json();
      } catch (jsonErr) {
        throw new Error("Server returned invalid response. Please try again later.");
      }
      
      if (response.ok && data && data.success && data.answer) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
      } else {
        const errorMsg = data?.error || "I'm sorry, I couldn't process that right now. Please try again later or contact support.";
        setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }]);
      }
    } catch (err: any) {
      console.error("Chat error:", err);
      setMessages(prev => [...prev, { role: 'assistant', content: err.message || "I'm having trouble connecting to the server. Please try again later." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => { setIsOpen(true); setIsMinimized(false); }}
        className="fixed bottom-6 right-6 z-50 bg-orange-600 text-white p-4 rounded-full shadow-xl hover:bg-orange-700 transition-all hover:scale-105 active:scale-95 flex items-center justify-center"
        aria-label="Open AI Assistant"
      >
        <MessageCircle size={28} />
      </button>
    );
  }

  return (
    <div className={`fixed z-50 transition-all duration-300 ease-in-out bg-white shadow-2xl rounded-2xl overflow-hidden border border-neutral-200 flex flex-col ${isMinimized ? 'bottom-6 right-6 w-80 h-14' : 'bottom-6 right-6 w-80 sm:w-96 h-[500px] max-h-[80vh]'}`}>
      
      {/* Header */}
      <div className="bg-orange-600 text-white p-3 flex justify-between items-center shrink-0 cursor-pointer" onClick={() => isMinimized && setIsMinimized(false)}>
        <div className="flex items-center space-x-2">
          <MessageCircle size={20} />
          <span className="font-bold">AI Support</span>
        </div>
        <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
          <button 
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-orange-700 rounded-md transition-colors"
            title={isMinimized ? "Expand" : "Minimize"}
          >
            {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-orange-700 rounded-md transition-colors"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      
      {!isMinimized && (
        <>
          {/* Chat Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-50 flex flex-col">
            {messages.map((msg, idx) => (
              <div key={idx} className={`max-w-[85%] rounded-2xl px-4 py-2 ${msg.role === 'user' ? 'bg-orange-600 text-white self-end rounded-tr-sm' : 'bg-white text-neutral-800 border border-neutral-200 self-start rounded-tl-sm shadow-sm'}`}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              </div>
            ))}
            {isLoading && (
              <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-white text-neutral-800 border border-neutral-200 self-start rounded-tl-sm shadow-sm flex items-center space-x-2">
                <Loader2 size={16} className="animate-spin text-orange-600" />
                <span className="text-sm text-neutral-500">Thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input Area */}
          <div className="p-3 bg-white border-t border-neutral-200 shrink-0">
            <div className="flex items-end space-x-2">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question..."
                className="flex-1 max-h-32 min-h-[44px] resize-none rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 bg-neutral-50"
                rows={1}
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="bg-orange-600 text-white p-2.5 rounded-xl hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 h-[44px] w-[44px] flex items-center justify-center"
              >
                <Send size={18} className="ml-0.5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
