import { ProjectStatus } from '@prisma/client';

const MIN_FAQ_COUNT = 3;
const MIN_PUBLISHED_DOC_COUNT = 1;
const MIN_ALLOWED_DOMAIN_COUNT = 1;

type JuliaReadinessInput = {
  status: ProjectStatus;
  widgetEnabled: boolean;
  allowedDomainCount: number;
  faqCount: number;
  publishedDocCount: number;
  juliaFallbackMessage?: string | null;
  juliaEscalationHint?: string | null;
};

const hasText = (value: string | null | undefined) => Boolean(value?.trim());

export const buildJuliaReadiness = ({
  status,
  widgetEnabled,
  allowedDomainCount,
  faqCount,
  publishedDocCount,
  juliaFallbackMessage,
  juliaEscalationHint,
}: JuliaReadinessInput) => {
  const fallbackDefined = hasText(juliaFallbackMessage);
  const escalationHintDefined = hasText(juliaEscalationHint);

  const checks = [
    {
      key: 'projectActive',
      label: 'Project is active',
      isMet: status === ProjectStatus.ACTIVE,
      detail:
        status === ProjectStatus.ACTIVE
          ? 'The project is active and can serve a live support widget.'
          : 'Set the project back to Active before handing Julia to the project team.',
    },
    {
      key: 'widgetEnabled',
      label: 'Widget is enabled',
      isMet: widgetEnabled,
      detail: widgetEnabled
        ? 'The public widget can be loaded for this project.'
        : 'Enable the widget before Julia can be embedded into the project UI.',
    },
    {
      key: 'allowedDomains',
      label: `At least ${MIN_ALLOWED_DOMAIN_COUNT} allowed widget origin is configured`,
      isMet: allowedDomainCount >= MIN_ALLOWED_DOMAIN_COUNT,
      detail:
        allowedDomainCount >= MIN_ALLOWED_DOMAIN_COUNT
          ? `${allowedDomainCount} allowed widget origin${allowedDomainCount === 1 ? ' is' : 's are'} configured for packaged delivery.`
          : 'Add at least one allowed domain/environment before handing the widget to the project lead.',
    },
    {
      key: 'faqCoverage',
      label: `At least ${MIN_FAQ_COUNT} FAQs are ready`,
      isMet: faqCount >= MIN_FAQ_COUNT,
      detail:
        faqCount >= MIN_FAQ_COUNT
          ? `${faqCount} FAQ entries are available for FAQ-first support flow.`
          : `Only ${faqCount} FAQ entr${faqCount === 1 ? 'y is' : 'ies are'} available. Add at least ${
              MIN_FAQ_COUNT - faqCount
            } more.`,
    },
    {
      key: 'publishedDocs',
      label: `At least ${MIN_PUBLISHED_DOC_COUNT} published project doc is ready`,
      isMet: publishedDocCount >= MIN_PUBLISHED_DOC_COUNT,
      detail:
        publishedDocCount >= MIN_PUBLISHED_DOC_COUNT
          ? `${publishedDocCount} published project doc${publishedDocCount === 1 ? ' is' : 's are'} available for Julia grounding.`
          : 'Publish at least one project document so Julia has approved source material beyond FAQ answers.',
    },
    {
      key: 'fallbackMessage',
      label: 'Fallback message is defined',
      isMet: fallbackDefined,
      detail: fallbackDefined
        ? 'Julia has project-specific fallback wording when context is insufficient.'
        : 'Add a project-specific fallback message for blocked or uncertain answers.',
    },
    {
      key: 'escalationHint',
      label: 'Escalation hint is defined',
      isMet: escalationHintDefined,
      detail: escalationHintDefined
        ? 'Julia has project-specific escalation guidance for handoff to support.'
        : 'Add a project-specific escalation hint so users know when to ask for human help.',
    },
  ];

  return {
    isReady: checks.every((check) => check.isMet),
    allowedDomainCount,
    minimumAllowedDomainCount: MIN_ALLOWED_DOMAIN_COUNT,
    faqCount,
    minimumFaqCount: MIN_FAQ_COUNT,
    publishedDocCount,
    minimumPublishedDocCount: MIN_PUBLISHED_DOC_COUNT,
    checks,
  };
};
