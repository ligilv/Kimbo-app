const CM_PER_INCH = 2.54;
const KG_PER_LB = 0.45359237;

export const cmToFtIn = (cm: number) => {
  const totalInches = Math.round(cm / CM_PER_INCH);
  return { ft: Math.floor(totalInches / 12), in: totalInches % 12 };
};
export const ftInToCm = (ft: number, inches: number) =>
  Math.round((ft * 12 + inches) * CM_PER_INCH);

export const kgToLb = (kg: number) => Math.round(kg / KG_PER_LB);
export const lbToKg = (lb: number) => Math.round(lb * KG_PER_LB * 10) / 10;

export const formatHeight = (cm: number, unit: 'cm' | 'ftin') => {
  if (unit === 'cm') return `${cm} cm`;
  const { ft, in: inches } = cmToFtIn(cm);
  return `${ft}′ ${inches}″`;
};

export const formatWeight = (kg: number, unit: 'kg' | 'lb') =>
  unit === 'kg' ? `${Math.round(kg * 10) / 10} kg` : `${kgToLb(kg)} lb`;
