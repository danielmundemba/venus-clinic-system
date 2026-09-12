const RANGES = {
  temperature: { min: 35, max: 37.5, unit: '°C' },
  pulse: { min: 60, max: 100, unit: 'bpm' },
  spo2: { min: 95, max: 100, unit: '%' },
};

export const flagAbnormalVitals = (vitals) => {
  const flags = [];

  Object.entries(RANGES).forEach(([key, { min, max, unit }]) => {
    const value = parseFloat(vitals[key]);
    if (!isNaN(value) && (value < min || value > max)) {
      flags.push({ field: key, value: `${value}${unit}`, severity: 'warning' });
    }
  });

  if (vitals.bloodPressure) {
    const [sys, dia] = vitals.bloodPressure.split('/').map(Number);
    if (sys > 140 || dia > 90) flags.push({ field: 'bloodPressure', value: vitals.bloodPressure, severity: 'warning' });
    if (sys < 90 || dia < 60) flags.push({ field: 'bloodPressure', value: vitals.bloodPressure, severity: 'warning' });
  }

  return flags;
};