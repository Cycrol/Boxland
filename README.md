# Boxland — 3D Surf Math Ocean

A browser-based live surfing experience across a giant mathematical ocean. Ride procedurally generated waves, carve turns, and sculpt the sea with equations in real time.

## What It Does

Boxland turns the equation `y = f(x, z, t)` into a massive, animated ocean surface.
- `x` and `z` are world coordinates on the water plane.
- `t` is time, driving wave motion and animation.
- Vertex heights are recalculated each frame from the equation.
- The ocean is colored by height and shaded with reflective, atmospheric lighting.

## How It Works

### Surface Graphing
- The core graph logic lives in `graph.js`.
- A `PlaneGeometry` mesh is created and rotated flat.
- Each frame, vertex `y` values are updated by evaluating the user expression at the current `x`, `z`, and animated `t`.
- Values are scaled by the amplitude slider and sped up or slowed down by the speed slider.
- Vertex normals are recomputed after updates so the lighting stays smooth.

### Safe Expression Parsing
- User input is parsed and compiled into a JavaScript function.
- Only allowed identifiers can appear: `x`, `z`, `t`, `sin`, `cos`, `tan`, `sqrt`, `abs`, `pow`, `exp`, `log`, and `pi`.
- This keeps the expression evaluation restricted and avoids arbitrary code execution.

### Rendering and Camera
- `renderer.js` creates the Three.js scene, camera, lights, and fog.
- A custom orbit control implementation lets you rotate the view by dragging and zoom with the mouse wheel.
- The surface casts and receives soft shadows over a subtle ground plane.

### Audio Background
- `audio.js` creates two ambient synth-style tracks in the Web Audio API.
- The tracks are crossfaded automatically every 30 seconds.
- Playback starts on load or resumes after the first user interaction if the browser blocks autoplay.

## Controls

### Movement
- A / D: steer left and right across the wave face.
- The surfer automatically moves forward and carves turns based on slope.
- Speed builds on downslopes and slows when climbing.

### UI
- Equation input: type any allowed function expression.
- Pause button: freeze or resume the surf session.
- Wave Speed slider: control how fast the ocean evolves.
- Wavelength slider: stretch or tighten wave spacing.
- Amplitude slider: increase or decrease wave height.
- Turbulence slider: add choppy detail and stormy motion.
- Preset buttons: load surf-ready wave equations instantly.

## Allowed Expressions

Use standard math functions and operators.
- `sin`, `cos`, `tan`
- `sqrt`, `abs`
- `pow`, `exp`, `log`
- `pi`, `wave`, `wavelength`, `turb`, `amp`, `speed`

Example input:
- `sin(x * wave + t)`
- `sin(x * 0.2 + t) * cos(z * 0.15 + t)`
- `sin(sqrt(x*x + z*z) - t)`
- `sin(x * 0.08 + t) + 0.35 * sin(z * 0.14 + t * 1.7)`

## Notes for Developers

- `main.js` wires together the renderer, graph, UI, presets, and audio.
- `GraphSurface` controls mesh creation and expression evaluation.
- `Renderer` handles the animation loop, resize handling, lighting, and camera controls.
- `AudioManager` manages alternating background tracks with crossfades.

## Browser Support

Works in any modern WebGL-enabled browser (Chrome, Firefox, Safari, Edge). Requires ES6 module support.

## Audio

Background music is loaded from the local `soundtracks/` folder using:
- `Cat Cafe - Tsundere Twintails.mp3`
- `Head Empty - Tsundere Twintails.mp3`

The app alternates the two tracks with a slow crossfade every 30 seconds.

## Made with
- Three.js (3D graphics)
- Web Audio API (background music playback)
