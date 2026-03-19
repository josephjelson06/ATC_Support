import React, { useEffect, useMemo, useState } from 'react';
import { MessageSquare, X, Send, Search, ThumbsUp, ThumbsDown, CheckCircle2, FileText, Star, Copy } from 'lucide-react';
import { clsx } from 'clsx';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

import { useToast } from '../../contexts/ToastContext';
import { useModal } from '../../contexts/ModalContext';
import { apiFetch, getErrorMessage } from '../../lib/api';
import { DEFAULT_WIDGET_KEY, storageKeys } from '../../lib/config';
import { formatDateTime } from '../../lib/format';
import type { ApiChatMessage, ApiChatSession, ApiTicket, WidgetFaq, WidgetFaqResponse, WidgetMessageResponse, WidgetStartResponse } from '../../lib/types';

type WidgetState = 'collapsed' | 'identity' | 'faq' | 'chat' | 'escalate' | 'success';
type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type StoredWidgetSession = {
  sessionId: number;
  identity: {
    name: string;
    email: string;
  };
  state: Extract<WidgetState, 'faq' | 'chat' | 'escalate'>;
};

const readStoredWidgetSession = (): StoredWidgetSession | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawValue = window.localStorage.getItem(storageKeys.widgetSession);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as StoredWidgetSession;
  } catch {
    return null;
  }
};

const persistWidgetSession = (value: StoredWidgetSession | null) => {
  if (typeof window === 'undefined') {
    return;
  }

  if (!value) {
    window.localStorage.removeItem(storageKeys.widgetSession);
    return;
  }

  window.localStorage.setItem(storageKeys.widgetSession, JSON.stringify(value));
};

