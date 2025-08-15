"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { scriptStyles } from "@/lib/script-config";
import { Textarea } from "../ui/textarea";

type ScriptSectionProps = {
  script: string;
  onChange: (value: string) => void;
  onGenerateClick?: () => void;
  maxLength?: number;
};

export function ScriptSection({
  script,
  onChange,
  onGenerateClick,
  maxLength = 1200,
}: ScriptSectionProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [source, setSource] = useState("");
  const [language, setLanguage] = useState("");
  const [duration, setDuration] = useState("30s");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scriptStyleId, setScriptStyleId] = useState<string>(
    scriptStyles[0]?.id ?? "dark-eerie-survival-rule",
  );

  function durationToSeconds(value: string): number {
    switch (value) {
      case "30s":
        return 30;
      case "45s":
        return 45;
      case "1m":
        return 60;
      case "2m":
        return 120;
      case "3m":
        return 180;
      default:
        return 60;
    }
  }

  async function handleGenerateScript() {
    setError(null);
    if (!prompt.trim()) {
      setError("Please enter a prompt to generate a script.");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userPrompt: prompt.trim(),
          scriptStyleId,
          duration: durationToSeconds(duration),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          setError("You must be signed in to generate a script.");
        } else {
          setError(data?.error || "Failed to generate script.");
        }
        return;
      }

      if (data?.script && typeof data.script === "string") {
        onChange(data.script);
        setIsDialogOpen(false);
      } else {
        setError("No script returned by the server.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error occurred.");
    } finally {
      setIsGenerating(false);
    }
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm font-medium">
          Script
          <div className="rounded-full bg-gray-100 p-1">
            <span className="text-xs text-gray-600">?</span>
          </div>
        </label>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
          onClick={() => {
            setIsDialogOpen(true);
            onGenerateClick?.();
          }}
        >
          <Sparkles className="h-4 w-4" />
          AI script writer
        </Button>
      </div>
      <div className="mb-2 text-sm text-muted-foreground">
        Enter your video script or use AI to generate one
      </div>
      <Textarea
        rows={10}
        placeholder="Enter your video script here..."
        value={script}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[120px] w-full resize-none rounded-lg border border-gray-200 p-3 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="text-right text-sm text-muted-foreground">
        {script.length}/{maxLength}
      </div>

      {/* AI Script Writer Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Generate Script with AI</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Prompt */}
            <Textarea
              placeholder="Enter a prompt for your video script, e.g. 'Create a video about Apollo Missions'"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[140px] w-full resize-none rounded-lg border border-gray-200 p-3 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {/* Additional Knowledge */}
            {/* <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 font-medium">
                  <span>Additional Knowledge</span>
                  <Badge variant="secondary">New</Badge>
                </div>
                <span className="text-sm text-foreground/80">+ Add Source</span>
              </div>
              <div className="rounded-lg border border-dashed border-gray-300 p-3 text-sm text-muted-foreground">
                <input
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="Add websites or YouTube videos as additional knowledge sources"
                  className="w-full bg-transparent outline-none"
                />
              </div>
            </div> */}

            {/* Script Style, Language and Duration */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="text-sm font-medium">Script Style</div>
                <select
                  value={scriptStyleId}
                  onChange={(e) => setScriptStyleId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-background p-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {scriptStyles.map((style) => (
                    <option key={style.id} value={style.id}>
                      {style.name}
                    </option>
                  ))}
                </select>
              </div>
              {/* <div className="space-y-2">
                <div className="text-sm font-medium">Language</div>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-background p-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a language</option>
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
              </div> */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Duration</div>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      "30s",
                      "45s",

                      "2m",
                      //  "2m", "3m"
                    ] as const
                  ).map((d) => (
                    <Button
                      key={d}
                      type="button"
                      variant={duration === d ? "default" : "outline"}
                      className={
                        duration === d
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : ""
                      }
                      onClick={() => setDuration(d)}
                      size="sm"
                    >
                      {d}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {error ? <div className="text-sm text-red-600">{error}</div> : null}

            <div className="flex justify-end">
              <Button
                disabled={isGenerating}
                onClick={handleGenerateScript}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                {isGenerating ? "Generating..." : "Generate Script"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
