export function createUI({ equation, presets, onEquationChange, onPlayPause, onSpeedChange, onAmplitudeChange, onWavelengthChange, onTurbulenceChange }) {
  const equationInput = document.getElementById('equation-input');
  const speedRange = document.getElementById('speed-range');
  const amplitudeRange = document.getElementById('amplitude-range');
  const wavelengthRange = document.getElementById('wavelength-range');
  const turbulenceRange = document.getElementById('turbulence-range');
  const toggleButton = document.getElementById('toggle-animation');
  const viewButton = document.getElementById('toggle-view');
  const presetContainer = document.getElementById('preset-buttons');

  equationInput.value = equation;
  let paused = false;

  const applyEquation = () => {
    const expr = equationInput.value.trim();
    onEquationChange(expr);
  };

  equationInput.addEventListener('input', () => {
    applyEquation();
  });

  speedRange.addEventListener('input', () => {
    onSpeedChange(parseFloat(speedRange.value));
  });

  wavelengthRange.addEventListener('input', () => {
    onWavelengthChange(parseFloat(wavelengthRange.value));
  });

  turbulenceRange.addEventListener('input', () => {
    onTurbulenceChange(parseFloat(turbulenceRange.value));
  });

  amplitudeRange.addEventListener('input', () => {
    onAmplitudeChange(parseFloat(amplitudeRange.value));
  });

  toggleButton.addEventListener('click', () => {
    paused = !paused;
    toggleButton.textContent = paused ? 'Play' : 'Pause';
    onPlayPause(paused);
  });

  presets.forEach((preset) => {
    const button = document.createElement('button');
    button.className = 'preset-button';
    button.type = 'button';
    button.textContent = preset.name;
    button.addEventListener('click', () => {
      equationInput.value = preset.expr;
      applyEquation();
    });
    presetContainer.appendChild(button);
  });

  viewButton.addEventListener('click', () => {
    const nextText = onViewToggle();
    viewButton.textContent = nextText;
  });

  return {
    getEquation() {
      return equationInput.value.trim();
    }
  };
}
