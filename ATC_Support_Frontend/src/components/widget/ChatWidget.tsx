import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquare, X, Send, Search, CheckCircle2, FileText, Copy, LogOut, Mic, MicOff, ShieldCheck, Bot } from 'lucide-react';
import { clsx } from 'clsx';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';

import { useToast } from '../../contexts/ToastContext';
import { useModal } from '../../contexts/ModalContext';
import { apiFetch, getErrorMessage } from '../../lib/api';
import { DEFAULT_WIDGET_KEY, storageKeys } from '../../lib/config';
import { formatDateTime } from '../../lib/format';
import { buildWidgetRequestHeaders } from '../../lib/widgetRuntime';
import type {
  ApiSupportSession,
  ApiSupportSessionMessage,
  ApiSupportTopic,
  ApiTicket,
  SupportContextResponse,
  SupportSessionMessageResponse,
  SupportType,
  WidgetFaq,
} from '../../lib/types';

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

type SpeechRecognitionAlternativeLike = {
  transcript: string;
};

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionErrorEventLike = {
  error: string;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructorLike = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructorLike;
    webkitSpeechRecognition?: SpeechRecognitionConstructorLike;
  }
}

const supportTypeMeta: Record<SupportType, { label: string; blurb: string }> = {
  SOFTWARE: { label: 'Software', blurb: 'SOPs, access checks, workflow guidance' },
  HARDWARE: { label: 'Hardware', blurb: 'Devices, printers, scanners, and network issues' },
  GENERAL: { label: 'General', blurb: 'Website support, account help, and mixed issues' },
};

const supportTopicKindLabel: Record<ApiSupportTopic['kind'], string> = {
  FAQ: 'FAQ',
  SOP: 'SOP',
  PLAYBOOK: 'Playbook',
  VENDOR_LINK: 'Vendor link',
};

