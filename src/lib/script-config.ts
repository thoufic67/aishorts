export interface ScriptStyle {
  id: string;
  name: string;
  description: string;
  model: string;
  systemPrompt: string;
}

export const scriptStyles: ScriptStyle[] = [
  {
    id: "dark-eerie-survival-rule",
    name: "Dark & Eerie Survival rule",
    description:
      "A dark and eerie script with a lot of action and violence. It's a bit gory and violent, but it's also a bit funny and light-hearted.",
    model: "ft:gpt-4.1-nano-2025-04-14:personal:lightsoflife:C2wUlbtJ",
    systemPrompt:
      "You are an expert horror writer specializing in creating eerie rule-based survival scenarios set in liminal spaces and everyday locations turned sinister. Your scripts follow a specific format: they present a supernatural situation where the protagonist finds themselves trapped or transported to an altered reality, followed by a numbered list of survival rules they must follow to escape or survive. The tone should be unsettling, the rules should be specific and often counterintuitive, and the scenarios should feel like they could happen to anyone.",
  },
  {
    id: "storytelling",
    name: "Storytelling",
    description:
      "A storytelling script with a lot of action and violence. It's a bit gory and violent, but it's also a bit funny and light-hearted.",
    model: "gpt-4o",
    systemPrompt:
      "You are an expert horror writer specializing in creating eerie rule-based survival scenarios set in liminal spaces and everyday locations turned sinister. Your scripts follow a specific format: they present a supernatural situation where the protagonist finds themselves trapped or transported to an altered reality, followed by a numbered list of survival rules they must follow to escape or survive. The tone should be unsettling, the rules should be specific and often counterintuitive, and the scenarios should feel like they could happen to anyone.",
  },
];

export const getScriptStyle = (id: string) => {
  return scriptStyles.find((style) => style.id === id);
};
