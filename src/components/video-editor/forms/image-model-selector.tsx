import type { ImageModel } from "@/lib/image-models";

interface ImageModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  models: ImageModel[];
}

export function ImageModelSelector({
  selectedModel,
  onModelChange,
  models,
}: ImageModelSelectorProps) {
  return (
    <div>
      <label className="text-sm font-medium">Image Model</label>
      <div className="mt-2 space-y-2">
        {models.map((model) => (
          <div key={model.id} className="flex items-center space-x-2">
            <input
              type="radio"
              id={model.id}
              name="imageModel"
              value={model.id}
              checked={selectedModel === model.id}
              onChange={(e) => onModelChange(e.target.value)}
              className="h-4 w-4 text-blue-600"
            />
            <label htmlFor={model.id} className="flex-1">
              <div className="text-sm font-medium">{model.name}</div>
              <div className="text-xs text-gray-500">{model.description}</div>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}