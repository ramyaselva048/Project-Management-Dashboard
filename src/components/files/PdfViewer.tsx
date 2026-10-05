import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  Sidebar,
  Maximize2,
  Minimize2,
  FileText,
} from 'lucide-react';

// Configure the worker URL
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface PdfViewerProps {
  url: string;
  filename: string;
  downloadUrl?: string;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ url, filename, downloadUrl }) => {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.1);
  const [rotation, setRotation] = useState<number>(0);
  const [showThumbnails, setShowThumbnails] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [renderLoading, setRenderLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);

  // Load PDF Document
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setErrorMsg(null);

    const loadPdf = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument({
          url,
          withCredentials: false,
        });

        const doc = await loadingTask.promise;
        if (!isCancelled) {
          setPdfDoc(doc);
          setNumPages(doc.numPages);
          setCurrentPage(1);
          setLoading(false);
        }
      } catch (err: any) {
        console.error('Error loading PDF via pdf.js:', err);
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

  // Render Page to Canvas
  const renderPage = useCallback(async (pageNumber: number) => {
    if (!pdfDoc || !canvasRef.current) return;

    try {
      setRenderLoading(true);

      // Cancel previous render task if active
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }

      const page = await pdfDoc.getPage(pageNumber);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({ scale: scale * dpr, rotation });

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width / dpr}px`;
      canvas.style.height = `${viewport.height / dpr}px`;

      const renderContext = {
        canvasContext: ctx,
        viewport,
        canvas,
      };

      const task = page.render(renderContext);
      renderTaskRef.current = task;
      await task.promise;
      setRenderLoading(false);
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.error('Error rendering page:', err);
      }
      setRenderLoading(false);
    }
  }, [pdfDoc, scale, rotation]);

  useEffect(() => {
    if (pdfDoc && !loading) {
      renderPage(currentPage);
    }
  }, [pdfDoc, currentPage, scale, rotation, loading, renderPage]);

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

  if (loading) {
    return (
      <div className="w-full h-[620px] bg-slate-900 flex flex-col items-center justify-center text-white rounded-xl">
        <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-semibold tracking-wide">Rendering Document...</p>
        <p className="text-xs text-slate-400 mt-1">{filename}</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="w-full h-[400px] bg-slate-900 flex flex-col items-center justify-center text-white rounded-xl p-6 text-center">
        <FileText className="w-12 h-12 text-rose-400 mb-3" />
        <h4 className="text-base font-bold text-white mb-1">Could not render PDF preview</h4>
        <p className="text-xs text-slate-400 max-w-md mb-4">{errorMsg}</p>
        {downloadUrl && (
          <a
            href={downloadUrl}
            download
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm"
          >
            <Download className="w-4 h-4" /> Download PDF File
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-[640px] flex flex-col bg-slate-900 text-slate-100 rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* Top PDF Controls Header - Matching Image 2 Design */}
      <div className="h-12 bg-slate-950/90 border-b border-slate-800 px-4 flex items-center justify-between gap-4 select-none shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setShowThumbnails(!showThumbnails)}
            title="Toggle Thumbnails Sidebar"
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              showThumbnails
                ? 'bg-indigo-600/30 text-indigo-400 border border-indigo-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Sidebar className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-slate-300 truncate max-w-[240px] hidden sm:inline">
            {filename}
          </span>
        </div>

        {/* Page Navigation */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1.5 text-xs font-mono font-medium">
            <span className="bg-slate-800 px-2 py-0.5 rounded text-white min-w-[24px] text-center">
              {currentPage}
            </span>
            <span className="text-slate-400">/</span>
            <span className="text-slate-400">{numPages}</span>
          </div>

          <button
            type="button"
            onClick={handleNextPage}
            disabled={currentPage >= numPages}
            className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom & Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <span className="text-[11px] font-mono font-semibold text-slate-300 min-w-[42px] text-center">
            {Math.round(scale * 100)}%
          </span>

          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-slate-800 mx-1" />

          <button
            type="button"
            onClick={handleRotate}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
            title="Rotate Clockwise"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {downloadUrl && (
            <a
              href={downloadUrl}
              download
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-indigo-400 transition-colors"
              title="Download PDF"
            >
              <Download className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      {/* Main Content: Left Thumbnails + Center Document Canvas */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Thumbnails Strip (Like Image 2) */}
        {showThumbnails && (
          <div className="w-36 bg-slate-950 border-r border-slate-800 overflow-y-auto p-2.5 space-y-3 shrink-0 select-none">
            {Array.from({ length: numPages }, (_, i) => i + 1).map((pgNum) => (
              <button
                key={pgNum}
                type="button"
                onClick={() => setCurrentPage(pgNum)}
                className={`w-full text-left p-1.5 rounded-lg transition-all group flex flex-col items-center ${
                  currentPage === pgNum
                    ? 'ring-2 ring-indigo-500 bg-indigo-950/40'
                    : 'hover:bg-slate-900 opacity-70 hover:opacity-100'
                }`}
              >
                {/* Thumbnail placeholder or page preview */}
                <div className="w-24 h-32 bg-white rounded shadow-sm border border-slate-300 flex flex-col justify-between p-1.5 overflow-hidden">
                  <div className="w-full space-y-1">
                    <div className="h-1 bg-slate-300 rounded w-3/4" />
                    <div className="h-0.5 bg-slate-200 rounded w-full" />
                    <div className="h-0.5 bg-slate-200 rounded w-5/6" />
                    <div className="h-0.5 bg-slate-200 rounded w-full" />
                  </div>
                  <span className="text-[8px] font-mono text-slate-400 self-center">
                    p. {pgNum}
                  </span>
                </div>
                <span className="text-[11px] font-mono mt-1 text-slate-400 group-hover:text-white font-medium">
                  {pgNum}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Center Canvas Viewport */}
        <div className="flex-1 overflow-auto bg-slate-800/80 p-6 flex items-start justify-center relative">
          {renderLoading && (
            <div className="absolute top-4 right-4 bg-slate-950/80 backdrop-blur px-3 py-1 rounded-full border border-slate-700 text-xs flex items-center gap-2 z-10 text-slate-300">
              <div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              <span>Rendering page {currentPage}...</span>
            </div>
          )}

          {/* White Paper Canvas with subtle shadow matching native PDF viewer */}
          <div className="bg-white rounded-sm shadow-2xl overflow-hidden transition-all duration-150">
            <canvas ref={canvasRef} className="block" />
          </div>
        </div>
      </div>
    </div>
  );
};
