import React, { useState, useEffect } from 'react';
import { Download, FileText, Image as ImageIcon, FileArchive, FileSpreadsheet, Eye, ExternalLink } from 'lucide-react';
import { ProjectFile } from '../../types/index.ts';
import { api, getAuthToken } from '../../services/api.ts';
import { Modal } from '../common/Modal.tsx';
import { PdfViewer } from './PdfViewer.tsx';

interface FilePreviewModalProps {
  file: ProjectFile | null;
  isOpen: boolean;
  onClose: () => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ file, isOpen, onClose }) => {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);

  useEffect(() => {
    if (!file || !isOpen) {
      setTextContent(null);
      setImageError(false);
      return;
    }

    const isTextLike =
      file.file_type.includes('text') ||
      file.file_type.includes('json') ||
      file.filename.endsWith('.txt') ||
      file.filename.endsWith('.csv') ||
      file.filename.endsWith('.json') ||
      file.filename.endsWith('.md');

    if (isTextLike) {
      setLoadingText(true);
      const token = getAuthToken();
      fetch(api.getPreviewUrl(file.id), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((res) => {
          if (!res.ok) throw new Error('Failed to load text preview');
          return res.text();
        })
        .then((text) => {
          setTextContent(text);
          setLoadingText(false);
        })
        .catch((err) => {
          console.error('Failed to load text preview:', err);
          setTextContent('Failed to load file contents.');
          setLoadingText(false);
        });
    }
  }, [file, isOpen]);

  if (!file) return null;

  const isImage = file.file_type.startsWith('image/') || /\.(png|jpe?g|webp|svg|gif)$/i.test(file.filename);
  const isPdf = file.file_type.includes('pdf') || /\.pdf$/i.test(file.filename);
  const isSpreadsheet = file.file_type.includes('sheet') || /\.(xlsx|xls|csv|ods)$/i.test(file.filename);
  const isArchive = file.file_type.includes('zip') || /\.(zip|rar|7z|tar|gz)$/i.test(file.filename);
  const isTextLike =
    file.file_type.includes('text') ||
    file.file_type.includes('json') ||
    /\.(txt|csv|json|md|rtf)$/i.test(file.filename);

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const previewUrl = api.getPreviewUrl(file.id);
  const downloadUrl = api.getDownloadUrl(file.id);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={file.filename}
      subtitle={`${formatSize(file.file_size)} · Uploaded on ${new Date(file.upload_date).toLocaleDateString()}`}
      maxWidth={isPdf ? '4xl' : isImage ? '3xl' : '2xl'}
    >
      <div className="space-y-4">
        {/* If PDF, use native Canvas-based PdfViewer matching Image 2 */}
        {isPdf ? (
          <PdfViewer url={previewUrl} filename={file.filename} downloadUrl={downloadUrl} />
        ) : (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 overflow-hidden flex items-center justify-center min-h-[350px] max-h-[600px]">
            {isImage ? (
              <div className="p-4 flex items-center justify-center w-full h-full overflow-auto">
                {!imageError ? (
                  <img
                    src={previewUrl}
                    alt={file.filename}
                    onError={() => setImageError(true)}
                    className="max-h-[500px] max-w-full rounded-lg object-contain shadow-sm"
                  />
                ) : (
                  <div className="text-center p-8 text-xs text-slate-500">
                    <p>Image preview unavailable.</p>
                    <a
                      href={downloadUrl}
                      download
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-semibold"
                    >
                      <Download className="w-3.5 h-3.5" /> Download Image
                    </a>
                  </div>
                )}
              </div>
            ) : isTextLike ? (
              <div className="w-full h-[400px] overflow-auto p-4 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg">
                {loadingText ? (
                  <div className="flex items-center justify-center h-full text-slate-400">
                    <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mr-2" />
                    Loading text content...
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap leading-relaxed text-slate-800 dark:text-slate-200">
                    {textContent}
                  </pre>
                )}
              </div>
            ) : (
              <div className="text-center p-8">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4">
                  {isSpreadsheet && <FileSpreadsheet className="w-8 h-8" />}
                  {isArchive && <FileArchive className="w-8 h-8" />}
                  {!isSpreadsheet && !isArchive && <FileText className="w-8 h-8" />}
                </div>
                <h4 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
                  {file.filename}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 max-w-sm mx-auto">
                  Direct in-browser interactive preview is not available for this binary format. You can download and inspect it locally.
                </p>
                <a
                  href={downloadUrl}
                  download
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  Download Document
                </a>
              </div>
            )}
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-1">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {file.project_name && (
              <span>Project: <strong className="text-slate-700 dark:text-slate-300 font-medium">{file.project_name}</strong></span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <a
              href={downloadUrl}
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Download Original
            </a>
          </div>
        </div>
      </div>
    </Modal>
  );
};
