// Typed access to src/content/*.json. Most copy is baked into index.html at
// build time; effects read their labels from here. An effect's own copy file
// (src/content/<effect>.json) can be imported directly by that effect.

import site from '../content/site.json';
import event from '../content/event.json';
import sections from '../content/sections.json';
import projects from '../content/projects.json';
import colorways from '../content/colorways.json';

export const content = { site, event, sections, projects, colorways };

export type Content = typeof content;
export type Section = (typeof sections.items)[number];
