"use server";

import { sendMailtrapEmail } from "@/app/utils/mailtrap";

export async function handleSendMailtrapEmail(to: string, templateUuid: string, variables: any) {
  return await sendMailtrapEmail(to, templateUuid, variables);
}
