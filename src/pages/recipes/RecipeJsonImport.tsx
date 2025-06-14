import React, { useState } from "react";
import { Recipe } from "../../../types";
import { Button, TextAreaField } from "../../../components";
import { parseRecipeFromJson } from "../../utils/recipeJsonParser";
import { recipeImportService } from "../../services/recipeImportService";

interface RecipeJsonImportProps {
    onImport: (recipe: Omit<Recipe, "id" | "imageUrl">) => void;
    onCancel: () => void;
}

export const RecipeJsonImport: React.FC<RecipeJsonImportProps> = ({
    onImport,
    onCancel,
}) => {
    const [jsonInput, setJsonInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [previewRecipe, setPreviewRecipe] = useState<Omit<
        Recipe,
        "id" | "imageUrl"
    > | null>(null);
    const [mode, setMode] = useState<"preview" | "direct">("preview");

    const handleJsonParse = () => {
        if (!jsonInput.trim()) {
            setError("Please enter JSON data");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const parsedRecipe = parseRecipeFromJson(jsonInput);
            setPreviewRecipe(parsedRecipe);
            setError(null);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to parse JSON data"
            );
            setPreviewRecipe(null);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePreviewImport = () => {
        if (previewRecipe) {
            onImport(previewRecipe);
        }
    };

    const handleDirectImport = async () => {
        if (!jsonInput.trim()) {
            setError("Please enter JSON data");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const importedRecipe = await recipeImportService.importFromJson(
                jsonInput
            );
            // For direct import, we notify the parent but with a different flow
            window.location.reload(); // Simple way to refresh the recipes list
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to import recipe"
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleClear = () => {
        setJsonInput("");
        setPreviewRecipe(null);
        setError(null);
    };

    return (
        <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-blue-800 mb-2">
                    Import Recipe from JSON
                </h3>
                <p className="text-blue-700 text-sm">
                    Paste your recipe JSON data below. You can preview and edit
                    before importing, or import directly.
                </p>

                <div className="flex gap-2 mt-3">
                    <Button
                        type="button"
                        variant={mode === "preview" ? "primary" : "ghost"}
                        size="sm"
                        onClick={() => setMode("preview")}
                    >
                        Preview First
                    </Button>
                    <Button
                        type="button"
                        variant={mode === "direct" ? "primary" : "ghost"}
                        size="sm"
                        onClick={() => setMode("direct")}
                    >
                        Import Directly
                    </Button>
                </div>
            </div>

            <div className="space-y-4">
                <TextAreaField
                    label="Recipe JSON Data"
                    id="json-input"
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    placeholder={`{
  "title": "Taco Salad",
  "servings": 4,
  "instructions": "Recipe instructions...",
  "ingredients": [
    {
      "ingredient_name": "Olive oil",
      "quantity": 1,
      "unit": "tbsp"
    }
  ],
  "tags": ["Main Dishes", "meal prep", "taco", "mexican"]
}`}
                    rows={15}
                    className="font-mono text-sm"
                />

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-red-800 text-sm font-medium">
                            Error:
                        </p>
                        <p className="text-red-700 text-sm">{error}</p>
                    </div>
                )}

                <div className="flex gap-2">
                    {mode === "preview" ? (
                        <Button
                            type="button"
                            variant="primary"
                            onClick={handleJsonParse}
                            disabled={isLoading || !jsonInput.trim()}
                        >
                            {isLoading ? "Parsing..." : "Parse & Preview"}
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            variant="primary"
                            onClick={handleDirectImport}
                            disabled={isLoading || !jsonInput.trim()}
                        >
                            {isLoading ? "Importing..." : "Import Recipe"}
                        </Button>
                    )}
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={handleClear}
                        disabled={isLoading}
                    >
                        Clear
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onCancel}
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                </div>
            </div>

            {previewRecipe && mode === "preview" && (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <h4 className="text-lg font-medium text-gray-800 mb-3">
                        Recipe Preview
                    </h4>

                    <div className="space-y-3">
                        <div>
                            <span className="font-medium text-gray-700">
                                Title:
                            </span>
                            <span className="ml-2 text-gray-900">
                                {previewRecipe.name}
                            </span>
                        </div>

                        <div>
                            <span className="font-medium text-gray-700">
                                Servings:
                            </span>
                            <span className="ml-2 text-gray-900">
                                {previewRecipe.defaultServings}
                            </span>
                        </div>

                        {previewRecipe.prepTime && (
                            <div>
                                <span className="font-medium text-gray-700">
                                    Prep Time:
                                </span>
                                <span className="ml-2 text-gray-900">
                                    {previewRecipe.prepTime}
                                </span>
                            </div>
                        )}

                        {previewRecipe.cookTime && (
                            <div>
                                <span className="font-medium text-gray-700">
                                    Cook Time:
                                </span>
                                <span className="ml-2 text-gray-900">
                                    {previewRecipe.cookTime}
                                </span>
                            </div>
                        )}

                        <div>
                            <span className="font-medium text-gray-700">
                                Ingredients ({previewRecipe.ingredients.length}
                                ):
                            </span>
                            <ul className="mt-1 ml-4 space-y-1">
                                {previewRecipe.ingredients
                                    .slice(0, 5)
                                    .map((ingredient, index) => (
                                        <li
                                            key={index}
                                            className="text-sm text-gray-900"
                                        >
                                            {ingredient.quantity}{" "}
                                            {ingredient.unit}{" "}
                                            {ingredient.ingredientName}
                                        </li>
                                    ))}
                                {previewRecipe.ingredients.length > 5 && (
                                    <li className="text-sm text-gray-500">
                                        ... and{" "}
                                        {previewRecipe.ingredients.length - 5}{" "}
                                        more
                                    </li>
                                )}
                            </ul>
                        </div>

                        <div>
                            <span className="font-medium text-gray-700">
                                Instructions:
                            </span>
                            <p className="mt-1 text-sm text-gray-900 line-clamp-3">
                                {previewRecipe.instructions.substring(0, 200)}
                                {previewRecipe.instructions.length > 200 &&
                                    "..."}
                            </p>
                        </div>

                        {previewRecipe.tags &&
                            previewRecipe.tags.length > 0 && (
                                <div>
                                    <span className="font-medium text-gray-700">
                                        Tags:
                                    </span>
                                    <span className="ml-2 text-gray-900">
                                        {previewRecipe.tags.join(", ")}
                                    </span>
                                </div>
                            )}
                    </div>

                    <div className="flex gap-2 mt-4 pt-3 border-t border-gray-200">
                        <Button
                            type="button"
                            variant="primary"
                            onClick={handlePreviewImport}
                            disabled={isLoading}
                        >
                            Use This Recipe
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setPreviewRecipe(null)}
                            disabled={isLoading}
                        >
                            Edit JSON
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};
