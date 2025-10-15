import React, { useState } from 'react';
import { FolderTree, File, ChevronRight, ChevronDown, Download } from 'lucide-react';
import { FileItem } from '../types';
import JSZip from 'jszip';

interface FileExplorerProps {
  files: FileItem[];
  onFileSelect: (file: FileItem) => void;
}

interface FileNodeProps {
  item: FileItem;
  depth: number;
  onFileClick: (file: FileItem) => void;
}

function FileNode({ item, depth, onFileClick }: FileNodeProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleClick = () => {
    if (item.type === 'folder') {
      setIsExpanded(!isExpanded);
    } else {
      onFileClick(item);
    }
  };

  return (
    <div className="select-none">
      <div
        className="flex items-center gap-2 p-2 hover:bg-gray-800 rounded-md cursor-pointer"
        style={{ paddingLeft: `${depth * 1.5}rem` }}
        onClick={handleClick}
      >
        {item.type === 'folder' && (
          <span className="text-gray-400">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </span>
        )}
        {item.type === 'folder' ? (
          <FolderTree className="w-4 h-4 text-blue-400" />
        ) : (
          <File className="w-4 h-4 text-gray-400" />
        )}
        <span className="text-gray-200">{item.name}</span>
      </div>
      {item.type === 'folder' && isExpanded && item.children && (
        <div>
          {item.children.map((child, index) => (
            <FileNode
              key={`${child.path}-${index}`}
              item={child}
              depth={depth + 1}
              onFileClick={onFileClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileExplorer({ files, onFileSelect }: FileExplorerProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownloadAll = async () => {
    if (files.length === 0) return;
    
    setDownloading(true);
    try {
      const zip = new JSZip();

      const addFilesToZip = (items: FileItem[], folder: JSZip | null = null) => {
        items.forEach(item => {
          if (item.type === 'file' && item.content !== undefined) {
            const targetFolder = folder || zip;
            targetFolder.file(item.name, item.content || '');
          } else if (item.type === 'folder' && item.children) {
            const newFolder = folder ? folder.folder(item.name) : zip.folder(item.name);
            if (newFolder) {
              addFilesToZip(item.children, newFolder);
            }
          }
        });
      };

      addFilesToZip(files);

      const content = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `infonexagent-project-${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error creating zip:', error);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="bg-gray-900 rounded-lg shadow-lg p-4 h-full overflow-auto flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-100">
          <FolderTree className="w-5 h-5" />
          File Explorer
        </h2>
        {files.length > 0 && (
          <button
            onClick={handleDownloadAll}
            disabled={downloading}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 group shadow-md hover:shadow-lg hover:scale-105"
            title="Download all files as ZIP"
          >
            <Download className="w-4 h-4 group-hover:animate-bounce" />
            {downloading ? 'Downloading...' : 'Download'}
          </button>
        )}
      </div>
      <div className="space-y-1 flex-1 overflow-auto">
        {files.length === 0 ? (
          <div className="text-gray-500 text-sm text-center py-8">
            No files generated yet
          </div>
        ) : (
          files.map((file, index) => (
            <FileNode
              key={`${file.path}-${index}`}
              item={file}
              depth={0}
              onFileClick={onFileSelect}
            />
          ))
        )}
      </div>
    </div>
  );
}