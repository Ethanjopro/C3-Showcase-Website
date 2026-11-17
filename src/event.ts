// The event's own data, worked out from site.json: calendar links, the calendar
// file, the countdown, and what search engines read. Pure functions, no DOM.

export interface EventInfo {
  title: string;
  tagline: string;
  url: string;
  start: string;
  end: string;
  location: string;
  venue: string;
  address: string;
}

/** An ISO time as the UTC stamp calendars use: 20261203T230000Z. */
export const utcStamp = (iso: string): string => new Date(iso).toISOString().replace(/[-:]|\.\d{3}/g, '');

const place = (e: EventInfo) => `${e.location}, ${e.address}`;
const blurb = (e: EventInfo) => `${e.tagline}. ${e.url}`;

/** A link that opens Google Calendar with the event filled in. */
export function googleCalendarUrl(e: EventInfo): string {
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates: `${utcStamp(e.start)}/${utcStamp(e.end)}`,
    details: blurb(e),
    location: place(e),
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}

const icsText = (s: string) => s.replace(/\\/g, '\\\\').replace(/([,;])/g, '\\$1').replace(/\n/g, '\\n');

/** The event as an .ics file, for Apple Calendar and Outlook. */
export function icsFile(e: EventInfo): string {
  return (
    [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//C3 Showcase//Site//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${utcStamp(e.start)}-c3-showcase@${new URL(e.url).hostname}`,
      `DTSTAMP:${utcStamp(e.start)}`,
      `DTSTART:${utcStamp(e.start)}`,
      `DTEND:${utcStamp(e.end)}`,
      `SUMMARY:${icsText(e.title)}`,
      `DESCRIPTION:${icsText(blurb(e))}`,
      `LOCATION:${icsText(place(e))}`,
      `URL:${e.url}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n') + '\r\n'
  );
}

/** schema.org Event data, so a search result can show the date and place. */
export function eventSchema(e: EventInfo): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: e.title,
    description: e.tagline,
    startDate: e.start,
    endDate: e.end,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    url: e.url,
    image: `${e.url}og.jpg`,
    location: { '@type': 'Place', name: `${e.location}, ${e.venue}`, address: e.address },
    organizer: { '@type': 'Organization', name: 'Creative Computing, SMU Meadows School of the Arts' },
  };
}

export interface Countdown {
  text: string;
  state: 'before' | 'now' | 'after';
}

/** What to say about how far off the showcase is. Times are milliseconds since the epoch. */
export function countdown(now: number, start: number, end: number): Countdown {
  if (now >= end) return { text: 'This year’s showcase has ended. Thank you for coming.', state: 'after' };
  if (now >= start) return { text: 'Happening now', state: 'now' };
  const mins = Math.ceil((start - now) / 60_000);
  const days = Math.floor(mins / 1440);
  if (days >= 2) return { text: `${days} days to go`, state: 'before' };
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h >= 1) return { text: `${h} h ${String(m).padStart(2, '0')} min to go`, state: 'before' };
  return { text: `${m} min to go`, state: 'before' };
}
