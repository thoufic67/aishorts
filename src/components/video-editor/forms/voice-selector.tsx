import type { VoiceOption } from "@/lib/voice-options";

interface VoiceSelectorProps {
  selectedVoice: string;
  onVoiceChange: (voice: string) => void;
  voices: VoiceOption[];
  limit?: number;
  namePrefix?: string;
}

export function VoiceSelector({
  selectedVoice,
  onVoiceChange,
  voices,
  limit,
  namePrefix = "",
}: VoiceSelectorProps) {
  const voicesToShow = limit ? voices.slice(0, limit) : voices;
  const radioName = `${namePrefix}voice`;

  return (
    <div>
      <label className="text-sm font-medium">Voice</label>
      <div className="mt-2 space-y-2">
        {voicesToShow.map((voice) => (
          <div key={voice.id} className="flex items-center space-x-2">
            <input
              type="radio"
              id={`${namePrefix}${voice.id}`}
              name={radioName}
              value={voice.id}
              checked={selectedVoice === voice.id}
              onChange={(e) => onVoiceChange(e.target.value)}
              className="h-4 w-4 text-blue-600"
            />
            <label htmlFor={`${namePrefix}${voice.id}`} className="flex-1">
              <div className="text-sm font-medium">{voice.name}</div>
              <div className="text-xs text-gray-500">{voice.description}</div>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}