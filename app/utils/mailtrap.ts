import { MailtrapClient } from "mailtrap";

export const emailClient = new MailtrapClient({
  token: process.env.MAILTRAP_TOKEN!,
});

export async function sendMailtrapEmail(to: string, templateUuid: string, variables: any) {
  const sender = {
    email: "hello@knightguardssecurity.com",
    name: "Knight Guards",
  };

  const emailResult = await emailClient.send({
    from: sender,
    to: [{ email: to }],
    template_uuid: templateUuid,
    template_variables: variables,
  });

  return emailResult;
}
