import nodemailer from 'nodemailer';

import { env } from '../config/env';

type SendMailInput = {
  toEmail: string;
  toName?: string | null;
  subject: string;
  text: string;
};

export type MailerResult = {
  status: 'SENT' | 'LOGGED' | 'FAILED';
  messageId?: string;
  errorMessage?: string;
  deliveredAt?: Date;
};

const hasSmtpConfig = Boolean(env.SMTP_HOST && env.MAIL_FROM_EMAIL);

const transporter = hasSmtpConfig
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      ...(env.SMTP_USER
        ? {
            auth: {
              user: env.SMTP_USER,
              pass: env.SMTP_PASS,
            },
          }
        : {}),
    })
  : null;

const formatMailbox = (name: string | null | undefined, email: string) => (name ? `"${name}" <${email}>` : email);

export const sendMail = async (input: SendMailInput): Promise<MailerResult> => {
  if (!transporter) {
    console.info(
      JSON.stringify({
        level: 'info',
        msg: 'email.logged',
        subject: input.subject,
        toEmail: input.toEmail,
      }),
    );

    return {
      status: 'LOGGED',
    };
  }

  try {
    const info = await transporter.sendMail({
      from: formatMailbox(env.MAIL_FROM_NAME, env.MAIL_FROM_EMAIL),
      to: formatMailbox(input.toName, input.toEmail),
      replyTo: env.MAIL_FROM_EMAIL,
      subject: input.subject,
      text: input.text,
    });

    return {
      status: 'SENT',
      messageId: info.messageId,
      deliveredAt: new Date(),
    };
  } catch (error) {
    return {
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }
};
