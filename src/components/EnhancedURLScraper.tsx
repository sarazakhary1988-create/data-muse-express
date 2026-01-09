/**
 * Enhanced URL Scraper Component
 * 
 * Streamlined interface with:
 * - Single prompt input
 * - AI enhancement
 * - Multi-URL management
 * - Smart filters
 * - Real-time progress
 * - Interactive chat
 * - Export options
 */

'use client';

import { useState } from 'react';
import { IntelligentScraper, type ScraperOptions, type ScraperResult } from '@/lib/manus-core/intelligentScraper';

export function EnhancedURLScraper() {
  const [prompt, setPrompt] = useState('');
  const [urls, setUrls] = useState<string[]>(['']);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ScraperResult | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string }>>([]);
  
  // Options
  const [options, setOptions] = useState<ScraperOptions>({
    maxDepth: 2,
    maxPages: 50,
    timeout: 30,
    filters: {
      extractText: true,
      extractTables: true,
      extractContact: true,
      extractLinks: true,
    },
  });
  
  const handleEnhancePrompt = async () => {
    setIsEnhancing(true);
    // TODO: Call AI enhancement
    setTimeout(() => {
      setPrompt(`Extract comprehensive information including:\n- Main content and text\n- Structured data and tables\n- Contact information\n- Related links and resources`);
      setIsEnhancing(false);
    }, 1000);
  };
  
  const handleAddURL = () => {
    setUrls([...urls, '']);
  };
  
  const handleRemoveURL = (index: number) => {
    setUrls(urls.filter((_, i) => i !== index));
  };
  
  const handleUpdateURL = (index: number, value: string) => {
    const newURLs = [...urls];
    newURLs[index] = value;
    setUrls(newURLs);
  };
  
  const handleScrape = async () => {
    setIsScraping(true);
    setProgress(0);
    
    const scraper = new IntelligentScraper();
    urls.filter(u => u.trim()).forEach(url => scraper.addURL(url));
    
    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(p => Math.min(p + 10, 90));
    }, 500);
    
    const scraperResult = await scraper.execute({
      prompt,
      options,
    });
    
    clearInterval(progressInterval);
    setProgress(100);
    setResult(scraperResult);
    setIsScraping(false);
  };
  
  const handleChat = async () => {
    if (!result || !chatInput.trim()) return;
    
    const chat = result.createChatSession();
    const answer = await chat.ask(chatInput);
    
    setChatMessages([
      ...chatMessages,
      { role: 'user', content: chatInput },
      { role: 'assistant', content: answer },
    ]);
    setChatInput('');
  };
  
  const handleExport = async (format: 'pdf' | 'json' | 'markdown' | 'csv') => {
    if (!result) return;
    
    await result.export({
      format,
      includeAnalysis: true,
      filename: `scraper-report.${format}`,
    });
  };
  
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Intelligent URL Scraper</h2>
        <p className="text-gray-600">
          Extract data from any webpage with AI-powered intelligence
        </p>
      </div>
      
      {/* Prompt Input */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">
          📝 What would you like to extract?
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Example: Extract company information including financials and leadership team"
          className="w-full p-3 border rounded-lg resize-none"
          rows={3}
        />
        <button
          onClick={handleEnhancePrompt}
          disabled={isEnhancing}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          {isEnhancing ? '✨ Enhancing...' : '✨ AI Enhance Prompt'}
        </button>
      </div>
      
      {/* Filters */}
      <div className="border rounded-lg p-4 space-y-3">
        <h3 className="font-medium">⚙️ Filters</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={options.filters?.extractText}
              onChange={(e) => setOptions({
                ...options,
                filters: { ...options.filters, extractText: e.target.checked },
              })}
            />
            <span>Extract Text</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={options.filters?.extractTables}
              onChange={(e) => setOptions({
                ...options,
                filters: { ...options.filters, extractTables: e.target.checked },
              })}
            />
            <span>Extract Tables</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={options.filters?.extractContact}
              onChange={(e) => setOptions({
                ...options,
                filters: { ...options.filters, extractContact: e.target.checked },
              })}
            />
            <span>Extract Contact</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={options.filters?.extractLinks}
              onChange={(e) => setOptions({
                ...options,
                filters: { ...options.filters, extractLinks: e.target.checked },
              })}
            />
            <span>Extract Links</span>
          </label>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm">Max Depth</label>
            <input
              type="number"
              value={options.maxDepth}
              onChange={(e) => setOptions({ ...options, maxDepth: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border rounded"
              min="1"
              max="5"
            />
          </div>
          
          <div>
            <label className="block text-sm">Max Pages</label>
            <input
              type="number"
              value={options.maxPages}
              onChange={(e) => setOptions({ ...options, maxPages: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border rounded"
              min="10"
              max="500"
            />
          </div>
          
          <div>
            <label className="block text-sm">Timeout (s)</label>
            <input
              type="number"
              value={options.timeout}
              onChange={(e) => setOptions({ ...options, timeout: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border rounded"
              min="10"
              max="120"
            />
          </div>
        </div>
      </div>
      
      {/* URL Management */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">🔗 URLs to Scrape</label>
        
        {urls.map((url, index) => (
          <div key={index} className="flex space-x-2">
            <input
              type="url"
              value={url}
              onChange={(e) => handleUpdateURL(index, e.target.value)}
              placeholder="https://example.com"
              className="flex-1 px-3 py-2 border rounded-lg"
            />
            {urls.length > 1 && (
              <button
                onClick={() => handleRemoveURL(index)}
                className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        
        <button
          onClick={handleAddURL}
          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
        >
          + Add URL
        </button>
      </div>
      
      {/* Start Button */}
      <button
        onClick={handleScrape}
        disabled={isScraping || !prompt || urls.filter(u => u.trim()).length === 0}
        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg text-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
      >
        {isScraping ? '🔄 Scraping...' : '🚀 Start Scraping'}
      </button>
      
      {/* Progress */}
      {isScraping && (
        <div className="border rounded-lg p-4">
          <h3 className="font-medium mb-2">Progress</h3>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className="bg-blue-600 h-4 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-2">{progress}% Complete</p>
        </div>
      )}
      
      {/* Results */}
      {result && result.success && (
        <div className="space-y-4">
          <div className="border rounded-lg p-4">
            <h3 className="font-bold text-lg mb-2">📊 Report</h3>
            {result.report && (
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium">Summary</h4>
                  <p className="text-gray-700">{result.report.summary}</p>
                </div>
                
                <div>
                  <h4 className="font-medium">Key Findings</h4>
                  <ul className="list-disc list-inside">
                    {result.report.keyFindings.map((finding, i) => (
                      <li key={i}>{finding}</li>
                    ))}
                  </ul>
                </div>
                
                <div className="flex space-x-2">
                  <button onClick={() => handleExport('pdf')} className="px-3 py-1 bg-red-500 text-white rounded">
                    📄 PDF
                  </button>
                  <button onClick={() => handleExport('json')} className="px-3 py-1 bg-blue-500 text-white rounded">
                    📦 JSON
                  </button>
                  <button onClick={() => handleExport('markdown')} className="px-3 py-1 bg-green-500 text-white rounded">
                    📝 Markdown
                  </button>
                  <button onClick={() => handleExport('csv')} className="px-3 py-1 bg-yellow-500 text-white rounded">
                    📊 CSV
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Chat */}
          <div className="border rounded-lg p-4">
            <h3 className="font-bold text-lg mb-2">💬 AI Chat</h3>
            
            <div className="space-y-2 mb-3 max-h-60 overflow-y-auto">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`p-2 rounded ${msg.role === 'user' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                  <span className="font-medium">{msg.role === 'user' ? 'You' : 'AI'}:</span> {msg.content}
                </div>
              ))}
            </div>
            
            <div className="flex space-x-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleChat()}
                placeholder="Ask a question about the scraped data..."
                className="flex-1 px-3 py-2 border rounded-lg"
              />
              <button
                onClick={handleChat}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
