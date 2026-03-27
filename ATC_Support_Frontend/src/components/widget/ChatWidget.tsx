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
import { buildWidgetRequestHeaders } from '../../lib/widgetRuntime';
import type { ApiChatMessage, ApiChatSession, ApiTicket, WidgetFaq, WidgetFaqResponse, WidgetMessageResponse, WidgetStartResponse } from '../../lib/types';

type WidgetState = 'collapsed' | 'identity' | 'faq' | 'chat' | 'escalate' | 'success';
type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type WidgetMode = 'floating' | 'embedded';

type ChatWidgetProps = {
  widgetKey?: string;
  mode?: WidgetMode;
  startOpen?: boolean;
  hostOrigin?: string;
};

type StoredWidgetSession = {
  sessionId: number;
  identity: {
    name: string;
    email: string;
  };
  state: Extract<WidgetState, 'faq' | 'chat' | 'escalate'>;
};

const getWidgetSessionStorageKey = (widgetKey: string) => `${storageKeys.widgetSession}:${widgetKey}`;

const readStoredWidgetSession = (widgetKey: string): StoredWidgetSession | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawValue = window.localStorage.getItem(getWidgetSessionStorageKey(widgetKey));

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as StoredWidgetSession;
  } catch {
    return null;
  }
};

const persistWidgetSession = (widgetKey: string, value: StoredWidgetSession | null) => {
  if (typeof window === 'undefined') {
    return;
  }

  const storageKey = getWidgetSessionStorageKey(widgetKey);

  if (!value) {
    window.localStorage.removeItem(storageKey);
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(value));
};

