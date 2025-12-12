import { useState, useCallback } from "react";
import { GBPalette, GB_PALETTES } from "@/lib/gb-qr";

export function usePalette() {
  const [paletteIndex, setPaletteIndex] = useState(0);
  const [useCustomPalette, setUseCustomPalette] = useState(false);
  const [customBgColor, setCustomBgColor] = useState("#9bbc0f");
  const [customFgColor, setCustomFgColor] = useState("#0f380f");

  const getCurrentPalette = useCallback((): GBPalette => {
    if (useCustomPalette) {
      return { name: "Custom", bgColor: customBgColor, fgColor: customFgColor };
    }
    return GB_PALETTES[paletteIndex];
  }, [useCustomPalette, customBgColor, customFgColor, paletteIndex]);

  const resetToPreset = useCallback((palette: GBPalette) => {
    const presetIndex = GB_PALETTES.findIndex(
      (p) => p.bgColor === palette.bgColor && p.fgColor === palette.fgColor
    );
    
    if (presetIndex >= 0) {
      setUseCustomPalette(false);
      setPaletteIndex(presetIndex);
    } else {
      setUseCustomPalette(true);
      setCustomBgColor(palette.bgColor);
      setCustomFgColor(palette.fgColor);
    }
  }, []);

  return {
    paletteIndex,
    setPaletteIndex,
    useCustomPalette,
    setUseCustomPalette,
    customBgColor,
    setCustomBgColor,
    customFgColor,
    setCustomFgColor,
    getCurrentPalette,
    resetToPreset,
  };
}