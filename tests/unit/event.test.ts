import { describe, expect, it } from 'vitest';
import site from '../../src/content/site.json';
import { countdown, eventSchema, googleCalendarUrl, icsFile, utcStamp } from '../../src/event.ts';

const start = Date.parse(site.start);
const end = Date.parse(site.end);
const MIN = 60_000;

describe('the event', () => {
  it('starts before it ends, on the day the page says', () => {
    expect(end).toBeGreaterThan(start);
    const day = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(start);
    expect(day).toBe(site.dateSpoken);
    const clock = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit' });
    expect(`${clock.format(start).replace(' PM', '')}–${clock.format(end)}`).toBe(site.time);
    const [m, d, y] = site.date.split('.').map(Number);
    expect(new Date(Date.UTC(2000 + y!, m! - 1, d!)).toISOString().slice(0, 10)).toBe(site.start.slice(0, 10));
  });

  it('stamps times in UTC for calendars', () => {
    expect(utcStamp('2026-12-03T17:00:00-06:00')).toBe('20261203T230000Z');
  });

  it('links to Google Calendar with the time and place filled in', () => {
    const u = new URL(googleCalendarUrl(site));
    expect(u.origin + u.pathname).toBe('https://calendar.google.com/calendar/render');
    expect(u.searchParams.get('dates')).toBe('20261203T230000Z/20261204T003000Z');
    expect(u.searchParams.get('text')).toBe('C3 Showcase');
    expect(u.searchParams.get('location')).toContain('Grand Atrium');
  });

  it('writes a calendar file other calendars accept', () => {
    const folded = icsFile(site);
    for (const line of folded.split('\r\n')) expect(new TextEncoder().encode(line).length, line).toBeLessThanOrEqual(75);
    const ics = folded.replace(/\r\n /g, ''); // unfolded, as a calendar reads it
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('DTSTART:20261203T230000Z\r\n');
    expect(ics).toContain('DTEND:20261204T003000Z\r\n');
    expect(ics).toContain('LOCATION:Grand Atrium\\, Owen Arts Center\\, 6101 Bishop Blvd\\, Dallas\\, TX 75205');
    expect(ics.split('\r\n').every((l) => !l.includes('\n'))).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
  });

  it('describes the event for search engines', () => {
    const s = eventSchema(site);
    expect(s['@type']).toBe('Event');
    expect(s.startDate).toBe(site.start);
    expect(JSON.stringify(s)).toContain('6101 Bishop Blvd');
  });

  it('counts down in days, then hours and minutes, then says it is on, then over', () => {
    expect(countdown(start - 16 * 24 * 60 * MIN - 5 * 60 * MIN, start, end)).toEqual({ text: '16 days to go', state: 'before' });
    expect(countdown(start - 2 * 24 * 60 * MIN, start, end).text).toBe('2 days to go');
    expect(countdown(start - 26 * 60 * MIN, start, end).text).toBe('26 h 00 min to go');
    expect(countdown(start - 95 * MIN, start, end).text).toBe('1 h 35 min to go');
    expect(countdown(start - 12 * MIN + 1, start, end).text).toBe('12 min to go');
    expect(countdown(start, start, end)).toEqual({ text: 'Happening now', state: 'now' });
    expect(countdown(end - 1, start, end).state).toBe('now');
    expect(countdown(end, start, end).state).toBe('after');
  });
});
