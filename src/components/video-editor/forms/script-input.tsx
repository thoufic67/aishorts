import { Textarea } from "@/components/ui/textarea";

interface ScriptInputProps {
  value: string;
  onChange: (value: string) => void;
  maxWords?: number;
  placeholder?: string;
  rows?: number;
  showWordCount?: boolean;
  label?: string;
}

function countWords(text: string): number {
  return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
}

export function ScriptInput({
  value,
  onChange,
  maxWords,
  placeholder = "Enter script text...",
  rows = 4,
  showWordCount = false,
  label = "Script Text",
}: ScriptInputProps) {
  const wordCount = countWords(value);
  const isOverLimit = maxWords ? wordCount > maxWords : false;

  return (
    <div>
      <label className="text-sm font-medium">
        {label}
        {maxWords && showWordCount && (
          <span className="ml-2 text-xs text-gray-500">
            {wordCount}/{maxWords} words
          </span>
        )}
      </label>
      <Textarea
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        placeholder={placeholder}
        className={`mt-2 ${isOverLimit ? "border-red-500" : ""}`}
        rows={rows}
      />
      {isOverLimit && (
        <div className="mt-1 text-xs text-red-600">
          ⚠️ Script exceeds {maxWords} word limit
        </div>
      )}
      {value && !showWordCount && maxWords && isOverLimit && (
        <div className="mt-1 text-xs text-blue-600">
          ⚡ Script modified - changes will apply after regeneration
        </div>
      )}
    </div>
  );
}