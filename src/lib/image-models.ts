export interface ImageModel {
  id: string;
  name: string;
  description: string;
}

export const imageModels: ImageModel[] = [
  {
    id: "flux-schnell",
    name: "Flux Schnell (Fast)",
    description: "Fast generation, good quality",
  },
  {
    id: "flux-dev",
    name: "Flux Dev (Balanced)",
    description: "Balanced speed and quality",
  },
  {
    id: "flux-pro",
    name: "Flux Pro (Best)",
    description: "Highest quality, slower",
  },
  {
    id: "gpt-image-1",
    name: "GPT Image 1",
    description: "OpenAI's DALL-E 3, high quality",
  },
];

export const getImageModel = (id: string): ImageModel | undefined => {
  return imageModels.find((model) => model.id === id);
};

export const getDefaultImageModel = (): ImageModel => {
  return imageModels[0]; // Default to flux-schnell
};