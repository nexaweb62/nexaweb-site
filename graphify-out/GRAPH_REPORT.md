# Graph Report - c:/Users/ahmou/Documents/nexa-web  (2026-08-07)

## Corpus Check
- Corpus is ~16,935 words - fits in a single context window. You may not need a graph.

## Summary
- 107 nodes · 154 edges · 16 communities (13 shown, 3 thin omitted)
- Extraction: 79% EXTRACTED · 19% INFERRED · 2% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Morph Gallery Engine
- Morph Hero Animation
- Demo Client Sites
- Core Scripts & Navigation
- Content Pages
- AI Chatbot & Architecture
- PWA Manifest
- Lead Gen & Forms
- Brand & Hero Visual
- Favicon & Identity
- Mac Intro Animation
- 404 Error Page

## God Nodes (most connected - your core abstractions)
1. `Nexa Web Homepage` - 27 edges
2. `MorphGallery()` - 15 edges
3. `Contact Page with D3 Globe` - 15 edges
4. `Project Notes and Architecture` - 13 edges
5. `MorphHero()` - 11 edges
6. `Main JavaScript (i18n, theme, forms, popups, timeline, reCAPTCHA)` - 7 edges
7. `Quote Request Form Page` - 6 edges
8. `Pricing Page (Vitrine / Essentiel / Standard / Premium)` - 5 edges
9. `NexaWeb Favicon Logo` - 5 edges
10. `Hero Thumbnail SVG` - 5 edges

## Surprising Connections (you probably didn't know these)
- `Contact Page with D3 Globe` --semantically_similar_to--> `Quote Request Form Page`  [INFERRED] [semantically similar]
  contact.html → devis.html
- `Orphan Case Study: Atelier Dubois (artisan)` --semantically_similar_to--> `Demo: Elegance Studio Beauty Institute`  [INFERRED] [semantically similar]
  projet-atelier-dubois.html → demo-beaute.html
- `Nexa Web Homepage` --conceptually_related_to--> `Orphan Case Study: Atelier Dubois (artisan)`  [AMBIGUOUS]
  index.html → projet-atelier-dubois.html
- `Nexa Web Homepage` --conceptually_related_to--> `Orphan Case Study: Boutique Lea (e-commerce)`  [AMBIGUOUS]
  index.html → projet-boutique-lea.html
- `Nexa Web Homepage` --conceptually_related_to--> `Orphan Case Study: Cabinet Martin (site redesign)`  [AMBIGUOUS]
  index.html → projet-cabinet-martin.html

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **AI Chatbot System (Widget + Proxy + Model)** — chatbot_js, notes_md_cloudflare_worker, notes_md_anthropic_api [EXTRACTED 1.00]
- **Lead Generation Service Stack (forms, reviews, booking)** — notes_md_emailjs, notes_md_formspree, notes_md_calendly [EXTRACTED 1.00]
- **Portfolio Demo Sites (six sector showcases by Nexa Web)** — demo_beaute_html, demo_boulangerie_html, demo_conseil_html, demo_garage_html, demo_plombier_html, demo_restaurant_html [EXTRACTED 1.00]

## Communities (16 total, 3 thin omitted)

### Community 2 - "Demo Client Sites"
Cohesion: 0.20
Nodes (11): Demo: Elegance Studio Beauty Institute, Demo: La Fournee d'Or Artisan Bakery, Demo: Axiom Conseil Management Consulting, Demo: Auto Expert Garage and Body Shop, Demo: AquaPro Plumber and Heating, Demo: Le Grenier Gastronomic Restaurant, Nexa Web Homepage, Three.js WebGPU Silk Animated Background (+3 more)

### Community 3 - "Core Scripts & Navigation"
Cohesion: 0.22
Nodes (4): resize(), initSilkShader(), navigate(), onEnter()

