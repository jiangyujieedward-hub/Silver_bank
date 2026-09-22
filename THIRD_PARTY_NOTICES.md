# Third-party additions

- CircularGallery JS-CSS: React Bits, https://reactbits.dev/components/circular-gallery. Source obtained from the public React Bits registry; adapted to display real task records with task navigation and an accessible list alternative.
- Dock JS-CSS: React Bits, https://reactbits.dev/components/dock. Source obtained from the public React Bits registry; adapted with real application navigation, visible labels and reduced-motion support.
- Geographic reference data: country-state-city 3.2.1, https://github.com/harpreetkhalsagtbit/country-state-city (GPL-3.0 package). `scripts/build-communities.mjs` retains country, region and city names from its reference dataset; coordinates and personal location data are not collected by the selector. The original package and license remain available in the locked dependency. Generated dataset is `lib/geography.json`.

- Animated Circular Progress Bar: Magic UI, https://magicui.design/docs/components/animated-circular-progress-bar. Registry source adapted for real ledger values, accessible labels, zero totals and reduced motion.

- FlipCard JS-CSS: React Bits, https://reactbits.dev/micro/flip-card. Exact registry source integrated with real task navigation; motion dependency already installed.
