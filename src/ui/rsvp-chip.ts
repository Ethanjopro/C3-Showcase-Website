// The RSVP chip in the top-right corner appears once the poster has scrolled
// away. It exists in the HTML only when event.json has an RSVP URL.

export function initRsvpChip() {
  const chip = document.querySelector<HTMLElement>('[data-rsvp-chip]');
  const poster = document.getElementById('poster');
  if (!chip || !poster) return;
  const io = new IntersectionObserver(([entry]) => {
    chip.hidden = entry?.isIntersecting ?? false;
  });
  io.observe(poster);
}
