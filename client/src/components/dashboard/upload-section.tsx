import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CloudUpload, FileText, Check, AlertCircle, Loader2, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import AISettings from "./ai-settings";

export function UploadSection() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [aiConfig, setAiConfig] = useState(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("logFile", file);

      const res = await apiRequest("POST", "/api/upload", formData);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Upload successful",
        description: `File uploaded successfully. Processing ${data.totalEntries} log entries.`,
      });
      setSelectedFile(null);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/log-files"] });
    },
    onError: (error: Error) => {
      // Try to parse the error for better user experience
      let errorMessage = error.message;
      let errorDetails = "";
      
      try {
        // Check if the error contains JSON with details
        const match = error.message.match(/\{.*\}/);
        if (match) {
          const errorData = JSON.parse(match[0]);
          if (errorData.details) {
            errorMessage = errorData.message || error.message;
            errorDetails = errorData.details.suggestion || "";
          }
        }
      } catch {
        // If parsing fails, use the original message
      }

      toast({
        title: "Upload failed",
        description: errorDetails ? `${errorMessage}. ${errorDetails}` : errorMessage,
        variant: "destructive",
        duration: 8000, // Show longer for helpful error messages
      });
      setUploadProgress(0);
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validTypes = [".txt", ".log"];
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf("."));
      
      if (!validTypes.includes(fileExtension)) {
        toast({
          title: "Invalid file type",
          description: "Please select a .txt or .log file",
          variant: "destructive",
        });
        return;
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB
        toast({
          title: "File too large",
          description: "Please select a file smaller than 10MB",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      const fakeEvent = {
        target: { files: [file] }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileSelect(fakeEvent);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  return (
    <div className="p-6">
      {/* Header */}
      <header className="bg-dark-secondary border-b border-slate-700 px-6 py-4 -mx-6 -mt-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Upload Log Files</h2>
            <p className="text-slate-400 mt-1">Submit new log files for AI-powered analysis</p>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto">
        <Card className="bg-dark-secondary border-slate-700">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-accent-blue/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CloudUpload className="h-8 w-8 text-accent-blue" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">Upload Log Files</CardTitle>
            <p className="text-slate-400">Support for Zscaler format logs (.txt, .log files)</p>
          </CardHeader>
          <CardContent>
            {/* File Upload Zone */}
            <div 
              className="border-2 border-dashed border-slate-600 rounded-xl p-12 text-center hover:border-accent-blue transition-colors cursor-pointer bg-dark-tertiary/20 mb-8"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
              <FileText className="h-16 w-16 text-slate-400 mx-auto mb-4" />
              <p className="text-xl text-white mb-2">
                {selectedFile ? selectedFile.name : "Drop your log files here"}
              </p>
              <p className="text-slate-400 mb-4">or click to browse</p>
              <Button className="bg-accent-blue hover:bg-blue-600">
                Choose Files
              </Button>
              <p className="text-xs text-slate-500 mt-4">
                Maximum file size: 100MB • Supported formats: .txt, .log
              </p>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".txt,.log"
                onChange={handleFileSelect}
              />
            </div>

            {/* Selected File Display */}
            {selectedFile && (
              <Card className="bg-dark-tertiary/50 border-slate-600 mb-8">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">{selectedFile.name}</span>
                    <span className="text-accent-green text-sm">Ready to upload</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-400">
                    <span>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                    <span>{selectedFile.type || "text/plain"}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Upload Progress */}
            {uploadMutation.isPending && (
              <Card className="bg-dark-tertiary/50 border-slate-600 mb-8">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">Uploading and processing...</span>
                    <Loader2 className="h-4 w-4 animate-spin text-accent-blue" />
                  </div>
                  <Progress value={uploadProgress} className="mb-2" />
                  <div className="flex justify-between text-sm text-slate-400">
                    <span>Analyzing log entries</span>
                    <span>Please wait...</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI Configuration Note */}
            <div className="mb-8">
              <Card className="bg-blue-950/50 border-blue-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-blue-200">
                    <Settings className="h-4 w-4" />
                    <span className="font-medium">AI Configuration</span>
                  </div>
                  <p className="text-sm text-blue-300 mt-1">
                    Files will be processed with default AI settings. Use the "AI & Log Management" section to configure different models and reprocess files.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="text-center">
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploadMutation.isPending}
                className="bg-accent-blue hover:bg-blue-600 px-8 py-3"
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Start Analysis"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
