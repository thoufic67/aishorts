export interface VoiceOption {
  id: string;
  name: string;
  description: string;
}

export const voiceOptions: VoiceOption[] = [
  { id: "alloy", name: "Alloy", description: "Neutral and balanced" },
  { id: "echo", name: "Echo", description: "Clear and articulate" },
  { id: "fable", name: "Fable", description: "Warm and expressive" },
  { id: "onyx", name: "Onyx", description: "Deep and authoritative" },
  { id: "nova", name: "Nova", description: "Bright and energetic" },
  { id: "shimmer", name: "Shimmer", description: "Soft and gentle" },
];

export const getVoiceOption = (id: string): VoiceOption | undefined => {
  return voiceOptions.find((voice) => voice.id === id);
};

export const getDefaultVoiceOption = (): VoiceOption => {
  return voiceOptions[1]; // Default to echo
};