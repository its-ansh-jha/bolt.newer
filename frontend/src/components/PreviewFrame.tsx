import { WebContainer } from '@webcontainer/api';
import React, { useEffect, useState } from 'react';

interface PreviewFrameProps {
  files: any[];
  webContainer: WebContainer;
}

export function PreviewFrame({ files, webContainer }: PreviewFrameProps) {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!webContainer || files.length === 0) {
      return;
    }

    async function startDevServer() {
      try {
        setIsLoading(true);
        
        // Install dependencies
        const installProcess = await webContainer.spawn('npm', ['install']);
        
        installProcess.output.pipeTo(new WritableStream({
          write(data) {
            console.log(data);
          }
        }));

        const installExitCode = await installProcess.exit;
        
        if (installExitCode !== 0) {
          console.error('npm install failed');
          setIsLoading(false);
          return;
        }

        // Start dev server
        await webContainer.spawn('npm', ['run', 'dev']);

        // Wait for server-ready event
        webContainer.on('server-ready', (port, serverUrl) => {
          console.log('Server ready on port:', port);
          console.log('Server URL:', serverUrl);
          setUrl(serverUrl);
          setIsLoading(false);
        });
      } catch (error) {
        console.error('Error starting dev server:', error);
        setIsLoading(false);
      }
    }

    startDevServer();
  }, [webContainer, files])
  return (
    <div className="h-full flex items-center justify-center text-gray-400">
      {isLoading && !url && <div className="text-center">
        <p className="mb-2">Starting development server...</p>
        <p className="text-sm text-gray-500">Installing dependencies and building preview</p>
      </div>}
      {url && <iframe width={"100%"} height={"100%"} src={url} />}
    </div>
  );
}