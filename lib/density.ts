export type DensityConfig = {
  density: number;
  sections: number;
  targetWords: number;
  sectionMaxTokens: number;
  inflationVolleys?: number;
  addendaPerSection?: number;
};

export const DENSITY_CONFIG: Record<number, DensityConfig> = {
  1: { density: 1, sections: 5, targetWords: 300, sectionMaxTokens: 900 },
  2: { density: 2, sections: 5, targetWords: 400, sectionMaxTokens: 1100 },
  3: { density: 3, sections: 8, targetWords: 550, sectionMaxTokens: 1400 },
  4: { density: 4, sections: 8, targetWords: 700, sectionMaxTokens: 1800 },
  5: { density: 5, sections: 12, targetWords: 900, sectionMaxTokens: 2400 },
  6: { density: 6, sections: 12, targetWords: 1100, sectionMaxTokens: 3000 },
  7: { density: 7, sections: 16, targetWords: 1300, sectionMaxTokens: 3600 },
  8: { density: 8, sections: 18, targetWords: 1500, sectionMaxTokens: 4200 },
  9: { density: 9, sections: 22, targetWords: 1700, sectionMaxTokens: 4800 },
  10: { density: 10, sections: 24, targetWords: 1900, sectionMaxTokens: 5600 },
  11: {
    density: 11,
    sections: 24,
    targetWords: 1900,
    sectionMaxTokens: 5600,
    inflationVolleys: 2,
    addendaPerSection: 1,
  },
};

export function clampSlopDensity(slopDensity: number): number {
  if (!Number.isFinite(slopDensity)) {
    return 5;
  }

  return Math.min(11, Math.max(1, Math.round(slopDensity)));
}

export function getDensityConfig(slopDensity: number): DensityConfig {
  const density = clampSlopDensity(slopDensity);
  return DENSITY_CONFIG[density] ?? DENSITY_CONFIG[5];
}

export function getBaseGenerationDensity(slopDensity: number): number {
  return clampSlopDensity(slopDensity) === 11 ? 10 : clampSlopDensity(slopDensity);
}
