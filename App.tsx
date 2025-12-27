
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { SubjectGrade, RecommendationResponse, ChatMessage } from './types';
import { getCareerRecommendations, createAdvisorChat } from './services/geminiService';

const COMMON_SUBJECTS = [
  "Mathematics", "English", "Physics", "Chemistry", "Biology", 
  "History", "Geography", "Computer Science", "Economics", 
  "Art", "Music", "Psychology", "Sociology", "Business Studies"
];

export default function App() {
  const [subjects, setSubjects] = useState<SubjectGrade[]>([
    { id: crypto.randomUUID(), name: '', grade: '' }
  ]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecommendationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const chatInstance = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const addSubject = () => {
    setSubjects([...subjects, { id: crypto.randomUUID(), name: '', grade: '' }]);
  };

  const removeSubject = (id: string) => {
    if (subjects.length > 1) {
      setSubjects(subjects.filter(s => s.id !== id));
    }
  };

  const updateSubject = (id: string, field: keyof SubjectGrade, value: string) => {
    // For grade, ensure it's a valid percentage if provided
    if (field === 'grade' && value !== '') {
      const num = parseInt(value);
      if (isNaN(num) || num < 0 || num > 100) return;
    }
    setSubjects(subjects.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validSubjects = subjects.filter(s => s.name && s.grade);
    
    if (validSubjects.length < 3) {
      setError("Please add at least 3 subjects with grades for a better analysis.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setChatMessages([]);

    try {
      // Append % to grades for context
      const subjectsWithPercent = validSubjects.map(s => ({ ...s, grade: `${s.grade}%` }));
      const recommendations = await getCareerRecommendations(subjectsWithPercent);
      setResult(recommendations);
      // Initialize chat session
      chatInstance.current = createAdvisorChat(recommendations, subjectsWithPercent);
      setChatMessages([{ role: 'model', text: "I've analyzed your subjects and percentages! Feel free to ask me anything about these career paths or how to get started." }]);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isChatting || !chatInstance.current) return;

    const message = userInput.trim();
    setUserInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: message }]);
    setIsChatting(true);

    try {
      const streamResponse = await chatInstance.current.sendMessageStream({ message });
      let fullText = '';
      
      // Add empty message placeholder for streaming
      setChatMessages(prev => [...prev, { role: 'model', text: '' }]);

      for await (const chunk of streamResponse) {
        fullText += chunk.text;
        setChatMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { role: 'model', text: fullText };
          return newMessages;
        });
      }
    } catch (err) {
      console.error("Chat error:", err);
      setChatMessages(prev => [...prev, { role: 'model', text: "I'm sorry, I encountered an error. Could you try rephrasing that?" }]);
    } finally {
      setIsChatting(false);
    }
  };

  const handleReset = () => {
    setSubjects([{ id: crypto.randomUUID(), name: '', grade: '' }]);
    setResult(null);
    setError(null);
    setChatMessages([]);
    chatInstance.current = null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-sky-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block p-2 bg-indigo-600 rounded-2xl mb-4 shadow-lg shadow-indigo-200">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight sm:text-5xl">
            PathFinder <span className="text-indigo-600">AI</span>
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Map your high school achievements to your future success.
          </p>
        </div>

        {!result ? (
          <div className="bg-white shadow-2xl rounded-3xl overflow-hidden border border-slate-100">
            <div className="px-6 py-8 sm:p-10">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-xl font-semibold text-slate-800">Your Academics</h2>
                    <span className="text-sm text-slate-400 font-medium">Add at least 3 subjects</span>
                  </div>
                  
                  {subjects.map((subject, index) => (
                    <div key={subject.id} className="flex gap-4 items-start group">
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Subject</label>
                        <div className="relative">
                          <input
                            type="text"
                            list="subject-list"
                            placeholder="e.g. Mathematics"
                            className="block w-full rounded-xl border-slate-200 bg-slate-50 py-3 px-4 text-slate-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm transition-all outline-none border focus:bg-white"
                            value={subject.name}
                            onChange={(e) => updateSubject(subject.id, 'name', e.target.value)}
                            required
                          />
                          <datalist id="subject-list">
                            {COMMON_SUBJECTS.map(s => <option key={s} value={s} />)}
                          </datalist>
                        </div>
                      </div>
                      <div className="w-24 sm:w-32">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Grade (%)</label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="0-100"
                            className="block w-full rounded-xl border-slate-200 bg-slate-50 py-3 pl-4 pr-8 text-slate-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm transition-all outline-none border focus:bg-white appearance-none"
                            value={subject.grade}
                            onChange={(e) => updateSubject(subject.id, 'grade', e.target.value)}
                            required
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <span className="text-slate-400 text-sm font-bold">%</span>
                          </div>
                        </div>
                      </div>
                      <div className="pt-6">
                        <button
                          type="button"
                          onClick={() => removeSubject(subject.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          disabled={subjects.length === 1}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <button
                    type="button"
                    onClick={addSubject}
                    className="flex-1 inline-flex justify-center items-center px-6 py-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-600 font-semibold hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-200"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Subject
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className={`flex-1 inline-flex justify-center items-center px-6 py-4 border border-transparent rounded-xl shadow-lg text-white font-bold bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Analyzing...
                      </>
                    ) : (
                      'Generate Recommendations'
                    )}
                  </button>
                </div>

                {error && (
                  <div className="p-4 rounded-xl bg-red-50 border border-red-100 flex items-center gap-3">
                    <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-red-600 font-medium">{error}</p>
                  </div>
                )}
              </form>
            </div>
          </div>
        ) : (
          <div className="space-y-8 pb-12">
            {/* Results Summary */}
            <div className="bg-white rounded-3xl p-8 shadow-xl border border-indigo-100">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-slate-900">Your Path Analysis</h2>
                <button 
                  onClick={handleReset}
                  className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Start Over
                </button>
              </div>
              <div className="text-slate-600 leading-relaxed text-lg prose prose-indigo max-w-none">
                <ReactMarkdown>{result.overallSummary}</ReactMarkdown>
              </div>
            </div>

            {/* Career Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {result.recommendations.map((career, idx) => (
                <div key={idx} className="bg-white rounded-3xl p-6 shadow-lg border border-slate-100 hover:shadow-2xl hover:border-indigo-200 transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-indigo-50 rounded-2xl group-hover:bg-indigo-600 transition-colors">
                      <svg className="w-6 h-6 text-indigo-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                      career.growthPotential === 'High' ? 'bg-emerald-50 text-emerald-700' : 
                      career.growthPotential === 'Medium' ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-700'
                    }`}>
                      {career.growthPotential} Growth
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{career.title}</h3>
                  <p className="text-slate-600 text-sm mb-4">{career.description}</p>
                  
                  <div className="mb-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Why this fits</h4>
                    <p className="text-slate-700 text-sm italic">"{career.whyFit}"</p>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Next Steps</h4>
                    <ul className="space-y-2">
                      {career.nextSteps.map((step, sIdx) => (
                        <li key={sIdx} className="flex items-center gap-2 text-sm text-slate-600">
                          <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>

            {/* AI Advisor Chat Section */}
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden flex flex-col h-[600px]">
              <div className="bg-indigo-600 px-6 py-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-bold">Career Advisor AI</h3>
                  <p className="text-indigo-100 text-xs">Ask me anything about your recommendations</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm ${
                      msg.role === 'user' 
                        ? 'bg-indigo-600 text-white rounded-br-none shadow-md' 
                        : 'bg-white text-slate-800 rounded-bl-none shadow-sm border border-slate-100 prose-chat'
                    }`}>
                      {msg.role === 'model' ? (
                        <ReactMarkdown>{msg.text || '...'}</ReactMarkdown>
                      ) : (
                        msg.text
                      )}
                      {isChatting && i === chatMessages.length - 1 && !msg.text && (
                        <span className="flex gap-1 py-1">
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-100 flex gap-2">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Ask a question..."
                  disabled={isChatting}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
                <button
                  type="submit"
                  disabled={isChatting || !userInput.trim()}
                  className="bg-indigo-600 text-white p-2 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md active:scale-95"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </form>
            </div>

            {/* Bottom Reset */}
            <div className="flex justify-center pt-8">
              <button 
                onClick={handleReset}
                className="px-8 py-3 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 shadow-xl transition-all"
              >
                Analyze New Set of Grades
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <footer className="mt-12 text-center text-slate-400 text-sm font-medium pb-8">
        Powered by Gemini AI • Always consult with a human academic advisor.
      </footer>
    </div>
  );
}
