import type { Request } from 'express';

import { ProjectStatus } from '@prisma/client';

import { prisma } from '../lib/prisma';
import { badRequest, forbidden, notFound } from './http';

type WidgetProjectAccessRecord = {
  id: number;
  name: string;
  status: ProjectStatus;
  widgetEnabled: boolean;
  juliaFallbackMessage: string | null;
  juliaEscalationHint: string | null;
  widgetAllowedDomains: string[];
};

const parseOrigin = (value: string, label: string) => {
  try {
    const url = new URL(value);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('Unsupported protocol');
    }

    return url.origin;
  } catch {
    throw badRequest(`Invalid ${label}. Use a full origin such as https://support.client.com.`);
  }
};

const readRequestHeader = (req: Request, headerName: string) => {
  const headerValue = req.header(headerName);

  if (!headerValue) {
    return null;
  }

  return headerValue.split(',')[0]?.trim() || null;
};

export const normalizeWidgetAllowedDomains = (domains: string[] | null | undefined) => {
  const normalizedDomains: string[] = [];
  const seen = new Set<string>();

  for (const domain of domains || []) {
    const trimmedDomain = domain.trim();

    if (!trimmedDomain) {
      continue;
    }

    const normalizedDomain = parseOrigin(trimmedDomain, `allowed domain "${trimmedDomain}"`);

    if (!seen.has(normalizedDomain)) {
      seen.add(normalizedDomain);
      normalizedDomains.push(normalizedDomain);
    }
  }

  return normalizedDomains;
};

export const resolveWidgetRequestOrigin = (req: Request) => {
  const explicitOrigin = readRequestHeader(req, 'x-atc-widget-origin');

  if (explicitOrigin) {
    return parseOrigin(explicitOrigin, 'widget origin header');
  }

  const requestOrigin = readRequestHeader(req, 'origin');

  if (requestOrigin) {
    return parseOrigin(requestOrigin, 'request origin');
  }

  const referer = readRequestHeader(req, 'referer');

  if (!referer) {
    return null;
  }

  return parseOrigin(referer, 'request referer');
};

export const getWidgetProjectAccess = async (widgetKey: string): Promise<WidgetProjectAccessRecord> => {
  const project = await prisma.project.findUnique({
    where: {
      widgetKey,
    },
    select: {
      id: true,
      name: true,
      status: true,
      widgetEnabled: true,
      juliaFallbackMessage: true,
      juliaEscalationHint: true,
      widgetAllowedDomains: true,
    },
  });

  if (!project) {
    throw notFound('Widget project not found.');
  }

  if (project.status !== ProjectStatus.ACTIVE) {
    throw badRequest('This widget is not active.');
  }

  if (!project.widgetEnabled) {
    throw badRequest('This widget is disabled.');
  }

  return {
    ...project,
    widgetAllowedDomains: normalizeWidgetAllowedDomains(project.widgetAllowedDomains),
  };
};

export const assertWidgetOriginAllowed = (
  req: Request,
  project: Pick<WidgetProjectAccessRecord, 'widgetAllowedDomains'>,
) => {
  const requestOrigin = resolveWidgetRequestOrigin(req);

  if (!requestOrigin) {
    throw forbidden('Widget origin could not be verified for this request.');
  }

  if (project.widgetAllowedDomains.length === 0) {
    throw forbidden('This widget has not been configured for any allowed domains yet.');
  }

  if (!project.widgetAllowedDomains.includes(requestOrigin)) {
    throw forbidden(`This widget is not allowed from ${requestOrigin}.`);
  }

  return requestOrigin;
};