export default function ChatWidget({ widgetKey, mode = 'floating', startOpen = false, hostOrigin }: ChatWidgetProps) {
  const activeWidgetKey = widgetKey || DEFAULT_WIDGET_KEY;
  const isEmbedded = mode === 'embedded';
  const { showToast } = useToast();
  const { openModal } = useModal();
  const widgetRequestHeaders = useMemo(
    () => buildWidgetRequestHeaders(hostOrigin || (typeof window !== 'undefined' ? window.location.origin : '')),
    [hostOrigin],
  );

  const [state, setState] = useState<WidgetState>(isEmbedded || startOpen ? 'identity' : 'collapsed');
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

  const filteredFaqs = useMemo(
    () => faqs.filter((faq) => `${faq.question} ${faq.answer}`.toLowerCase().includes(searchQuery.toLowerCase())),
    [faqs, searchQuery],
  );

  useEffect(() => {
    let isActive = true;

    const loadWidgetContext = async () => {
      try {
        const response = await apiFetch<WidgetFaqResponse>(`/widget/${activeWidgetKey}/faqs`, {
          auth: false,
          headers: widgetRequestHeaders,
        });

        if (!isActive) {
          return;
        }

        setProjectName(response.project.name);
        setFaqs(response.faqs);
        setWidgetError(null);

        const storedSession = readStoredWidgetSession(activeWidgetKey);

        if (!storedSession) {
          return;
        }

        setIsRestoringSession(true);

        try {
          const session = await apiFetch<ApiChatSession>(`/widget/${activeWidgetKey}/chat/${storedSession.sessionId}`, {
            auth: false,
            headers: widgetRequestHeaders,
          });

          if (!isActive) {
            return;
          }

          if (session.status !== 'ACTIVE') {
            persistWidgetSession(activeWidgetKey, null);
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

          persistWidgetSession(activeWidgetKey, null);
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
  }, [activeWidgetKey, showToast, widgetRequestHeaders]);

  const requestEmbeddedClose = () => {
    if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'ATC_WIDGET_CLOSE', widgetKey: activeWidgetKey }, '*');
    }
  };

  const resetWidget = () => {
    persistWidgetSession(activeWidgetKey, null);
    setState(isEmbedded || startOpen ? 'identity' : 'collapsed');
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
    if (isEmbedded) {
      requestEmbeddedClose();
      return;
    }

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
      const response = await apiFetch<WidgetStartResponse>(`/widget/${activeWidgetKey}/chat/start`, {
        method: 'POST',
        auth: false,
        headers: widgetRequestHeaders,
        body: identity,
      });

      setSessionId(response.sessionId);
      persistWidgetSession(activeWidgetKey, {
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
      const response = await apiFetch<WidgetMessageResponse>(`/widget/${activeWidgetKey}/chat/message`, {
        method: 'POST',
        auth: false,
        headers: widgetRequestHeaders,
        body: {
          sessionId,
          message: nextUserMessage.content,
        },
      });

      setMessages((current) => [...current, response.message]);
      persistWidgetSession(activeWidgetKey, {
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
      const response = await apiFetch<ApiTicket>(`/widget/${activeWidgetKey}/escalate`, {
        method: 'POST',
        auth: false,
        headers: widgetRequestHeaders,
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
      persistWidgetSession(activeWidgetKey, null);
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

  const panelClasses = clsx(
    'flex flex-col overflow-hidden bg-white',
    isEmbedded
      ? 'h-full w-full rounded-[24px] border border-slate-200 shadow-xl'
      : 'mb-3 h-[calc(100dvh-6rem)] w-[calc(100vw-2rem)] max-w-[24rem] rounded-3xl border border-slate-200 shadow-2xl sm:mb-4 sm:h-[600px] sm:max-h-[80vh] sm:w-[380px]',
  );

  const panelContent = (
    <div className={panelClasses}>
      <header className="flex shrink-0 items-center justify-between bg-slate-900 p-4 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-600 text-sm font-bold">J</div>
          <div>
            <h1 className="text-sm font-semibold leading-tight">{projectName}</h1>
            <p className="text-xs text-slate-400">Julia Support Assistant</p>
          </div>
        </div>
        <button onClick={toggleWidget} className="text-slate-400 transition-colors hover:text-white">
          <X className="h-5 w-5" />
        </button>
      </header>

      <div className="flex flex-1 flex-col overflow-hidden">
        {state === 'identity' && (
          <div className="flex flex-1 flex-col overflow-y-auto p-6">
            <div className="mb-6">
              <h2 className="mb-2 text-xl font-bold text-slate-800">Welcome!</h2>
              <p className="text-sm text-slate-600">Tell us who you are so Julia can start a support session for this project.</p>
            </div>
            {widgetError ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{widgetError}</div> : null}
            {isRestoringSession ? (
              <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">Restoring your previous widget session...</div>
            ) : null}
            <form className="space-y-4" onSubmit={(event) => void handleIdentitySubmit(event)}>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Your Name</label>
                <input
                  type="text"
                  required
                  value={identity.name}
                  onChange={(event) => setIdentity((current) => ({ ...current, name: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition-all focus:ring-2 focus:ring-orange-500"
                  placeholder="Alex Johnson"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Your Email</label>
                <input
                  type="email"
                  required
                  value={identity.email}
                  onChange={(event) => setIdentity((current) => ({ ...current, email: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition-all focus:ring-2 focus:ring-orange-500"
                  placeholder="alex@company.com"
                />
              </div>
              <button
                type="submit"
                disabled={isStartingSession || Boolean(widgetError)}
                className="mt-2 w-full rounded-lg bg-orange-600 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-orange-700 disabled:opacity-60"
              >
                {isStartingSession ? 'Starting...' : 'Continue'}
              </button>
            </form>
            {!isEmbedded ? (
              <div className="mt-auto pt-6 text-center">
                <Link to={`/submit-ticket?widgetKey=${encodeURIComponent(activeWidgetKey)}`} onClick={() => setState('collapsed')} className="text-sm font-medium text-slate-500 transition-colors hover:text-orange-600">
                  Skip - Submit a Ticket Directly
                </Link>
              </div>
            ) : null}
          </div>
        )}

        {state === 'faq' && (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="border-b border-slate-100 p-4">
              {widgetError ? <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{widgetError}</div> : null}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search for help..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Project FAQs</p>
              {filteredFaqs.map((faq) => (
                <div key={faq.id} className="flex gap-3 rounded-xl border border-slate-100 p-3 transition-all hover:border-orange-500">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-orange-50 text-orange-600">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">{faq.question}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">{faq.answer}</p>
                  </div>
                </div>
              ))}
              {filteredFaqs.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-sm text-slate-500">No FAQs matched your search.</p>
                </div>
              )}
            </div>
            <div className="border-t border-slate-100 bg-slate-50 p-4">
              <button
                onClick={() => setState('chat')}
                disabled={Boolean(widgetError)}
                className="w-full rounded-xl bg-orange-600 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-orange-700 disabled:opacity-60"
              >
                My issue is not listed - Ask Julia
              </button>
            </div>
          </div>
        )}

        {state === 'chat' && (
          <div className="flex flex-1 flex-col overflow-hidden bg-slate-50/50">
            <div className="flex justify-center border-b border-slate-100 bg-white p-2">
              <button onClick={() => setState('escalate')} className="rounded-lg border border-orange-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-orange-600 transition-colors hover:bg-slate-100">
                Escalate to Support
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {isRestoringSession ? <div className="max-w-[85%] rounded-2xl rounded-tl-none border border-slate-200 bg-white p-3 text-sm shadow-sm">Restoring your last conversation...</div> : null}

              {messages.length === 0 && !isTyping && !isRestoringSession && (
                <div className="max-w-[85%] rounded-2xl rounded-tl-none border border-slate-200 bg-white p-3 text-sm shadow-sm">
                  Ask Julia anything about this project's support FAQs, docs, or runbooks.
                </div>
              )}

              {messages.map((message) => (
                <div key={message.id} className={clsx('flex flex-col', message.role === 'USER' ? 'items-end' : 'items-start')}>
                  <div
                    className={clsx(
                      'max-w-[85%] rounded-2xl p-3 text-sm shadow-sm',
                      message.role === 'USER' ? 'rounded-tr-none bg-orange-600 text-white' : 'rounded-tl-none border border-slate-200 bg-white text-slate-700',
                    )}
                  >
                    <p>{message.content}</p>
                    {message.role === 'JULIA' && (
                      <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">Julia AI</span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setFeedback('up');
                              showToast('success', 'Thanks for your feedback!');
                            }}
                            className={clsx('p-1 transition-colors', feedback === 'up' ? 'text-green-500' : 'text-slate-400 hover:text-green-500')}
                          >
                            <ThumbsUp className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => {
                              setFeedback('down');
                              showToast('info', 'Feedback recorded.');
                            }}
                            className={clsx('p-1 transition-colors', feedback === 'down' ? 'text-red-500' : 'text-slate-400 hover:text-red-500')}
                          >
                            <ThumbsDown className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <span className="mt-1 text-[10px] text-slate-400">{formatDateTime(message.createdAt)}</span>
                </div>
              ))}

              {isTyping && (
                <div className="flex w-16 items-center gap-1 rounded-2xl rounded-tl-none border border-slate-200 bg-white p-3 shadow-sm">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '0ms' }} />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '150ms' }} />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '300ms' }} />
                </div>
              )}
            </div>
            <div className="border-t border-slate-100 bg-white p-3">
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
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-4 pr-10 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
                />
                <button
                  onClick={() => void handleSendMessage()}
                  disabled={!chatInput.trim() || isSendingMessage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-orange-600 transition-colors hover:bg-orange-50 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {state === 'escalate' && (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Project</p>
                <p className="font-medium">{projectName}</p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Issue Title</label>
                <input
                  type="text"
                  value={issueTitle}
                  onChange={(event) => setIssueTitle(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Description</label>
                <textarea
                  rows={4}
                  value={issueDescription}
                  onChange={(event) => setIssueDescription(event.target.value)}
                  className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Priority</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as Priority[]).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setPriority(option)}
                      className={clsx(
                        'rounded-lg border py-2 text-sm font-medium transition-colors',
                        priority === option ? 'border-orange-600 bg-orange-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-2 border-t border-slate-100 bg-white p-4">
              <button
                onClick={() => void handleEscalate()}
                disabled={isSubmittingTicket}
                className="w-full rounded-xl bg-orange-600 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-orange-700 disabled:opacity-60"
              >
                {isSubmittingTicket ? 'Submitting...' : 'Submit Ticket'}
              </button>
              <button onClick={() => setState('chat')} className="w-full bg-transparent py-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700">
                Cancel
              </button>
            </div>
          </div>
        )}

        {state === 'success' && (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-500">
              <CheckCircle2 className="h-8 w-8" />
            </motion.div>
            <h2 className="mb-2 text-xl font-bold text-slate-900">Ticket Submitted!</h2>
            <div className="mb-8 flex flex-col items-center gap-2 text-sm text-slate-600">
              <p>Ticket created successfully. Our support team will follow up using the contact details you shared.</p>
              {ticketDisplayId && (
                <button
                  onClick={() => void copyTicketId()}
                  className="flex items-center gap-1.5 rounded bg-slate-100 px-2 py-1 text-xs font-mono font-semibold text-orange-600 transition-colors hover:bg-slate-200"
                >
                  {ticketDisplayId}
                  <Copy className="h-3 w-3" />
                </button>
              )}
            </div>

            <div className="mb-6 w-full rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="mb-3 text-xs font-semibold text-slate-700">Rate this session</p>
              <div className="flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button key={value} onMouseEnter={() => setHoverRating(value)} onMouseLeave={() => setHoverRating(0)} onClick={() => setRating(value)} className="p-1 transition-transform active:scale-90">
                    <Star className={clsx('h-6 w-6 transition-colors', (hoverRating || rating) >= value ? 'fill-amber-400 text-amber-400' : 'text-slate-300')} />
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                if (isEmbedded) {
                  requestEmbeddedClose();
                } else {
                  resetWidget();
                }
              }}
              className="w-full rounded-xl bg-slate-800 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-900"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (isEmbedded) {
    return <div className="h-full w-full bg-transparent p-2 sm:p-3">{panelContent}</div>;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end sm:bottom-6 sm:right-6">
      <AnimatePresence>
        {state !== 'collapsed' && (
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }}>
            {panelContent}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="group relative flex items-center gap-3">
        <div className="pointer-events-none hidden whitespace-nowrap rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white opacity-0 shadow-lg transition-all group-hover:-translate-x-0 group-hover:opacity-100 sm:block sm:-translate-x-2">
          Julia Support
        </div>
        <button
          onClick={toggleWidget}
          className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-orange-600 shadow-xl transition-all hover:bg-orange-700 active:scale-95"
        >
          <AnimatePresence mode="wait">
            {state === 'collapsed' ? (
              <motion.div key="chat" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                <MessageSquare className="h-6 w-6 text-white" />
              </motion.div>
            ) : (
              <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                <X className="h-6 w-6 text-white" />
              </motion.div>
            )}
          </AnimatePresence>
          {state === 'collapsed' && hasNotification && <span className="absolute right-0 top-0 h-3.5 w-3.5 animate-pulse rounded-full border-2 border-white bg-red-500" />}
        </button>
      </div>
    </div>
  );
}