const joinSummaryParts = (...parts: Array<string | null | undefined>) => parts.filter(Boolean).join(' / ');

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
  const isGeneralWidget = activeWidgetKey === 'general';
  const isEmbedded = mode === 'embedded';
  const { showToast } = useToast();
  const { openModal } = useModal();
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const chatInputRef = useRef<HTMLInputElement | null>(null);
  const speechRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const speechPrefixRef = useRef('');
  const speechRecognitionConstructor = useMemo<SpeechRecognitionConstructorLike | undefined>(
    () =>
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : undefined,
    [],
  );
  const widgetRequestHeaders = useMemo(
    () => buildWidgetRequestHeaders(hostOrigin || (typeof window !== 'undefined' ? window.location.origin : '')),
    [hostOrigin],
  );

  const [state, setState] = useState<WidgetState>(isEmbedded || startOpen ? 'identity' : 'collapsed');
  const [hasNotification, setHasNotification] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [projectName, setProjectName] = useState('Loading...');
  const [faqs, setFaqs] = useState<WidgetFaq[]>([]);
  const [topics, setTopics] = useState<ApiSupportTopic[]>([]);
  const [identity, setIdentity] = useState({ name: '', email: '', phone: '', clientLookup: '' });
  const [supportType, setSupportType] = useState<SupportType>('SOFTWARE');
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [supportContext, setSupportContext] = useState<SupportContextResponse | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ApiSupportSessionMessage[]>([]);
  const [issueTitle, setIssueTitle] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [ticketDisplayId, setTicketDisplayId] = useState('');
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(false);
  const [widgetError, setWidgetError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);

  const filteredFaqs = useMemo(
    () => faqs.filter((faq) => `${faq.question} ${faq.answer}`.toLowerCase().includes(searchQuery.toLowerCase())),
    [faqs, searchQuery],
  );
  const filteredTopics = useMemo(
    () => topics.filter((topic) => `${topic.title} ${topic.summary || ''} ${topic.content}`.toLowerCase().includes(searchQuery.toLowerCase())),
    [searchQuery, topics],
  );
  const selectedTopic = useMemo(
    () => topics.find((topic) => topic.id === selectedTopicId) || null,
    [selectedTopicId, topics],
  );
  const widgetTitle = isGeneralWidget ? 'ATC General Support' : projectName;
  const widgetSubtitle = isGeneralWidget ? 'Software, hardware, and AMC-backed support' : 'Project support assistant';
  const supportTypeInfo = supportTypeMeta[supportType];
  const contextSummary = joinSummaryParts(
    supportContext?.client?.name || null,
    supportContext?.project?.name || supportContext?.projects[0]?.name || null,
    supportTypeInfo.label,
  );
  const hardwareSummary = supportContext?.hardwareAssets[0]
    ? joinSummaryParts(
        supportContext.hardwareAssets[0].category.replaceAll('_', ' '),
        supportContext.hardwareAssets[0].brand,
        supportContext.hardwareAssets[0].model,
      )
    : null;

  useEffect(() => {
    let isActive = true;

    const loadWidgetContext = async () => {
      try {
        const contextPath = isGeneralWidget
          ? '/support/context'
          : `/support/context?widgetKey=${encodeURIComponent(activeWidgetKey)}&supportType=${supportType}`;
        const response = await apiFetch<SupportContextResponse>(contextPath, {
          auth: false,
          headers: widgetRequestHeaders,
        });

        if (!isActive) {
          return;
        }

        setSupportContext(response);
        setProjectName(response.project?.name || response.client?.name || 'ATC General Support');
        setFaqs(response.faqs);
        setTopics(response.topics);
        setWidgetError(null);

        const storedSession = readStoredWidgetSession(activeWidgetKey);

        if (!storedSession) {
          return;
        }

        setIsRestoringSession(true);

        try {
          const session = await apiFetch<ApiSupportSession>(`/support/sessions/${storedSession.sessionId}`, {
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
            name: session.requesterName || storedSession.identity.name,
            email: session.requesterEmail || storedSession.identity.email,
            phone: session.requesterPhone || '',
            clientLookup: session.client?.displayId || session.client?.email || '',
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
  }, [activeWidgetKey, isGeneralWidget, showToast, supportType, widgetRequestHeaders]);

  useEffect(() => {
    if (state !== 'chat') {
      return;
    }

    messageEndRef.current?.scrollIntoView({ behavior: messages.length > 0 ? 'smooth' : 'auto', block: 'end' });
  }, [messages, isTyping, state]);

  useEffect(() => {
    if (isEmbedded || typeof window === 'undefined') {
      return;
    }

    const openDemoWidget = () => {
      setState(sessionId ? (messages.length > 0 ? 'chat' : 'faq') : 'identity');
      setHasNotification(false);
    };

    window.addEventListener('atc-open-demo-widget', openDemoWidget);

    return () => {
      window.removeEventListener('atc-open-demo-widget', openDemoWidget);
    };
  }, [isEmbedded, messages.length, sessionId]);

  useEffect(() => {
    return () => {
      speechRecognitionRef.current?.abort();
    };
  }, []);

  const requestEmbeddedClose = () => {
    if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'ATC_WIDGET_CLOSE', widgetKey: activeWidgetKey }, '*');
    }
  };

  const resetWidget = () => {
    speechRecognitionRef.current?.abort();
    speechRecognitionRef.current = null;
    speechPrefixRef.current = '';
    setIsListening(false);
    persistWidgetSession(activeWidgetKey, null);
    setState(isEmbedded || startOpen ? 'identity' : 'collapsed');
    setSearchQuery('');
    setIsTyping(false);
    setIdentity({ name: '', email: '', phone: '', clientLookup: '' });
    setSelectedTopicId(null);
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
      const context = isGeneralWidget
        ? await apiFetch<SupportContextResponse>(
            `/support/context?clientLookup=${encodeURIComponent(identity.clientLookup || identity.email)}&supportType=${supportType}`,
            {
              auth: false,
              headers: widgetRequestHeaders,
            },
          )
        : supportContext;
      const selectedHardwareAsset = supportType === 'HARDWARE' ? context?.hardwareAssets[0] : null;
      const selectedProject = context?.project || context?.projects[0] || null;
      const response = await apiFetch<ApiSupportSession>('/support/sessions', {
        method: 'POST',
        auth: false,
        headers: widgetRequestHeaders,
        body: {
          widgetKey: isGeneralWidget ? undefined : activeWidgetKey,
          clientId: context?.client?.id,
          projectId: selectedProject?.id,
          hardwareAssetId: selectedHardwareAsset?.id,
          selectedTopicId: selectedTopicId || undefined,
          supportType,
          requesterName: identity.name,
          requesterEmail: identity.email,
          requesterPhone: identity.phone || undefined,
          issueSummary: selectedTopicId ? topics.find((topic) => topic.id === selectedTopicId)?.title : undefined,
        },
      });

      if (context) {
        setSupportContext(context);
        setProjectName(context.project?.name || context.client?.name || 'ATC General Support');
        setFaqs(context.faqs);
        setTopics(context.topics);
      }

      setSessionId(response.id);
      persistWidgetSession(activeWidgetKey, {
        sessionId: response.id,
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

    const nextUserMessage: ApiSupportSessionMessage = {
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
      const response = await apiFetch<SupportSessionMessageResponse>(`/support/sessions/${sessionId}/message`, {
        method: 'POST',
        auth: false,
        headers: widgetRequestHeaders,
        body: {
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

  const toggleVoiceInput = () => {
    if (!speechRecognitionConstructor) {
      showToast('error', 'Voice input is not supported in this browser.');
      return;
    }

    if (isListening) {
      speechRecognitionRef.current?.stop();
      return;
    }

    const recognition = new speechRecognitionConstructor();
    speechPrefixRef.current = chatInput.trim();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let transcript = '';

      for (let index = 0; index < event.results.length; index += 1) {
        transcript += event.results[index]?.[0]?.transcript || '';
      }

      const nextDraft = transcript.trim();
      setChatInput([speechPrefixRef.current, nextDraft].filter(Boolean).join(' ').trim());
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      speechRecognitionRef.current = null;

      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        showToast('error', 'Voice input could not capture your message.');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      speechRecognitionRef.current = null;
      speechPrefixRef.current = '';
      chatInputRef.current?.focus();
    };

    speechRecognitionRef.current = recognition;
    recognition.start();
  };

  const handleEscalate = async () => {
    if (!identity.name || !identity.email || !issueTitle.trim()) {
      showToast('error', 'Please complete the escalation details.');
      return;
    }

    setIsSubmittingTicket(true);

    try {
      const response = await apiFetch<ApiTicket>(`/support/sessions/${sessionId}/escalate`, {
        method: 'POST',
        auth: false,
        headers: widgetRequestHeaders,
        body: {
          title: issueTitle.trim(),
          description: issueDescription.trim() || undefined,
          priority,
          supportSummary: messages.map((message) => `${message.role}: ${message.content}`).join('\n').slice(0, 2000) || undefined,
          confidenceScore: 0.65,
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

  const handleEndSession = async () => {
    if (!sessionId) {
      resetWidget();
      return;
    }

    try {
      await apiFetch(`/support/sessions/${sessionId}/end`, {
        method: 'POST',
        auth: false,
        headers: widgetRequestHeaders,
        body: {
          supportSummary: messages.map((message) => `${message.role}: ${message.content}`).join('\n').slice(0, 2000) || undefined,
        },
      });
      showToast('success', 'Support session ended.');
    } catch (error) {
      showToast('error', getErrorMessage(error));
    } finally {
      resetWidget();
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
    'flex flex-col overflow-hidden bg-white text-slate-900 ring-1 ring-slate-200/80',
    isEmbedded
      ? 'h-full w-full rounded-[26px] shadow-[0_20px_70px_rgba(15,23,42,0.18)]'
      : 'mb-3 h-[calc(100dvh-5.5rem)] w-[calc(100vw-1.5rem)] max-w-[25.5rem] rounded-[28px] shadow-[0_28px_90px_rgba(15,23,42,0.24)] sm:mb-4 sm:h-[650px] sm:max-h-[82vh] sm:w-[408px]',
  );

  const panelContent = (
    <div className={panelClasses}>
      <header className="relative shrink-0 overflow-hidden bg-slate-950 px-4 pb-4 pt-4 text-white">
        <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_18%_10%,rgba(249,115,22,0.35),transparent_34%),radial-gradient(circle_at_90%_0%,rgba(59,130,246,0.22),transparent_30%)]" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex min-w-0 gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-600 text-base font-black shadow-lg shadow-orange-950/30">J</div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-black leading-tight">{widgetTitle}</p>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-orange-200">Live</span>
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-300">{widgetSubtitle}</p>
            </div>
          </div>
          <button onClick={toggleWidget} className="rounded-full p-1.5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white" aria-label="Close support widget">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="relative mt-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2">
          <ShieldCheck className="h-4 w-4 shrink-0 text-orange-300" />
          <p className="min-w-0 truncate text-xs text-slate-200">{contextSummary || 'Identify your client to load project, AMC, and hardware context.'}</p>
        </div>
      </header>

      <div className="flex flex-1 flex-col overflow-hidden bg-[#f6f7fb]">
        {state === 'identity' && (
          <div className="flex flex-1 flex-col overflow-y-auto px-4 py-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.26em] text-orange-600">Start Support</p>
              <h2 className="mt-2 text-2xl font-black leading-tight text-slate-950">Tell Julia who needs help.</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                We verify the client first, then Julia shows the right project, hardware, and support topics.
              </p>
            </div>
            {widgetError ? <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{widgetError}</div> : null}
            {isRestoringSession ? (
              <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">Restoring your previous widget session...</div>
            ) : null}
            <form className="mt-4 space-y-3" onSubmit={(event) => void handleIdentitySubmit(event)}>
              <WidgetField label="Your name">
                <input type="text" required value={identity.name} onChange={(event) => setIdentity((current) => ({ ...current, name: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-100" placeholder="Ravi Kumar" />
              </WidgetField>
              <WidgetField label="Work email">
                <input type="email" required value={identity.email} onChange={(event) => setIdentity((current) => ({ ...current, email: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-100" placeholder="ravi@company.com" />
              </WidgetField>
              <WidgetField label="Phone">
                <input type="tel" value={identity.phone} onChange={(event) => setIdentity((current) => ({ ...current, phone: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-100" placeholder="Optional contact number" />
              </WidgetField>
              {isGeneralWidget ? (
                <WidgetField label="Client ID, email, or phone">
                  <input type="text" required value={identity.clientLookup} onChange={(event) => setIdentity((current) => ({ ...current, clientLookup: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-100" placeholder="CLT-033 or support@client.com" />
                </WidgetField>
              ) : null}
              <div>
                <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Support type</p>
                <div className="grid grid-cols-3 gap-2">
                  {(['SOFTWARE', 'HARDWARE', 'GENERAL'] as SupportType[]).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setSupportType(option)}
                      className={clsx(
                        'rounded-2xl border px-2 py-2 text-center text-xs font-bold transition-all',
                        supportType === option ? 'border-orange-600 bg-orange-600 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-orange-200',
                      )}
                    >
                      {supportTypeMeta[option].label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">{supportTypeInfo.blurb}</p>
              </div>
              <button type="submit" disabled={isStartingSession || Boolean(widgetError)} className="w-full rounded-2xl bg-orange-600 py-3 text-sm font-black text-white shadow-lg shadow-orange-100 transition-colors hover:bg-orange-700 disabled:opacity-60">
                {isStartingSession ? 'Starting...' : 'Continue to support'}
              </button>
            </form>
            {!isEmbedded && !isGeneralWidget ? (
              <div className="mt-auto pt-4 text-center">
                <Link to={`/submit-ticket?widgetKey=${encodeURIComponent(activeWidgetKey)}`} onClick={() => setState('collapsed')} className="text-sm font-semibold text-slate-500 transition-colors hover:text-orange-600">
                  Skip and submit a ticket
                </Link>
              </div>
            ) : null}
          </div>
        )}

        {state === 'faq' && (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="border-b border-slate-200/80 bg-white px-4 py-3">
              {widgetError ? <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{widgetError}</div> : null}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search support topics..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm outline-none transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />
              </div>
              {hardwareSummary ? <p className="mt-2 text-xs text-slate-500">Detected hardware context: {hardwareSummary}</p> : null}
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              <SectionLabel>Recommended topics</SectionLabel>
              {filteredTopics.map((topic) => (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => {
                    setSelectedTopicId(topic.id);
                    setIssueTitle(topic.title);
                    setIssueDescription(topic.content);
                  }}
                  className={clsx(
                    'w-full rounded-3xl border bg-white p-4 text-left shadow-sm transition-all',
                    selectedTopicId === topic.id ? 'border-orange-500 ring-2 ring-orange-100' : 'border-slate-200 hover:border-orange-200',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-black leading-snug text-slate-950">{topic.title}</h3>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                          {supportTopicKindLabel[topic.kind]}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">{(topic.summary || topic.content).slice(0, 170)}</p>
                    </div>
                  </div>
                </button>
              ))}
              {filteredFaqs.length > 0 ? <SectionLabel>Project FAQs</SectionLabel> : null}
              {filteredFaqs.map((faq) => (
                <div key={faq.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="text-sm font-black text-slate-950">{faq.question}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">{faq.answer}</p>
                </div>
              ))}
              {filteredFaqs.length === 0 && filteredTopics.length === 0 && (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center">
                  <p className="text-sm font-semibold text-slate-600">No topics matched your search.</p>
                  <p className="mt-1 text-xs text-slate-500">Ask Julia directly and we can escalate if needed.</p>
                </div>
              )}
            </div>
            <div className="border-t border-slate-200 bg-white p-4">
              <button
                onClick={() => {
                  if (selectedTopic && !chatInput.trim()) {
                    setChatInput(`I need help with ${selectedTopic.title}.`);
                  }
                  setState('chat');
                }}
                disabled={Boolean(widgetError)}
                className="w-full rounded-2xl bg-orange-600 py-3 text-sm font-black text-white shadow-lg shadow-orange-100 transition-colors hover:bg-orange-700 disabled:opacity-60"
              >
                {selectedTopic ? 'Ask Julia about selected topic' : 'Ask Julia directly'}
              </button>
            </div>
          </div>
        )}

        {state === 'chat' && (
          <div className="flex flex-1 flex-col overflow-hidden bg-[#f6f7fb]">
            <div className="border-b border-slate-200/80 bg-white px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-600">Julia Assistant</p>
                  <p className="mt-1 truncate text-sm font-black text-slate-950">
                    {selectedTopic ? selectedTopic.title : 'Guided support session'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => setState('escalate')}
                    className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-black text-orange-700 transition-colors hover:bg-orange-100"
                  >
                    Escalate
                  </button>
                  <button
                    onClick={() => void handleEndSession()}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    End
                  </button>
                </div>
              </div>
              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">
                {selectedTopic?.summary || contextSummary || 'Ask one support question at a time. Julia will guide you and escalate when human help is needed.'}
              </p>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
              {isRestoringSession ? <MessageBubble message={{ id: -1, role: 'JULIA', content: 'Restoring your last conversation...', createdAt: new Date().toISOString() }} /> : null}

              {messages.length === 0 && !isTyping && !isRestoringSession && (
                <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-950">Ready when you are.</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">
                        Type or use the microphone. Julia will follow the selected topic or diagnose the issue step by step.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}

              {isTyping ? <TypingBubble /> : null}
              <div ref={messageEndRef} />
            </div>

            <div className="border-t border-slate-200 bg-white p-3">
              {isListening ? (
                <p className="mb-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
                  Listening... speak clearly, then pause to finish.
                </p>
              ) : null}
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-100">
                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  disabled={!speechRecognitionConstructor || isSendingMessage}
                  className={clsx(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                    isListening ? 'bg-orange-600 text-white' : 'bg-white text-slate-600 hover:text-orange-600',
                  )}
                  aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
                  title={speechRecognitionConstructor ? 'Speak your message' : 'Voice input is not supported in this browser'}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>
                <input
                  ref={chatInputRef}
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
                  className="min-w-0 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => void handleSendMessage()}
                  disabled={!chatInput.trim() || isSendingMessage}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-600 text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {state === 'escalate' && (
          <div className="flex flex-1 flex-col overflow-hidden bg-[#f6f7fb]">
            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
              <div className="rounded-3xl border border-orange-100 bg-white p-4 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-600">Human Escalation</p>
                <h2 className="mt-2 text-xl font-black leading-tight text-slate-950">Create a support ticket.</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  Julia will attach this session context, attempted steps, and client details for the ATC operator.
                </p>
                <div className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                  {contextSummary || projectName}
                </div>
              </div>
              <WidgetField label="Issue title">
                <input
                  type="text"
                  value={issueTitle}
                  onChange={(event) => setIssueTitle(event.target.value)}
                  placeholder="Example: Printer is not printing labels"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />
              </WidgetField>
              <WidgetField label="Description">
                <textarea
                  rows={4}
                  value={issueDescription}
                  onChange={(event) => setIssueDescription(event.target.value)}
                  placeholder="Add anything Julia missed, like device location, urgency, or who to contact."
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />
              </WidgetField>
              <div>
                <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">Priority</p>
                <div className="grid grid-cols-2 gap-2">
                  {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as Priority[]).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setPriority(option)}
                      className={clsx(
                        'rounded-2xl border py-2.5 text-sm font-black transition-colors',
                        priority === option ? 'border-orange-600 bg-orange-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-orange-200',
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-2 border-t border-slate-200 bg-white p-4">
              <button
                onClick={() => void handleEscalate()}
                disabled={isSubmittingTicket}
                className="w-full rounded-2xl bg-orange-600 py-3 text-sm font-black text-white shadow-lg shadow-orange-100 transition-colors hover:bg-orange-700 disabled:opacity-60"
              >
                {isSubmittingTicket ? 'Submitting...' : 'Submit Ticket'}
              </button>
              <button onClick={() => setState('chat')} className="w-full rounded-2xl bg-transparent py-2 text-sm font-bold text-slate-500 transition-colors hover:text-slate-700">
                Back to chat
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

function WidgetField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="pt-1 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">{children}</p>;
}

function MessageBubble({ message }: { message: ApiSupportSessionMessage }) {
  const isUser = message.role === 'USER';
  const isSystem = message.role === 'SYSTEM';

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="max-w-[86%] rounded-full border border-slate-200 bg-white px-3 py-1.5 text-center text-[11px] font-semibold text-slate-500 shadow-sm">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('flex flex-col', isUser ? 'items-end' : 'items-start')}>
      <div
        className={clsx(
          'max-w-[88%] rounded-3xl px-4 py-3 text-sm leading-relaxed shadow-sm',
          isUser
            ? 'rounded-br-md bg-orange-600 text-white shadow-orange-100'
            : 'rounded-bl-md border border-slate-200 bg-white text-slate-700',
        )}
      >
        {isUser ? <p className="whitespace-pre-wrap">{message.content}</p> : <MarkdownMessage content={message.content} />}
        {!isUser ? (
          <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-950 text-white">
              <Bot className="h-3 w-3" />
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Julia</span>
          </div>
        ) : null}
      </div>
      <span className="mt-1 px-1 text-[10px] text-slate-400">{formatDateTime(message.createdAt)}</span>
    </div>
  );
}

function MarkdownMessage({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="mb-2 ml-4 list-disc space-y-1 last:mb-0">{children}</ul>,
        ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal space-y-1 last:mb-0">{children}</ol>,
        li: ({ children }) => <li className="pl-1">{children}</li>,
        strong: ({ children }) => <strong className="font-black text-slate-950">{children}</strong>,
        code: ({ children }) => <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] text-slate-700">{children}</code>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function TypingBubble() {
  return (
    <div className="flex items-start gap-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
        <Bot className="h-3.5 w-3.5" />
      </div>
      <div className="flex items-center gap-1 rounded-3xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '0ms' }} />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '150ms' }} />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}
