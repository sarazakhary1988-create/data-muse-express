/**
 * Enhanced Lead Enrichment UI Component
 * 
 * Professional interface for person and company enrichment with:
 * - Person/Company tabs
 * - Search with filters
 * - Disambiguation popup for multiple matches
 * - Interactive report viewer
 * - AI chatbot
 * - Export panel (7 formats)
 */

'use client';

import React, { useState } from 'react';
import { enrichPerson, enrichCompany, type EnrichmentResult, type Match } from '@/lib/manus-core/leadEnrichment';

type EnrichmentType = 'person' | 'company';

export default function EnhancedLeadEnrichment() {
  const [activeTab, setActiveTab] = useState<EnrichmentType>('person');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EnrichmentResult | null>(null);
  const [showDisambiguation, setShowDisambiguation] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ question: string; answer: string }>>([]);

  // Person form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [personCompany, setPersonCompany] = useState('');
  const [personLocation, setPersonLocation] = useState('');

  // Company form fields
  const [companyName, setCompanyName] = useState('');
  const [companyCountry, setCompanyCountry] = useState('');
  const [companyIndustry, setCompanyIndustry] = useState('');

  const handleEnrich = async () => {
    setLoading(true);
    setResult(null);
    setShowDisambiguation(false);
    setChatHistory([]);

    try {
      let enrichmentResult: EnrichmentResult;

      if (activeTab === 'person') {
        enrichmentResult = await enrichPerson({
          firstName,
          lastName,
          company: personCompany,
          location: personLocation,
        });
      } else {
        enrichmentResult = await enrichCompany({
          name: companyName,
          country: companyCountry,
          industry: companyIndustry,
        });
      }

      setResult(enrichmentResult);
      
      if (enrichmentResult.hasMultipleMatches) {
        setShowDisambiguation(true);
      }
    } catch (error) {
      console.error('Enrichment error:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMatch = async (match: Match) => {
    setLoading(true);
    setShowDisambiguation(false);

    try {
      let enrichmentResult: EnrichmentResult;

      if (activeTab === 'person') {
        enrichmentResult = await enrichPerson({ firstName, lastName, matchId: match.id });
      } else {
        enrichmentResult = await enrichCompany({ name: companyName, matchId: match.id });
      }

      setResult(enrichmentResult);
    } catch (error) {
      console.error('Enrichment error:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChatSubmit = async () => {
    if (!chatMessage.trim() || !result) return;

    const question = chatMessage;
    setChatMessage('');

    try {
      const chat = result.createChatSession();
      const answer = await chat.ask(question);
      
      setChatHistory([...chatHistory, { question, answer }]);
    } catch (error) {
      console.error('Chat error:', error);
    }
  };

  const handleExport = async (format: 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'json' | 'markdown' | 'csv') => {
    if (!result) return;

    try {
      await result.export({ format });
      alert(`Export started for ${format.toUpperCase()} format`);
    } catch (error) {
      console.error('Export error:', error);
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="enhanced-lead-enrichment">
      <style jsx>{`
        .enhanced-lead-enrichment {
          max-width: 1400px;
          margin: 0 auto;
          padding: 24px;
        }

        .header {
          margin-bottom: 32px;
        }

        .tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          border-bottom: 2px solid #e5e7eb;
        }

        .tab {
          padding: 12px 24px;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          cursor: pointer;
          font-size: 16px;
          font-weight: 500;
          color: #6b7280;
          transition: all 0.2s;
        }

        .tab:hover {
          color: #111827;
        }

        .tab.active {
          color: #2563eb;
          border-bottom-color: #2563eb;
        }

        .search-form {
          background: white;
          border-radius: 8px;
          padding: 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          margin-bottom: 24px;
        }

        .form-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-group label {
          margin-bottom: 6px;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
        }

        .form-group input {
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
        }

        .form-group input:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .enrich-button {
          padding: 12px 32px;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .enrich-button:hover {
          background: #1d4ed8;
        }

        .enrich-button:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .disambiguation-popup {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .disambiguation-content {
          background: white;
          border-radius: 12px;
          padding: 32px;
          max-width: 800px;
          max-height: 80vh;
          overflow-y: auto;
        }

        .disambiguation-title {
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 24px;
        }

        .match-card {
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 16px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .match-card:hover {
          border-color: #2563eb;
          box-shadow: 0 4px 6px rgba(37, 99, 235, 0.1);
        }

        .match-score {
          display: inline-block;
          padding: 4px 12px;
          background: #dbeafe;
          color: #1e40af;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .match-name {
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .match-details {
          color: #6b7280;
          font-size: 14px;
        }

        .results-container {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 24px;
        }

        .report-panel {
          background: white;
          border-radius: 8px;
          padding: 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .report-section {
          margin-bottom: 24px;
          padding-bottom: 24px;
          border-bottom: 1px solid #e5e7eb;
        }

        .report-section:last-child {
          border-bottom: none;
        }

        .section-title {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 12px;
          color: #111827;
        }

        .chat-panel {
          background: white;
          border-radius: 8px;
          padding: 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          display: flex;
          flex-direction: column;
        }

        .chat-history {
          flex: 1;
          overflow-y: auto;
          margin-bottom: 16px;
          max-height: 400px;
        }

        .chat-message {
          margin-bottom: 16px;
        }

        .chat-question {
          background: #f3f4f6;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 8px;
          font-weight: 500;
        }

        .chat-answer {
          padding: 12px;
          color: #374151;
          line-height: 1.6;
        }

        .chat-input {
          display: flex;
          gap: 8px;
        }

        .chat-input input {
          flex: 1;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
        }

        .chat-input button {
          padding: 10px 20px;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        }

        .export-panel {
          background: white;
          border-radius: 8px;
          padding: 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          margin-top: 24px;
        }

        .export-buttons {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          gap: 12px;
        }

        .export-button {
          padding: 10px;
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          cursor: pointer;
          text-align: center;
          transition: all 0.2s;
        }

        .export-button:hover {
          background: #e5e7eb;
          border-color: #2563eb;
        }

        .loading {
          text-align: center;
          padding: 40px;
          color: #6b7280;
        }
      `}</style>

      <div className="header">
        <h1>Lead Enrichment</h1>
        <p>Comprehensive person and company profile enrichment</p>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'person' ? 'active' : ''}`}
          onClick={() => setActiveTab('person')}
        >
          👤 Person
        </button>
        <button
          className={`tab ${activeTab === 'company' ? 'active' : ''}`}
          onClick={() => setActiveTab('company')}
        >
          🏢 Company
        </button>
      </div>

      <div className="search-form">
        {activeTab === 'person' ? (
          <>
            <div className="form-row">
              <div className="form-group">
                <label>First Name *</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                />
              </div>
              <div className="form-group">
                <label>Last Name *</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Smith"
                />
              </div>
              <div className="form-group">
                <label>Company (Optional)</label>
                <input
                  type="text"
                  value={personCompany}
                  onChange={(e) => setPersonCompany(e.target.value)}
                  placeholder="Tech Corp"
                />
              </div>
              <div className="form-group">
                <label>Location (Optional)</label>
                <input
                  type="text"
                  value={personLocation}
                  onChange={(e) => setPersonLocation(e.target.value)}
                  placeholder="Dubai, UAE"
                />
              </div>
            </div>
            <button
              className="enrich-button"
              onClick={handleEnrich}
              disabled={loading || !firstName || !lastName}
            >
              {loading ? 'Enriching...' : '🚀 Enrich Person'}
            </button>
          </>
        ) : (
          <>
            <div className="form-row">
              <div className="form-group">
                <label>Company Name *</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Saudi Aramco"
                />
              </div>
              <div className="form-group">
                <label>Country (Optional)</label>
                <input
                  type="text"
                  value={companyCountry}
                  onChange={(e) => setCompanyCountry(e.target.value)}
                  placeholder="Saudi Arabia"
                />
              </div>
              <div className="form-group">
                <label>Industry (Optional)</label>
                <input
                  type="text"
                  value={companyIndustry}
                  onChange={(e) => setCompanyIndustry(e.target.value)}
                  placeholder="Oil & Gas"
                />
              </div>
            </div>
            <button
              className="enrich-button"
              onClick={handleEnrich}
              disabled={loading || !companyName}
            >
              {loading ? 'Enriching...' : '🚀 Enrich Company'}
            </button>
          </>
        )}
      </div>

      {loading && (
        <div className="loading">
          <div>⏳ Enriching data from multiple sources...</div>
        </div>
      )}

      {showDisambiguation && result?.matches && (
        <div className="disambiguation-popup" onClick={() => setShowDisambiguation(false)}>
          <div className="disambiguation-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="disambiguation-title">
              Multiple matches found - Please select the correct one:
            </h2>
            {result.matches.map((match) => (
              <div
                key={match.id}
                className="match-card"
                onClick={() => handleSelectMatch(match)}
              >
                <div className="match-score">
                  {match.score >= 0.9 ? '🏆 ' : ''}
                  {Math.round(match.score * 100)}% Match
                </div>
                <div className="match-name">{match.name}</div>
                <div className="match-details">
                  {match.title && `${match.title}${match.company ? ' at ' + match.company : ''}`}
                  {match.location && ` | ${match.location}`}
                  {match.industry && ` | ${match.industry}`}
                </div>
                {match.preview.headline && (
                  <div className="match-details" style={{ marginTop: '8px' }}>
                    {match.preview.headline}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {result && !result.hasMultipleMatches && (
        <>
          <div className="results-container">
            <div className="report-panel">
              <h2>Enrichment Report</h2>
              
              {result.profile && (
                <div className="report-section">
                  <h3 className="section-title">Profile</h3>
                  <div>
                    <strong>{result.profile.name}</strong>
                    <br />
                    {result.profile.title && <div>{result.profile.title}</div>}
                    {result.profile.company && <div>{result.profile.company}</div>}
                    {result.profile.location && <div>📍 {result.profile.location}</div>}
                    {result.profile.summary && <p>{result.profile.summary}</p>}
                  </div>
                </div>
              )}

              {result.experience && result.experience.length > 0 && (
                <div className="report-section">
                  <h3 className="section-title">Experience</h3>
                  {result.experience.map((exp, i) => (
                    <div key={i} style={{ marginBottom: '12px' }}>
                      <div><strong>{exp.title}</strong> at {exp.company}</div>
                      <div style={{ color: '#6b7280', fontSize: '14px' }}>{exp.duration}</div>
                      {exp.description && <p>{exp.description}</p>}
                    </div>
                  ))}
                </div>
              )}

              {result.news && result.news.length > 0 && (
                <div className="report-section">
                  <h3 className="section-title">Recent News ({result.news.length})</h3>
                  {result.news.slice(0, 5).map((article, i) => (
                    <div key={i} style={{ marginBottom: '12px' }}>
                      <div><strong>{article.title}</strong></div>
                      <div style={{ color: '#6b7280', fontSize: '14px' }}>
                        {article.source} | {article.date}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {result.dataQuality && (
                <div className="report-section">
                  <h3 className="section-title">Data Quality</h3>
                  <div>Score: {Math.round(result.dataQuality.score * 100)}%</div>
                  <div>Completeness: {Math.round(result.dataQuality.completeness * 100)}%</div>
                  {result.dataQuality.missingSections.length > 0 && (
                    <div style={{ color: '#dc2626', marginTop: '8px' }}>
                      Missing: {result.dataQuality.missingSections.join(', ')}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <div className="chat-panel">
                <h3>💬 AI Chat</h3>
                <div className="chat-history">
                  {chatHistory.length === 0 && (
                    <div style={{ color: '#6b7280', textAlign: 'center', padding: '20px' }}>
                      Ask questions about the enriched data
                    </div>
                  )}
                  {chatHistory.map((msg, i) => (
                    <div key={i} className="chat-message">
                      <div className="chat-question">Q: {msg.question}</div>
                      <div className="chat-answer">A: {msg.answer}</div>
                    </div>
                  ))}
                </div>
                <div className="chat-input">
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleChatSubmit()}
                    placeholder="Ask about this profile..."
                  />
                  <button onClick={handleChatSubmit}>Send</button>
                </div>
              </div>

              <div className="export-panel">
                <h3>💾 Export</h3>
                <div className="export-buttons">
                  <button className="export-button" onClick={() => handleExport('pdf')}>
                    📄 PDF
                  </button>
                  <button className="export-button" onClick={() => handleExport('docx')}>
                    📝 Word
                  </button>
                  <button className="export-button" onClick={() => handleExport('xlsx')}>
                    📊 Excel
                  </button>
                  <button className="export-button" onClick={() => handleExport('pptx')}>
                    📽️ PowerPoint
                  </button>
                  <button className="export-button" onClick={() => handleExport('json')}>
                    {} JSON
                  </button>
                  <button className="export-button" onClick={() => handleExport('markdown')}>
                    📋 Markdown
                  </button>
                  <button className="export-button" onClick={() => handleExport('csv')}>
                    📈 CSV
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
