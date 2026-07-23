/**
 * Available job transitions per state — mirrors the automotive pack's job workflow (kept in sync with the
 * web app's map). State only ever changes through POST /work-items/:id/transition; these are the events
 * offered for each state. A state absent here (or with an empty list) is terminal / has no manual moves.
 */
export const JOB_EVENTS: Record<string, { event: string; label: string }[]> = {
  Booked: [{ event: 'START', label: 'Start work' }],
  InProgress: [
    { event: 'AWAIT_PARTS', label: 'Await parts' },
    { event: 'READY', label: 'Mark ready' },
  ],
  AwaitingParts: [{ event: 'RESUME', label: 'Resume' }],
  Ready: [{ event: 'COLLECT', label: 'Mark collected' }],
  Collected: [],
};

export function eventsFor(stateName: string): { event: string; label: string }[] {
  return JOB_EVENTS[stateName] ?? [];
}
