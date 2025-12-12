import { useState, useCallback, useRef, useEffect } from "react";
import { generateGBQR, GB_PALETTES, GBPalette, loadFont } from "@/lib/gb-qr";
import JSZip from "jszip";
import { toast } from "sonner";

const FONT_URL =
  "https://fonts.gstatic.com/s/pressstart2p/v15/e3t4euO8T-267oIAQAu6jDQyK3nVivM.woff2";
const HISTORY_KEY = "gb-qr-history";

interface HistoryEntry {
  id: string;
  title: string;
  subtitle: string;
  data: string;
  palette: GBPalette;
  scale: number;
  padding: number;
  qrSize: number;
  createdAt: number;
}

function loadHistory(): HistoryEntry[] {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveHistory(history: HistoryEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 5)));
}

export function QRGenerator() {
  const [title, setTitle] = useState("GAME BOY");
  const [subtitle, setSubtitle] = useState("SCAN ME");
  const [data, setData] = useState("https://jimscope.com");
  const [paletteIndex, setPaletteIndex] = useState(0);
  const [useCustomPalette, setUseCustomPalette] = useState(false);
  const [customBgColor, setCustomBgColor] = useState("#9bbc0f");
  const [customFgColor, setCustomFgColor] = useState("#0f380f");
  const [scale, setScale] = useState(1);
  const [padding, setPadding] = useState(4);
  const [qrSize, setQrSize] = useState(64);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [donationsOpen, setDonationsOpen] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [batchType, setBatchType] = useState<"lines" | "csv">("csv");
  const [batchInput, setBatchInput] = useState("");
  const [parsedCount, setParsedCount] = useState(0);
  const [zipMode, setZipMode] = useState(true);

  const lastGeneratedRef = useRef<{
    exportPNG: () => Promise<Blob>;
    exportBase64: () => string;
  } | null>(null);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const getCurrentPalette = useCallback((): GBPalette => {
    if (useCustomPalette) {
      return { name: "Custom", bgColor: customBgColor, fgColor: customFgColor };
    }
    return GB_PALETTES[paletteIndex];
  }, [useCustomPalette, customBgColor, customFgColor, paletteIndex]);

  const handleGenerate = useCallback(async () => {
    if (!data.trim()) {
      toast.error("ENTER QR DATA!");
      return;
    }

    setIsGenerating(true);
    try {
      const palette = getCurrentPalette();
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

      lastGeneratedRef.current = result;
      setPreviewSrc(result.exportBase64());

      // Add to history (keep up to 5 unique entries)
      const entry: HistoryEntry = {
        id: Date.now().toString(),
        title,
        subtitle,
        data,
        palette,
        scale,
        padding,
        qrSize,
        createdAt: Date.now(),
      };

      setHistory((prevHistory) => {
        const filteredHistory = prevHistory.filter(
          (h) =>
            !(h.data === data && h.title === title && h.subtitle === subtitle),
        );
        const newHistory = [entry, ...filteredHistory].slice(0, 5);
        saveHistory(newHistory);
        return newHistory;
      });

      toast.success("QR GENERATED!");
    } catch (error) {
      console.error(error);
      toast.error("GENERATION FAILED!");
    } finally {
      setIsGenerating(false);
    }
  }, [title, subtitle, data, getCurrentPalette, scale, padding, qrSize]);

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

  const splitCSVLine = useCallback((line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQ = !inQ;
        continue;
      }
      if (ch === "," && !inQ) {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out;
  }, []);

  const parseLines = useCallback(
    (text: string) =>
      text
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((line) => {
          const [data, title, subtitle, name] = splitCSVLine(line).map((p) =>
            p.trim(),
          );
          return {
            data,
            title,
            subtitle,
            name: name ?? `gbqr-${Math.random().toString(36).slice(2, 6)}`,
          };
        }),
    [splitCSVLine],
  );

  const parseCSV = useCallback(
    (text: string) => {
      const rows = text
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      const items: {
        data: string;
        title: string;
        subtitle: string;
        name: string;
      }[] = [];

      for (const row of rows) {
        const parts = splitCSVLine(row).map((p) => p.trim());
        const data = parts[0];
        if (!data) continue;

        const title = parts[1] ?? "";
        const subtitle = parts[2] ?? "";
        const name = parts[3] ?? `gbqr-${items.length + 1}`;

        items.push({ data, title, subtitle, name });
      }
      return items;
    },
    [splitCSVLine],
  );

  const safeName = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, "-")
      .replace(/^-+|-+$/g, "");

  useEffect(() => {
    const count =
      batchType === "csv"
        ? parseCSV(batchInput).length
        : parseLines(batchInput).length;
    setParsedCount(count);
  }, [batchInput, batchType, parseCSV, parseLines]);

  const handleCSVFile = async (file?: File) => {
    if (!file) return;
    const text = await file.text();
    setBatchInput(text);
  };

  const handleGenerateBatch = useCallback(async () => {
    const items =
      batchType === "csv" ? parseCSV(batchInput) : parseLines(batchInput);
    if (items.length === 0) {
      toast.error("NO INPUT");
      return;
    }
    setIsGenerating(true);
    try {
      const palette = getCurrentPalette();

      // Preload font (with cache + document.fonts.ready inside)
      await loadFont(FONT_URL);

      if (zipMode) {
        const zip = new JSZip();
        for (let i = 0; i < items.length; i++) {
          const it = items[i];
          // Use item title/subtitle or fallback to form values
          const itemTitle = it.title && it.title.length ? it.title : title;
          const itemSubtitle =
            it.subtitle && it.subtitle.length ? it.subtitle : subtitle;

          const result = await generateGBQR({
            title: itemTitle,
            subtitle: itemSubtitle,
            data: it.data,
            palette,
            fontUrl: FONT_URL,
            scale,
            padding,
            qrSize,
          });
          const blob = await result.exportPNG();
          zip.file(`${safeName(it.name)}.png`, blob);
          // tiny throttle so browser doesn't get overwhelmed
          await new Promise((r) => setTimeout(r, 6));
        }
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `gbqr-batch-${Date.now()}.zip`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`EXPORTED ZIP WITH ${items.length} PNGS`);
      } else {
        for (let i = 0; i < items.length; i++) {
          const it = items[i];
          const itemTitle = it.title && it.title.length ? it.title : title;
          const itemSubtitle =
            it.subtitle && it.subtitle.length ? it.subtitle : subtitle;

          const result = await generateGBQR({
            title: itemTitle,
            subtitle: itemSubtitle,
            data: it.data,
            palette,
            fontUrl: FONT_URL,
            scale,
            padding,
            qrSize,
          });
          const blob = await result.exportPNG();
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${safeName(it.name)}.png`;
          a.click();
          URL.revokeObjectURL(url);
          await new Promise((r) => setTimeout(r, 10));
        }
        toast.success(`EXPORTED ${items.length} PNGS`);
      }
    } catch (e) {
      console.error(e);
      toast.error("BATCH FAILED!");
    } finally {
      setIsGenerating(false);
    }
  }, [
    batchInput,
    batchType,
    getCurrentPalette,
    title,
    subtitle,
    scale,
    padding,
    qrSize,
    parseCSV,
    parseLines,
    zipMode,
  ]);

  const loadFromHistory = (entry: HistoryEntry) => {
    setTitle(entry.title);
    setSubtitle(entry.subtitle);
    setData(entry.data);
    setScale(entry.scale);
    setPadding(entry.padding);
    setQrSize(entry.qrSize);

    const presetIndex = GB_PALETTES.findIndex(
      (p) =>
        p.bgColor === entry.palette.bgColor &&
        p.fgColor === entry.palette.fgColor,
    );
    if (presetIndex >= 0) {
      setUseCustomPalette(false);
      setPaletteIndex(presetIndex);
    } else {
      setUseCustomPalette(true);
      setCustomBgColor(entry.palette.bgColor);
      setCustomFgColor(entry.palette.fgColor);
    }
    toast.success("LOADED FROM HISTORY!");
  };

  const deleteFromHistory = (id: string) => {
    const newHistory = history.filter((h) => h.id !== id);
    setHistory(newHistory);
    saveHistory(newHistory);
    toast.success("DELETED!");
  };

  const currentPalette = getCurrentPalette();

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4 md:p-8 overflow-x-hidden">
      <div className="max-w-4xl mx-auto w-full">
        {/* Header */}
        <header className="pixel-header mb-4 sm:mb-8 relative">
          <div className="absolute top-1/2 -translate-y-1/2 right-3 flex gap-3">
            <a
              href="https://github.com/JimScope/gb-qr-creator"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-70 transition-opacity"
            >
              <img
                src={"icons/github.svg"}
                alt="GitHub"
                className="w-4 h-4 text-white"
              />
            </a>
            <a
              href="https://x.com/JimScope"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-70 transition-opacity"
            >
              <img src={"icons/x.svg"} alt="X" className="w-4 h-4 text-white" />
            </a>
          </div>
          <h1 className="text-base sm:text-lg md:text-xl mb-2">GB QR STUDIO</h1>
          <p className="text-[8px] md:text-xs opacity-80">
            GENERATE GAME BOY STYLE QR CODES
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Controls Panel */}
          <div className="pixel-card space-y-4 overflow-hidden">
            <h2 className="text-xs border-b border-border pb-2 mb-4 truncate">
              &gt; SETTINGS
            </h2>

            {/* Text Inputs */}
            {!batchMode && (
              <div className="space-y-3">
                <label className="block">
                  <span className="text-[8px] block mb-1">TITLE:</span>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="pixel-input"
                    maxLength={12}
                  />
                </label>

                <label className="block">
                  <span className="text-[8px] block mb-1">SUBTITLE:</span>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    className="pixel-input"
                    maxLength={12}
                  />
                </label>

                <label className="block">
                  <span className="text-[8px] block mb-1">QR DATA:</span>
                  <input
                    type="text"
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    className="pixel-input"
                    placeholder="URL or text..."
                  />
                </label>
              </div>
            )}

            {/* Palette Selection */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[8px]">PALETTE:</span>
                <label className="flex items-center gap-1 text-[8px]">
                  <input
                    type="checkbox"
                    checked={useCustomPalette}
                    onChange={(e) => setUseCustomPalette(e.target.checked)}
                    className="w-3 h-3"
                  />
                  CUSTOM
                </label>
              </div>

              {!useCustomPalette ? (
                <select
                  value={paletteIndex}
                  onChange={(e) => setPaletteIndex(Number(e.target.value))}
                  className="pixel-select"
                >
                  {GB_PALETTES.map((p, i) => (
                    <option key={p.name} value={i}>
                      {p.name.toUpperCase()}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex gap-2">
                  <label className="flex-1">
                    <span className="text-[8px] block mb-1">BG:</span>
                    <input
                      type="color"
                      value={customBgColor}
                      onChange={(e) => setCustomBgColor(e.target.value)}
                      className="w-full h-8 border-2 border-foreground cursor-pointer"
                    />
                  </label>
                  <label className="flex-1">
                    <span className="text-[8px] block mb-1">FG:</span>
                    <input
                      type="color"
                      value={customFgColor}
                      onChange={(e) => setCustomFgColor(e.target.value)}
                      className="w-full h-8 border-2 border-foreground cursor-pointer"
                    />
                  </label>
                </div>
              )}

              {/* Palette Preview */}
              <div className="flex gap-1 mt-2">
                <div
                  className="w-6 h-6 border-2 border-foreground"
                  style={{ backgroundColor: currentPalette.bgColor }}
                  title="Background"
                />
                <div
                  className="w-6 h-6 border-2 border-foreground"
                  style={{ backgroundColor: currentPalette.fgColor }}
                  title="Foreground"
                />
              </div>
            </div>

            {/* Numeric Options */}
            <div className="grid grid-cols-3 gap-2">
              <label className="block">
                <span className="text-[8px] block mb-1">SCALE:</span>
                <select
                  value={scale}
                  onChange={(e) => setScale(Number(e.target.value))}
                  className="pixel-select"
                >
                  {[1, 2, 3, 4, 5, 6, 8].map((s) => (
                    <option key={s} value={s}>
                      {s}X
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-[8px] block mb-1">PADDING:</span>
                <select
                  value={padding}
                  onChange={(e) => setPadding(Number(e.target.value))}
                  className="pixel-select"
                >
                  {[2, 4, 6, 8, 10].map((p) => (
                    <option key={p} value={p}>
                      {p}PX
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-[8px] block mb-1">QR SIZE:</span>
                <select
                  value={qrSize}
                  onChange={(e) => setQrSize(Number(e.target.value))}
                  className="pixel-select"
                >
                  {[32, 48, 64, 80, 96, 128].map((s) => (
                    <option key={s} value={s}>
                      {s}PX
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* Batch */}
            <div className="mt-2 space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-[8px]">
                  <input
                    type="checkbox"
                    checked={batchMode}
                    onChange={(e) => setBatchMode(e.target.checked)}
                    className="w-3 h-3"
                  />
                  BATCH MODE
                </label>
                {batchMode && (
                  <span className="text-[8px]">PARSED: {parsedCount}</span>
                )}
              </div>

              {batchMode ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <span className="text-[8px] block mb-1">INPUT TYPE:</span>
                      <select
                        value={batchType}
                        onChange={(e) =>
                          setBatchType(e.target.value as "lines" | "csv")
                        }
                        className="pixel-select"
                      >
                        <option value="csv">CSV</option>
                        <option value="lines">LINES</option>
                      </select>
                    </label>
                    {batchType === "csv" && (
                      <label className="block">
                        <span className="text-[8px] block mb-1">CSV FILE:</span>
                        <input
                          type="file"
                          accept=".csv,text/csv"
                          onChange={(e) => handleCSVFile(e.target.files?.[0])}
                          className="w-full text-[10px]"
                        />
                      </label>
                    )}
                  </div>
                  <label className="flex items-center gap-2 text-[8px]">
                    <input
                      type="checkbox"
                      checked={zipMode}
                      onChange={(e) => setZipMode(e.target.checked)}
                      className="w-3 h-3"
                    />
                    ZIP DOWNLOAD
                  </label>
                  {batchType === "lines" && (
                    <label className="block">
                      <span className="text-[8px] block mb-1">PASTE HERE:</span>
                      <textarea
                        value={batchInput}
                        onChange={(e) => setBatchInput(e.target.value)}
                        className="pixel-input h-24"
                        placeholder={
                          "Formato: data,title,subtitle,name\n" +
                          "Ejemplos:\n" +
                          "https://example.com,GAME BOY,SCAN ME,example-qr\n" +
                          "https://midominio.com,MY TITLE,MY SUBTITLE,qr-123"
                        }
                      />
                    </label>
                  )}
                  <button
                    onClick={handleGenerateBatch}
                    disabled={isGenerating || parsedCount === 0}
                    className="pixel-btn w-full py-3 text-sm"
                  >
                    {isGenerating ? "GENERATING..." : "GENERATE BATCH"}
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="pixel-btn w-full py-3 text-sm"
                >
                  {isGenerating ? "GENERATING..." : "GENERATE QR"}
                </button>
              )}
            </div>
          </div>

          {/* Preview Panel */}
          <div className="pixel-card overflow-hidden">
            <h2 className="text-xs border-b border-border pb-2 mb-4 truncate">
              &gt; PREVIEW
            </h2>

            {/* Canvas Preview */}
            <div className="pixel-screen scanlines min-h-[250px] sm:min-h-[300px] flex items-center justify-center overflow-hidden">
              {previewSrc ? (
                <img
                  src={previewSrc}
                  alt="Generated QR Code"
                  className="max-w-full max-h-[230px] sm:max-h-[280px]"
                  style={{ imageRendering: "pixelated" }}
                />
              ) : (
                <p className="text-[8px] text-center animate-pulse">
                  PRESS GENERATE
                  <br />
                  TO CREATE QR
                </p>
              )}
            </div>

            {/* Export Buttons */}
            {previewSrc && (
              <div className="flex gap-2 mt-4">
                <button onClick={handleExportPNG} className="pixel-btn flex-1">
                  SAVE PNG
                </button>
                <button onClick={handleCopyBase64} className="pixel-btn flex-1">
                  COPY B64
                </button>
              </div>
            )}

            {/* History */}
            {history.length > 0 && (
              <div className="mt-4">
                <h3 className="text-[8px] border-t border-border pt-2 mb-2">
                  &gt; HISTORY
                </h3>
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  {history.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-1 sm:gap-2 p-2 bg-muted/50 border border-border text-[8px]"
                    >
                      <div
                        className="w-3 h-3 border border-foreground shrink-0"
                        style={{ backgroundColor: entry.palette.bgColor }}
                      />
                      <div
                        className="flex-1 min-w-0 truncate"
                        title={entry.data}
                      >
                        {entry.title} -{" "}
                        {entry.data.length > 15
                          ? entry.data.slice(0, 15) + "..."
                          : entry.data}
                      </div>
                      <button
                        onClick={() => loadFromHistory(entry)}
                        className="px-1 sm:px-2 py-1 bg-primary text-primary-foreground hover:opacity-80 shrink-0"
                      >
                        LOAD
                      </button>
                      <button
                        onClick={() => deleteFromHistory(entry.id)}
                        className="px-1 sm:px-2 py-1 bg-destructive text-destructive-foreground hover:opacity-80 shrink-0"
                      >
                        X
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Crypto Donations */}
        <div className="pixel-card mt-4 sm:mt-8">
          <button
            onClick={() => setDonationsOpen(!donationsOpen)}
            className="w-full text-left text-xs border-b border-border pb-2 mb-2 flex items-center justify-between hover:opacity-80"
          >
            <span>&gt; SUPPORT THE PROJECT</span>
            <span className="text-[10px]">{donationsOpen ? "[-]" : "[+]"}</span>
          </button>
          {donationsOpen && (
            <div className="space-y-2">
              {[
                {
                  name: "USDT (BEP20)",
                  address: "0x4eF10F4a369d5d85Ea3E64Ec5ACbF5Fd6B3CEdaF",
                },
                {
                  name: "BTC",
                  address: "bc1qv3jlaq8u5jvcfd3ur9ew4dr98eg7f6lqpaag03",
                },
                {
                  name: "ETH",
                  address: "0x4ef10f4a369d5d85ea3e64ec5acbf5fd6b3cedaf",
                },
                {
                  name: "SOL",
                  address: "9Dpbj7RGWbLXdwX7nyfHDcUr6p7GAoffbzVkDjYzdyC9",
                },
                {
                  name: "BNB",
                  address: "0x4ef10f4a369d5d85ea3e64ec5acbf5fd6b3cedaf",
                },
                {
                  name: "USDT (ETH)",
                  address: "0x4ef10f4a369d5d85ea3e64ec5acbf5fd6b3cedaf",
                },
                {
                  name: "USDC (ETH)",
                  address: "0x4ef10f4a369d5d85ea3e64ec5acbf5fd6b3cedaf",
                },
                { name: "TRX", address: "TX88qET5JLUd7WmbAF6S4NJoZmdXHeKQVd" },
              ].map((crypto) => (
                <div
                  key={crypto.name}
                  className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 p-2 bg-muted/30 border border-border text-[8px]"
                >
                  <span className="font-bold min-w-20">{crypto.name}:</span>
                  <span className="break-all flex-1 text-muted-foreground">
                    {crypto.address}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(crypto.address);
                      toast.success(`${crypto.name} ADDRESS COPIED!`);
                    }}
                    className="px-2 py-1 bg-primary text-primary-foreground hover:opacity-80 self-start sm:self-auto"
                  >
                    COPY
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="pixel-card mt-4 sm:mt-8 text-center">
          <p className="text-[8px] text-muted-foreground">
            MADE FOR GB STUDIO // {new Date().getFullYear()}
          </p>
        </footer>
      </div>
    </div>
  );
}
