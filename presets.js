export const presets = [
  { name: 'Rolling Swell', expr: 'sin(x * 0.12 + t) * 1.4 + 0.26 * sin(z * 0.07 + t * 1.3)' },
  { name: 'Choppy Surf', expr: 'sin(x * 0.2 + t) * cos(z * 0.15 + t) * 0.9' },
  { name: 'Radial Tube', expr: 'sin(sqrt(x*x + z*z) * 0.18 - t) * 1.3' },
  { name: 'Gerstner Mix', expr: 'sin(x * 0.08 + t) + 0.35 * sin(z * 0.14 + t * 1.7)' },
  { name: 'Storm Ocean', expr: 'sin(x * 0.16 - t) * cos(z * 0.12 + t) + 0.55 * sin(sqrt(x*x + z*z) * 0.26 - t * 1.8)' },
  { name: 'Tube Runner', expr: 'sin(x * 0.22 + t) * sin(z * 0.08 + t * 0.5)' }
];