export default function ChatWidget() {
  const [state, setState] = useState<WidgetState>('collapsed');
  const [hasNotification, setHasNotification] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [projectName, setProjectName] = useState('Loading...');
  const [faqs, setFaqs] = useState<WidgetFaq[]>([]);
  const [identity, setIdentity] = useState({ name: '', email: '' });
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ApiChatMessage[]>([]);
  const [issueTitle, setIssueTitle] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [ticketDisplayId, setTicketDisplayId] = useState('');
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(false);
  const [widgetError, setWidgetError] = useState<string | null>(null);
  const { showToast } = useToast();
  const { openModal } = useModal();

  const filteredFaqs = useMemo(
    () =>
      faqs.filter((faq) =>
        `${faq.question} ${faq.answer}`.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [faqs, searchQuery],
  );

  useEffect(() => {
    let isActive = true;

    const loadWidgetContext = async () => {
      try {
        const response = await apiFetch<WidgetFaqResponse>(`/widget/${DEFAULT_WIDGET_KEY}/faqs`, { auth: false });

        if (!isActive) {
          return;
        }

        setProjectName(response.project.name);
        setFaqs(response.faqs);
        setWidgetError(null);

        const storedSession = readStoredWidgetSession();

        if (!storedSession) {
          return;
        }

        setIsRestoringSession(true);

        try {
          const session = await apiFetch<ApiChatSession>(`/widget/${DEFAULT_WIDGET_KEY}/chat/${storedSession.sessionId}`, { auth: false });

          if (!isActive) {
            return;
          }

          if (session.status !== 'ACTIVE') {
            persistWidgetSession(null);
            return;
          }

          setIdentity({
            name: session.clientName || storedSession.identity.name,
            email: session.clientEmail || storedSession.identity.email,
          });
          setSessionId(session.id);
          setMessages(session.messages || []);
          setState(storedSession.state === 'faq' && (session.messages?.length || 0) === 0 ? 'faq' : 'chat');
          setHasNotification(false);
        } catch {
          if (!isActive) {
            return;
          }

          persistWidgetSession(null);
        } finally {
          if (isActive) {
            setIsRestoringSession(false);
          }
        }
      } catch (error) {
        if (!isActive) {
          return;
        }

        setProjectName('Support Widget');
        const message = getErrorMessage(error);
        setWidgetError(message);
        setIsRestoringSession(false);
        showToast('error', message);
      }
    };

    void loadWidgetContext();

    return () => {
      isActive = false;
    };
  }, [showToast]);

  const resetWidget = () => {
    persistWidgetSession(null);
    setState('collapsed');
    setSearchQuery('');
    setIsTyping(false);
    setFeedback(null);
    setRating(0);
    setHoverRating(0);
    setIdentity({ name: '', email: '' });
    setSessionId(null);
    setChatInput('');
    setMessages([]);
    setIssueTitle('');
    setIssueDescription('');
    setPriority('MEDIUM');
    setTicketDisplayId('');
    setWidgetError(null);
  };

  const toggleWidget = () => {
    if (state === 'collapsed') {
      setState(sessionId ? (messages.length > 0 ? 'chat' : 'faq') : 'identity');
      setHasNotification(false);
      return;
    }

    if (state === 'chat' || state === 'escalate') {
      openModal({
        title: 'Close Chat?',
        content: <p className="text-sm text-gray-600">Are you sure? Your current widget session will be closed.</p>,
        primaryAction: {
          label: 'Yes, Close',
          variant: 'danger',
          onClick: () => resetWidget(),
        },
        secondaryAction: {
          label: 'Stay',
          onClick: () => {},
        },
      });

      return;
    }

    setState('collapsed');
  };

  const handleIdentitySubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsStartingSession(true);

    try {
      const response = await apiFetch<WidgetStartResponse>(`/widget/${DEFAULT_WIDGET_KEY}/chat/start`, {
        method: 'POST',
        auth: false,
        body: identity,
      });

      setSessionId(response.sessionId);
      persistWidgetSession({
        sessionId: response.sessionId,
        identity,
        state: 'faq',
      });
      setState('faq');
      showToast('success', 'Chat session started.');
    } catch (error) {
      showToast('error', getErrorMessage(error));
    } finally {
      setIsStartingSession(false);
    }
  };

  const handleSendMessage = async () => {
    if (!sessionId || !chatInput.trim()) {
      return;
    }

    const nextUserMessage: ApiChatMessage = {
      id: Date.now(),
      role: 'USER',
      content: chatInput.trim(),
      createdAt: new Date().toISOString(),
    };

    setMessages((current) => [...current, nextUserMessage]);
    setChatInput('');
    setIsTyping(true);
    setIsSendingMessage(true);

    try {
      const response = await apiFetch<WidgetMessageResponse>(`/widget/${DEFAULT_WIDGET_KEY}/chat/message`, {
        method: 'POST',
        auth: false,
        body: {
          sessionId,
          message: nextUserMessage.content,
        },
      });

      setMessages((current) => [...current, response.message]);
      persistWidgetSession({
        sessionId,
        identity,
        state: 'chat',
      });
    } catch (error) {
      setMessages((current) => current.filter((message) => message.id !== nextUserMessage.id));
      setChatInput(nextUserMessage.content);
      showToast('error', getErrorMessage(error));
    } finally {
      setIsTyping(false);
      setIsSendingMessage(false);
    }
  };

  const handleEscalate = async () => {
    if (!identity.name || !identity.email || !issueTitle.trim()) {
      showToast('error', 'Please complete the escalation details.');
      return;
    }

    setIsSubmittingTicket(true);

    try {
      const response = await apiFetch<ApiTicket>(`/widget/${DEFAULT_WIDGET_KEY}/escalate`, {
        method: 'POST',
        auth: false,
        body: {
          sessionId: sessionId ?? undefined,
          name: identity.name,
          email: identity.email,
          title: issueTitle.trim(),
          description: issueDescription.trim() || undefined,
          priority,
        },
      });

      setTicketDisplayId(response.displayId);
      persistWidgetSession(null);
      setSessionId(null);
      setState('success');
      showToast('success', 'Ticket submitted successfully.');
    } catch (error) {
      showToast('error', getErrorMessage(error));
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  const copyTicketId = async () => {
    if (!ticketDisplayId) {
      return;
    }

    await navigator.clipboard.writeText(ticketDisplayId);
    showToast('info', 'Ticket ID copied to clipboard');
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {state !== 'collapsed' && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="w-[380px] h-[600px] max-h-[80vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden mb-4"
          >
            <header className="bg-slate-900 text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center font-bold text-sm">J</div>
                <div>
                  <h1 className="text-sm font-semibold leading-tight">{projectName}</h1>
                  <p className="text-xs text-slate-400">Julia Support Assistant</p>
                </div>
              </div>
              <button onClick={toggleWidget} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </header>

            <div className="flex-1 flex flex-col overflow-hidden">
              {state === 'identity' && (
                <div className="p-6 flex-1 flex flex-col overflow-y-auto">
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Welcome!</h2>
                    <p className="text-sm text-slate-600">Tell us who you are so Julia can start a support session for this project.</p>
                  </div>
                  {widgetError ? (
                    <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {widgetError}
                    </div>
                  ) : null}
                  {isRestoringSession ? (
                    <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      Restoring your previous widget session...
                    </div>
                  ) : null}
                  <form className="space-y-4" onSubmit={(event) => void handleIdentitySubmit(event)}>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Your Name</label>
                      <input
                        type="text"
                        required
                        value={identity.name}
                        onChange={(event) => setIdentity((current) => ({ ...current, name: event.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                        placeholder="Alex Johnson"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Your Email</label>
                      <input
                        type="email"
                        required
                        value={identity.email}
                        onChange={(event) => setIdentity((current) => ({ ...current, email: event.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                        placeholder="alex@company.com"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isStartingSession || Boolean(widgetError)}
                      className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors mt-2 shadow-sm"
                    >
                      {isStartingSession ? 'Starting…' : 'Continue'}
                    </button>
                  </form>
                  <div className="mt-auto pt-6 text-center">
                    <Link to="/submit-ticket" onClick={() => setState('collapsed')} className="text-sm text-slate-500 hover:text-orange-600 font-medium transition-colors">
                      Skip — Submit a Ticket Directly
                    </Link>
                  </div>
                </div>
              )}

              {state === 'faq' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="p-4 border-b border-slate-100">
                    {widgetError ? (
                      <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {widgetError}
                      </div>
                    ) : null}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search for help..."
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Project FAQs</p>
                    {filteredFaqs.map((faq) => (
                      <div key={faq.id} className="p-3 border border-slate-100 rounded-xl hover:border-orange-500 transition-all flex gap-3">
                        <div className="w-8 h-8 rounded bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-slate-800">{faq.question}</h3>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{faq.answer}</p>
                        </div>
                      </div>
                    ))}
                    {filteredFaqs.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-sm text-slate-500">No FAQs matched your search.</p>
                      </div>
                    )}
                  </div>
                  <div className="p-4 bg-slate-50 border-t border-slate-100">
                    <button
                      onClick={() => setState('chat')}
                      disabled={Boolean(widgetError)}
                      className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-xl transition-colors text-sm shadow-sm"
                    >
                      My issue isn't listed — Ask Julia
                    </button>
                  </div>
                </div>
              )}

              {state === 'chat' && (
                <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50">
                  <div className="p-2 bg-white border-b border-slate-100 flex justify-center">
                    <button onClick={() => setState('escalate')} className="text-xs font-medium px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-orange-600 border border-orange-200 rounded-lg transition-colors">
                      Escalate to Support
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {isRestoringSession ? (
                      <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-none text-sm max-w-[85%] shadow-sm">
                        Restoring your last conversation...
                      </div>
                    ) : null}

                    {messages.length === 0 && !isTyping && !isRestoringSession && (
                      <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-none text-sm max-w-[85%] shadow-sm">
                        Ask Julia anything about this project’s support FAQs, docs, or runbooks.
                      </div>
                    )}

                    {messages.map((message) => (
                      <div key={message.id} className={clsx('flex flex-col', message.role === 'USER' ? 'items-end' : 'items-start')}>
                        <div
                          className={clsx(
                            'p-3 rounded-2xl text-sm max-w-[85%] shadow-sm',
                            message.role === 'USER'
                              ? 'bg-orange-600 text-white rounded-tr-none'
                              : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none',
                          )}
                        >
                          <p>{message.content}</p>
                          {message.role === 'JULIA' && (
                            <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-2">
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                                Julia AI
                              </span>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => {
                                    setFeedback('up');
                                    showToast('success', 'Thanks for your feedback!');
                                  }}
                                  className={clsx('p-1 transition-colors', feedback === 'up' ? 'text-green-500' : 'text-slate-400 hover:text-green-500')}
                                >
                                  <ThumbsUp className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => {
                                    setFeedback('down');
                                    showToast('info', 'Feedback recorded.');
                                  }}
                                  className={clsx('p-1 transition-colors', feedback === 'down' ? 'text-red-500' : 'text-slate-400 hover:text-red-500')}
                                >
                                  <ThumbsDown className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1">{formatDateTime(message.createdAt)}</span>
                      </div>
                    ))}

                    {isTyping && (
                      <div className="flex items-center gap-1 bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-none w-16 shadow-sm">
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    )}
                  </div>
                  <div className="p-3 bg-white border-t border-slate-100">
                    <div className="relative">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(event) => setChatInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            void handleSendMessage();
                          }
                        }}
                        placeholder="Type your message..."
                        className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                      />
                      <button
                        onClick={() => void handleSendMessage()}
                        disabled={!chatInput.trim() || isSendingMessage}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-orange-600 p-1.5 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {state === 'escalate' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm">
                      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Project</p>
                      <p className="font-medium">{projectName}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Issue Title</label>
                      <input
                        type="text"
                        value={issueTitle}
                        onChange={(event) => setIssueTitle(event.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                      <textarea
                        rows={4}
                        value={issueDescription}
                        onChange={(event) => setIssueDescription(event.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none resize-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Priority</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as Priority[]).map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setPriority(option)}
                            className={clsx(
                              'py-2 text-sm font-medium rounded-lg border transition-colors',
                              priority === option ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50',
                            )}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="p-4 border-t border-slate-100 bg-white space-y-2">
                    <button
                      onClick={() => void handleEscalate()}
                      disabled={isSubmittingTicket}
                      className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl transition-colors text-sm shadow-sm"
                    >
                      {isSubmittingTicket ? 'Submitting…' : 'Submit Ticket'}
                    </button>
                    <button onClick={() => setState('chat')} className="w-full bg-transparent text-slate-500 hover:text-slate-700 font-medium py-2 text-sm transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {state === 'success' && (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4 text-green-500"
                  >
                    <CheckCircle2 className="w-8 h-8" />
                  </motion.div>
                  <h2 className="text-xl font-bold text-slate-900 mb-2">Ticket Submitted!</h2>
                  <div className="text-sm text-slate-600 mb-8 flex flex-col items-center gap-2">
                    <p>Ticket created successfully. You'll receive email updates.</p>
                    {ticketDisplayId && (
                      <button
                        onClick={() => void copyTicketId()}
                        className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-xs font-mono font-semibold text-orange-600 transition-colors"
                      >
                        {ticketDisplayId}
                        <Copy className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="w-full bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
                    <p className="text-xs font-semibold text-slate-700 mb-3">Rate this session</p>
                    <div className="flex justify-center gap-1">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          onMouseEnter={() => setHoverRating(value)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setRating(value)}
                          className="p-1 transition-transform active:scale-90"
                        >
                          <Star
                            className={clsx(
                              'w-6 h-6 transition-colors',
                              (hoverRating || rating) >= value ? 'fill-amber-400 text-amber-400' : 'text-slate-300',
                            )}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <button onClick={resetWidget} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm shadow-sm">
                    Close
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative group flex items-center gap-3">
        <div className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all bg-slate-800 text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg pointer-events-none whitespace-nowrap">
          Julia Support
        </div>
        <button
          onClick={toggleWidget}
          className="w-14 h-14 bg-orange-600 rounded-full shadow-xl flex items-center justify-center hover:bg-orange-700 transition-all active:scale-95 relative overflow-hidden"
        >
          <AnimatePresence mode="wait">
            {state === 'collapsed' ? (
              <motion.div key="chat" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                <MessageSquare className="w-6 h-6 text-white" />
              </motion.div>
            ) : (
              <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                <X className="w-6 h-6 text-white" />
              </motion.div>
            )}
          </AnimatePresence>
          {state === 'collapsed' && hasNotification && (
            <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
          )}
        </button>
      </div>
    </div>
  );
}
