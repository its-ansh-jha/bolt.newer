import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { StepsList } from '../components/StepsList';
import { FileExplorer } from '../components/FileExplorer';
import { TabView } from '../components/TabView';
import { CodeEditor } from '../components/CodeEditor';
import { PreviewFrame } from '../components/PreviewFrame';
import { Step, FileItem, StepType } from '../types';
import axios from 'axios';
import { BACKEND_URL } from '../config';
import { parseXml } from '../steps';
import { useWebContainer } from '../hooks/useWebContainer';
import { Loader } from '../components/Loader';
import { Send, Sparkles, Download } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export function Builder() {
  const location = useLocation();
  const { prompt } = location.state as { prompt: string };
  const [userPrompt, setPrompt] = useState("");
  const [llmMessages, setLlmMessages] = useState<{role: "user" | "assistant", content: string;}[]>([]);
  const [loading, setLoading] = useState(false);
  const [templateSet, setTemplateSet] = useState(false);
  const webcontainer = useWebContainer();

  const [currentStep, setCurrentStep] = useState(1);
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  
  const [steps, setSteps] = useState<Step[]>([]);

  const [files, setFiles] = useState<FileItem[]>([]);

  useEffect(() => {
    let originalFiles = [...files];
    let updateHappened = false;
    let lastCreatedFile: FileItem | null = null;
    
    steps.filter(({status}) => status === "pending").map(step => {
      updateHappened = true;
      if (step?.type === StepType.CreateFile) {
        let parsedPath = step.path?.split("/") ?? []; // ["src", "components", "App.tsx"]
        let currentFileStructure = [...originalFiles]; // {}
        let finalAnswerRef = currentFileStructure;
  
        let currentFolder = ""
        while(parsedPath.length) {
          currentFolder =  `${currentFolder}/${parsedPath[0]}`;
          let currentFolderName = parsedPath[0];
          parsedPath = parsedPath.slice(1);
  
          if (!parsedPath.length) {
            // final file
            let file = currentFileStructure.find(x => x.path === currentFolder)
            if (!file) {
              const newFile = {
                name: currentFolderName,
                type: 'file' as const,
                path: currentFolder,
                content: step.code
              };
              currentFileStructure.push(newFile);
              lastCreatedFile = newFile;
            } else {
              file.content = step.code;
              lastCreatedFile = file;
            }
          } else {
            /// in a folder
            let folder = currentFileStructure.find(x => x.path === currentFolder)
            if (!folder) {
              // create the folder
              currentFileStructure.push({
                name: currentFolderName,
                type: 'folder',
                path: currentFolder,
                children: []
              })
            }
  
            currentFileStructure = currentFileStructure.find(x => x.path === currentFolder)!.children!;
          }
        }
        originalFiles = finalAnswerRef;
      }

    })

    if (updateHappened) {
      setFiles(originalFiles);
      
      // Auto-select the last created/edited file
      if (lastCreatedFile) {
        setSelectedFile(lastCreatedFile);
      }
      
      setSteps(steps => steps.map((s: Step) => {
        return {
          ...s,
          status: "completed"
        }
      }))
    }
    console.log(files);
  }, [steps, files]);

  useEffect(() => {
    const createMountStructure = (files: FileItem[]): Record<string, any> => {
      const mountStructure: Record<string, any> = {};
  
      const processFile = (file: FileItem, isRootFolder: boolean) => {  
        if (file.type === 'folder') {
          // For folders, create a directory entry
          mountStructure[file.name] = {
            directory: file.children ? 
              Object.fromEntries(
                file.children.map(child => [child.name, processFile(child, false)])
              ) 
              : {}
          };
        } else if (file.type === 'file') {
          if (isRootFolder) {
            mountStructure[file.name] = {
              file: {
                contents: file.content || ''
              }
            };
          } else {
            // For files, create a file entry with contents
            return {
              file: {
                contents: file.content || ''
              }
            };
          }
        }
  
        return mountStructure[file.name];
      };
  
      // Process each top-level file/folder
      files.forEach(file => processFile(file, true));
  
      return mountStructure;
    };
  
    const mountStructure = createMountStructure(files);
  
    // Mount the structure if WebContainer is available
    console.log(mountStructure);
    webcontainer?.mount(mountStructure);
  }, [files, webcontainer]);

  // Download project as ZIP
  const downloadProject = async () => {
    const zip = new JSZip();
    
    const addFilesToZip = (items: FileItem[], folder: JSZip | null = null) => {
      items.forEach(item => {
        if (item.type === 'file') {
          const path = item.path.startsWith('/') ? item.path.slice(1) : item.path;
          if (folder) {
            folder.file(item.name, item.content || '');
          } else {
            zip.file(path, item.content || '');
          }
        } else if (item.type === 'folder' && item.children) {
          const path = item.path.startsWith('/') ? item.path.slice(1) : item.path;
          const newFolder = folder ? folder.folder(item.name) : zip.folder(path);
          if (newFolder) {
            addFilesToZip(item.children, newFolder);
          }
        }
      });
    };
    
    addFilesToZip(files);
    
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, 'infonexagent-project.zip');
  };

  async function init() {
    const response = await axios.post(`${BACKEND_URL}/template`, {
      prompt: prompt.trim()
    });
    setTemplateSet(true);
    
    const {prompts, uiPrompts} = response.data;

    setSteps(parseXml(uiPrompts[0]).map((x: Step) => ({
      ...x,
      status: "pending"
    })));

    setLoading(true);
    const stepsResponse = await axios.post(`${BACKEND_URL}/chat`, {
      messages: [...prompts, prompt].map(content => ({
        role: "user",
        content
      }))
    })

    setLoading(false);

    setSteps(s => [...s, ...parseXml(stepsResponse.data.response).map(x => ({
      ...x,
      status: "pending" as "pending"
    }))]);

    setLlmMessages([...prompts, prompt].map(content => ({
      role: "user",
      content
    })));

    setLlmMessages(x => [...x, {role: "assistant", content: stepsResponse.data.response}])
  }

  useEffect(() => {
    init();
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-100">InfonexAgent</h1>
          <p className="text-sm text-gray-400 mt-1">Prompt: {prompt}</p>
        </div>
        <button
          onClick={downloadProject}
          disabled={files.length === 0}
          className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white px-4 py-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-green-600 disabled:hover:to-teal-600 shadow-lg hover:shadow-xl hover:scale-105"
        >
          <Download className="w-4 h-4" />
          <span>Download Project</span>
        </button>
      </header>
      
      <div className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-4 gap-6 p-6">
          <div className="col-span-1 space-y-6 overflow-auto">
            <div>
              <div className="max-h-[75vh] overflow-scroll">
                <StepsList
                  steps={steps}
                  currentStep={currentStep}
                  onStepClick={setCurrentStep}
                />
              </div>
              <div className='mt-4'>
                {(loading || !templateSet) && (
                  <div className='flex items-center justify-center py-6'>
                    <Loader />
                  </div>
                )}
                {!(loading || !templateSet) && (
                  <div className='bg-gray-800 rounded-xl border border-gray-700 shadow-lg overflow-hidden'>
                    <div className='relative'>
                      <textarea 
                        value={userPrompt} 
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (userPrompt.trim()) {
                              document.getElementById('send-button')?.click();
                            }
                          }
                        }}
                        placeholder='Ask AI to modify your project...'
                        className='w-full bg-gray-800 text-gray-100 p-4 pr-12 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 rounded-xl placeholder-gray-500 min-h-[80px]'
                      />
                      <button 
                        id='send-button'
                        onClick={async () => {
                          if (!userPrompt.trim()) return;
                          
                          const newMessage = {
                            role: "user" as "user",
                            content: userPrompt
                          };

                          setPrompt("");
                          setLoading(true);
                          setLlmMessages(x => [...x, newMessage]);
                          
                          let fullResponse = "";
                          
                          try {
                            const response = await fetch(`${BACKEND_URL}/chat`, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({
                                messages: [...llmMessages, newMessage]
                              })
                            });

                            const reader = response.body?.getReader();
                            const decoder = new TextDecoder();

                            if (reader) {
                              while (true) {
                                const { done, value } = await reader.read();
                                if (done) break;

                                const chunk = decoder.decode(value);
                                const lines = chunk.split('\n').filter(line => line.trim() !== '');

                                for (const line of lines) {
                                  if (line.startsWith('data: ')) {
                                    const data = line.slice(6);
                                    if (data === '[DONE]') continue;
                                    
                                    try {
                                      const parsed = JSON.parse(data);
                                      if (parsed.content) {
                                        fullResponse += parsed.content;
                                        // Update the assistant message in real-time
                                        setLlmMessages(x => {
                                          const newMessages = [...x];
                                          if (newMessages[newMessages.length - 1]?.role === 'assistant') {
                                            newMessages[newMessages.length - 1] = {
                                              role: 'assistant',
                                              content: fullResponse
                                            };
                                          } else {
                                            newMessages.push({
                                              role: 'assistant',
                                              content: fullResponse
                                            });
                                          }
                                          return newMessages;
                                        });
                                      }
                                    } catch (e) {
                                      // Skip invalid JSON
                                    }
                                  }
                                }
                              }
                            }

                            setLoading(false);

                            // Parse the complete response and update steps
                            if (fullResponse) {
                              setSteps(s => [...s, ...parseXml(fullResponse).map(x => ({
                                ...x,
                                status: "pending" as "pending"
                              }))]);
                            }
                          } catch (error) {
                            console.error('Streaming error:', error);
                            setLoading(false);
                          }
                        }}
                        disabled={!userPrompt.trim()}
                        className='absolute bottom-3 right-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white p-2.5 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-600 disabled:hover:to-purple-600 group shadow-lg hover:shadow-xl hover:scale-105'
                      >
                        <Send className='w-5 h-5 group-hover:translate-x-0.5 transition-transform' />
                      </button>
                    </div>
                    <div className='px-4 py-2 bg-gray-900/50 border-t border-gray-700 flex items-center gap-2 text-xs text-gray-500'>
                      <Sparkles className='w-3.5 h-3.5' />
                      <span>Press Enter to send, Shift+Enter for new line</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="col-span-1">
              <FileExplorer 
                files={files} 
                onFileSelect={setSelectedFile}
              />
            </div>
          <div className="col-span-2 bg-gray-900 rounded-lg shadow-lg p-4 h-[calc(100vh-8rem)]">
            <TabView activeTab={activeTab} onTabChange={setActiveTab} />
            <div className="h-[calc(100%-4rem)]">
              {activeTab === 'code' ? (
                <CodeEditor file={selectedFile} />
              ) : (
                webcontainer && <PreviewFrame webContainer={webcontainer} files={files} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}