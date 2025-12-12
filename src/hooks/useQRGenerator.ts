import { useState, useRef, useCallback } from "react";
import { GBPalette, GeneratedQR, generateGBQR } from "@/lib/gb-qr";
import { FONT_URL } from "@/utils/utils";
import { toast } from "sonner";

export function useQRGenerator() {
  const [title, setTitle] = useState("GAME BOY");
  const [subtitle, setSubtitle] = useState("SCAN ME");
  const [data, setData] = useState("https://gbqr.jimscope.com");
  const [scale, setScale] = useState(1);
  const [padding, setPadding] = useState(4);
  const [qrSize, setQrSize] = useState(64);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [donationsOpen, setDonationsOpen] = useState(false);

  const lastGeneratedRef = useRef<{
    exportPNG: () => Promise<Blob>;
    exportBase64: () => string;
  } | null>(null);

  const handleGenerate = useCallback(
    async (
      title: string,
      subtitle: string,
      data: string,
      palette: GBPalette,
      scale: number,
      padding: number,
      qrSize: number,
    ) => {
      if (!data.trim()) {
        toast.error("ENTER QR DATA!");
        return null;
      }

      setIsGenerating(true);
      try {
        const result = await generateGBQR({
          title,
          subtitle,
          data,
          palette,
          fontUrl: FONT_URL,
          scale,
          padding,
          qrSize,
        });

        return result;
      } catch (error) {
        console.error(error);
        toast.error("GENERATION FAILED!");
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    [],
  );

  const updatePreview = useCallback((result: GeneratedQR) => {
    if (result) {
      lastGeneratedRef.current = {
        exportPNG: result.exportPNG,
        exportBase64: result.exportBase64,
      };
      setPreviewSrc(result.exportBase64());
    }
  }, []);

  const handleExportPNG = useCallback(async () => {
    if (!lastGeneratedRef.current) return;

    const blob = await lastGeneratedRef.current.exportPNG();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gb-qr-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("PNG DOWNLOADED!");
  }, []);

  const handleCopyBase64 = useCallback(async () => {
    if (!lastGeneratedRef.current) return;

    const base64 = lastGeneratedRef.current.exportBase64();
    await navigator.clipboard.writeText(base64);
    toast.success("BASE64 COPIED!");
  }, []);

  return {
    title,
    setTitle,
    subtitle,
    setSubtitle,
    data,
    setData,
    scale,
    setScale,
    padding,
    setPadding,
    qrSize,
    setQrSize,
    isGenerating,
    setIsGenerating,
    previewSrc,
    setPreviewSrc,
    donationsOpen,
    setDonationsOpen,
    lastGeneratedRef,
    handleGenerate,
    updatePreview,
    handleExportPNG,
    handleCopyBase64,
  };
}