### Community 4 - "Content Pages"
Cohesion: 0.22
Nodes (9): Blog Page (stub), Contact Page with D3 Globe, Interactive D3.js Orthographic Globe (Carvin marker), Contract Template Page (CGV stub), E-Commerce Service Page (stub), Legal Notices and RGPD Page (stub), Thank-You Page After Contact Form, SEO Service Page (stub) (+1 more)

### Community 5 - "AI Chatbot & Architecture"
Cohesion: 0.28
Nodes (9): AI Chatbot Widget (proxies to Cloudflare Worker), Morph Gallery Scroll Animation Script, Project Notes and Architecture, Anthropic API (Claude Haiku chatbot backend), Cloudflare Workers Chatbot Reverse Proxy, Formspree Client Reviews Collection Service, Google Analytics Tracking (Measurement ID G-8TPVX3PQ1S), Netlify Hosting with GitHub Auto-Deploy on Push (+1 more)

### Community 6 - "PWA Manifest"
Cohesion: 0.22
Nodes (8): background_color, description, display, icons, name, short_name, start_url, theme_color

### Community 7 - "Lead Gen & Forms"
Cohesion: 0.36
Nodes (8): Quote Request Form Page, Calendly Appointment Booking Integration, EmailJS Integration (contact and devis forms), Google reCAPTCHA v2 Anti-Spam on Devis Form, Appointment Booking Page (Calendly embed), Main JavaScript (i18n, theme, forms, popups, timeline, reCAPTCHA), Shared Stylesheet for All Pages, Pricing Page (Vitrine / Essentiel / Standard / Premium)

### Community 8 - "Brand & Hero Visual"
Cohesion: 0.47
Nodes (6): Web Agency Located in Carvin, Devis Gratuit Call-To-Action Button, Hero Section Page Layout Preview, Hero Thumbnail SVG, NexaWeb Brand Identity, Silk Light Trail Visual Design Element

### Community 9 - "Favicon & Identity"
Cohesion: 0.60
Nodes (6): Dark Circle Background Shape, NexaWeb Favicon Logo, Favicon Visual Design System, Indigo Accent Color #6366f1, NexaWeb Brand Identity, NW Monogram Mark

### Community 10 - "Mac Intro Animation"
Cohesion: 0.60
Nodes (3): enter(), exit(), initScrollExit()

## Ambiguous Edges - Review These
- `Nexa Web Homepage` → `Orphan Case Study: Atelier Dubois (artisan)`  [AMBIGUOUS]
  NOTES.md · relation: conceptually_related_to
- `Nexa Web Homepage` → `Orphan Case Study: Boutique Lea (e-commerce)`  [AMBIGUOUS]
  NOTES.md · relation: conceptually_related_to
- `Nexa Web Homepage` → `Orphan Case Study: Cabinet Martin (site redesign)`  [AMBIGUOUS]
  NOTES.md · relation: conceptually_related_to

## Knowledge Gaps
- **21 isolated node(s):** `name`, `short_name`, `description`, `start_url`, `display` (+16 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Nexa Web Homepage` and `Orphan Case Study: Atelier Dubois (artisan)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Nexa Web Homepage` and `Orphan Case Study: Boutique Lea (e-commerce)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Nexa Web Homepage` and `Orphan Case Study: Cabinet Martin (site redesign)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `Nexa Web Homepage` connect `Demo Client Sites` to `Content Pages`, `AI Chatbot & Architecture`, `Lead Gen & Forms`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **Why does `Project Notes and Architecture` connect `AI Chatbot & Architecture` to `Lead Gen & Forms`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `Contact Page with D3 Globe` connect `Content Pages` to `Demo Client Sites`, `Lead Gen & Forms`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Are the 8 inferred relationships involving `Nexa Web Homepage` (e.g. with `Demo: Elegance Studio Beauty Institute` and `Demo: La Fournee d'Or Artisan Bakery`) actually correct?**
  _`Nexa Web Homepage` has 8 INFERRED edges - model-reasoned connections that need verification._