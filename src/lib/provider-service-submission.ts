/**
 * Keep service-creation feedback independent of the follow-up UI refresh.
 * A successful write must never be reported as a failed write because a
 * refresh or a form reset failed after Supabase had committed it.
 */
export async function completeServiceCreation(
  form: Pick<HTMLFormElement, "reset">,
  result: { ok: true; serviceId: string } | { ok: false; message: string },
  refresh: () => Promise<unknown>,
): Promise<string> {
  if (!result.ok) return result.message;

  form.reset();

  try {
    await refresh();
  } catch {
    return "Service created privately. Refresh this page to see your saved service.";
  }

  return "Service created privately. You can publish it after your professional profile is approved.";
}
