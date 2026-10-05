import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  Printer,
  Menu,
  FileText,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

// Configure the worker URL with robust fallback
try {
  if (pdfWorker) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
  } else {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
} catch (e) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

interface PdfViewerProps {
  url: string;
  filename: string;
  downloadUrl?: string;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ url, filename, downloadUrl }) => {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.15);
  const [rotation, setRotation] = useState<number>(0);
  const [showThumbnails, setShowThumbnails] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [renderLoading, setRenderLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [thumbnails, setThumbnails] = useState<{ [page: number]: string }>({});

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);

  // Load PDF Document
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setErrorMsg(null);
    setThumbnails({});

    const loadPdf = async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Server returned HTTP ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();

        if (isCancelled) return;

        const loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(arrayBuffer),
        });

        const doc = await loadingTask.promise;
        if (!isCancelled) {
          setPdfDoc(doc);
          setNumPages(doc.numPages);
          setCurrentPage(1);
          setLoading(false);
        }
      } catch (err: any) {
        console.error('Error loading PDF document:', err);
        if (!isCancelled) {
          setErrorMsg(err.message || 'Failed to load PDF document.');
          setLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      isCancelled = true;
    };
  }, [url]);

  // Generate Real Visual Thumbnails for each page
  useEffect(() => {
    if (!pdfDoc) return;
    let isCancelled = false;

    const generateThumbnails = async () => {
      const thumbMap: { [page: number]: string } = {};
      const maxThumbs = Math.min(pdfDoc.numPages, 30);

      for (let i = 1; i <= maxThumbs; i++) {
        if (isCancelled) break;
        try {
          const page = await pdfDoc.getPage(i);
          const viewport = page.getViewport({ scale: 0.25 });
          const offCanvas = document.createElement('canvas');
          offCanvas.width = viewport.width;
          offCanvas.height = viewport.height;
          const ctx = offCanvas.getContext('2d');
          if (ctx) {
            await page.render({ canvasContext: ctx, viewport }).promise;
            thumbMap[i] = offCanvas.toDataURL('image/jpeg', 0.85);

            if (!isCancelled && (i === 1 || i % 3 === 0 || i === maxThumbs)) {
              setThumbnails({ ...thumbMap });
            }
          }
        } catch (e) {
          console.warn(`Thumbnail generation notice for page ${i}:`, e);
        }
      }
      if (!isCancelled) {
        setThumbnails(thumbMap);
      }
    };

    generateThumbnails();

    return () => {
      isCancelled = true;
    };
  }, [pdfDoc]);

  // Render Page to Main Canvas
  const renderPage = useCallback(async (pageNumber: number) => {
    if (!pdfDoc || !canvasRef.current) return;

    try {
      setRenderLoading(true);

      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }

      const page = await pdfDoc.getPage(pageNumber);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const viewport = page.getViewport({ scale: scale * dpr, rotation });

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width / dpr}px`;
      canvas.style.height = `${viewport.height / dpr}px`;

      const renderContext = {
        canvasContext: ctx,
        viewport,
      };

      const task = page.render(renderContext);
      renderTaskRef.current = task;
      await task.promise;
      setRenderLoading(false);
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.warn('Canvas render notice:', err);
      }
      setRenderLoading(false);
    }
  }, [pdfDoc, scale, rotation]);

  useEffect(() => {
    if (pdfDoc && !loading) {
      renderPage(currentPage);
    }
  }, [pdfDoc, currentPage, scale, rotation, loading, renderPage]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        setCurrentPage((prev) => Math.max(prev - 1, 1));
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        setCurrentPage((prev) => Math.min(prev + 1, numPages));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [numPages]);

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, numPages));
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.15, 2.5));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.15, 0.6));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handlePrint = () => {
    window.print();
  };

  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const res = await fetch(url);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 2000);
    } catch (e) {
      console.error('Download error:', e);
    } finally {
      setDownloading(false);
    }
  };

  const handleOpenInNewTab = async () => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to open');
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } catch (e) {
      console.error('Open tab error:', e);
    }
  };

  return (
    <div className="w-full h-[760px] flex flex-col bg-[#323639] text-white rounded-xl overflow-hidden shadow-2xl border border-slate-800 select-none">
      {/* Top PDF Controls Header - Matching Screenshot 2 Down to Every Pixel */}
      <div className="h-12 bg-[#323639] border-b border-[#202124] px-4 flex items-center justify-between gap-3 text-slate-200 text-xs shrink-0 z-20">
        {/* Left: Sidebar Toggle & File Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setShowThumbnails(!showThumbnails)}
            title="Toggle thumbnail sidebar"
            className={`p-1.5 rounded hover:bg-[#474b4e] transition-colors ${
              showThumbnails ? 'bg-[#474b4e] text-blue-400' : 'text-slate-300'
            }`}
          >
            <Menu className="w-4 h-4" />
          </button>
          <span className="font-medium text-slate-100 truncate max-w-[280px] sm:max-w-[380px]">
            {filename}
          </span>
        </div>

        {/* Center: Page Selector & Zoom Controls */}
        <div className="flex items-center gap-2">
          {/* Page Counter */}
          <div className="flex items-center gap-1.5 bg-[#202124] px-2 py-1 rounded border border-[#404346]">
            <input
              type="text"
              value={currentPage}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val >= 1 && val <= numPages) {
                  setCurrentPage(val);
                }
              }}
              className="w-7 text-center bg-transparent text-white font-mono font-semibold text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 rounded"
            />
            <span className="text-slate-400 font-mono">/ {numPages}</span>
          </div>

          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={handlePrevPage}
              disabled={currentPage <= 1}
              className="p-1.5 rounded hover:bg-[#474b4e] disabled:opacity-30 disabled:hover:bg-transparent"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextPage}
              disabled={currentPage >= numPages}
              className="p-1.5 rounded hover:bg-[#474b4e] disabled:opacity-30 disabled:hover:bg-transparent"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="h-4 w-px bg-slate-600 mx-1 hidden sm:block" />

          {/* Zoom Buttons */}
          <div className="hidden sm:flex items-center gap-1">
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1.5 rounded hover:bg-[#474b4e]"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="font-mono text-[11px] min-w-[38px] text-center text-slate-300">
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1.5 rounded hover:bg-[#474b4e]"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          <div className="h-4 w-px bg-slate-600 mx-1" />

          {/* Rotate Button */}
          <button
            type="button"
            onClick={handleRotate}
            className="p-1.5 rounded hover:bg-[#474b4e]"
            title="Rotate clockwise"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Print, Download, Open Tab */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrint}
            className="p-1.5 rounded hover:bg-[#474b4e] text-slate-300 hover:text-white"
            title="Print document"
          >
            <Printer className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="p-1.5 rounded hover:bg-[#474b4e] text-slate-300 hover:text-white transition-colors disabled:opacity-50"
            title="Download file"
          >
            {downloading ? (
              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
          </button>

          <button
            type="button"
            onClick={handleOpenInNewTab}
            className="p-1.5 rounded hover:bg-[#474b4e] text-slate-300 hover:text-white transition-colors"
            title="Open in new browser tab"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Layout: Left Thumbnails + Center Viewport */}
      <div className="flex-1 flex overflow-hidden bg-[#525659] relative">
        {/* Left Vertical Thumbnails Sidebar (#2a2d30) Matching Screenshot 2 */}
        {showThumbnails && (
          <div className="w-44 bg-[#2a2d30] border-r border-[#1f2124] overflow-y-auto p-3 space-y-4 shrink-0 select-none shadow-inner">
            {Array.from({ length: numPages }, (_, i) => i + 1).map((pgNum) => {
              const isActive = currentPage === pgNum;
              const thumbUrl = thumbnails[pgNum];

              return (
                <button
                  key={pgNum}
                  type="button"
                  onClick={() => setCurrentPage(pgNum)}
                  className="w-full flex flex-col items-center group focus:outline-none"
                >
                  {/* Real Miniature Thumbnail Card */}
                  <div
                    className={`w-28 h-36 bg-white rounded-xs shadow-md p-1 flex items-center justify-center overflow-hidden transition-all duration-150 cursor-pointer ${
                      isActive
                        ? 'border-2 border-[#8ab4f8] shadow-lg ring-2 ring-[#8ab4f8]/30 scale-102'
                        : 'border border-slate-300 hover:border-slate-400 opacity-80 hover:opacity-100'
                    }`}
                  >
                    {thumbUrl ? (
                      <img
                        src={thumbUrl}
                        alt={`Page ${pgNum}`}
                        className="w-full h-full object-contain pointer-events-none"
                      />
                    ) : (
                      /* Placeholder while rendering thumbnail */
                      <div className="w-full h-full p-2 flex flex-col justify-between">
                        <div className="w-full space-y-1">
                          <div className="h-1.5 bg-slate-700 rounded w-2/3 mx-auto" />
                          <div className="h-1 bg-slate-300 rounded w-1/2 mx-auto" />
                          <div className="h-0.5 bg-slate-200 rounded w-full mt-2" />
                          <div className="h-0.5 bg-slate-200 rounded w-5/6" />
                        </div>
                        <span className="text-[8px] font-mono text-slate-400 self-center">
                          p. {pgNum}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Page Number Label Below Thumbnail */}
                  <span
                    className={`text-xs font-medium mt-1 transition-colors ${
                      isActive ? 'text-[#8ab4f8] font-bold' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  >
                    {pgNum}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Center Viewport (#525659) Showing Centered Crisp Page Canvas */}
        <div className="flex-1 overflow-auto p-6 sm:p-10 flex items-start justify-center relative">
          {loading && (
            <div className="absolute inset-0 bg-[#525659] flex flex-col items-center justify-center text-white z-30">
              <div className="w-10 h-10 border-3 border-blue-400 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm font-medium">Loading document...</p>
              <p className="text-xs text-slate-300 mt-1">{filename}</p>
            </div>
          )}

          {renderLoading && (
            <div className="absolute top-4 right-4 bg-slate-900/90 text-white text-xs px-3 py-1.5 rounded-full border border-slate-700 shadow-lg flex items-center gap-2 z-30">
              <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <span>Rendering page {currentPage}...</span>
            </div>
          )}

          {errorMsg ? (
            <div className="flex flex-col items-center justify-center min-h-[350px] p-6 text-center text-slate-300">
              <AlertCircle className="w-12 h-12 text-rose-400 mb-3" />
              <h4 className="text-base font-bold text-white mb-1">Could not preview document</h4>
              <p className="text-xs text-slate-400 max-w-md mb-4">{errorMsg}</p>
              {downloadUrl && (
                <a
                  href={downloadUrl}
                  download
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm inline-flex items-center gap-2"
                >
                  <Download className="w-4 h-4" /> Download File
                </a>
              )}
            </div>
          ) : (
            /* Centered White Sheet of Paper with Crisp Content */
            <div
              className="bg-white rounded-xs shadow-[0_4px_16px_rgba(0,0,0,0.45)] transition-all duration-150 overflow-hidden flex items-center justify-center relative"
              style={{
                transform: `rotate(${rotation}deg)`,
                transformOrigin: 'center center',
              }}
            >
              <canvas ref={canvasRef} className="block w-full h-auto" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
