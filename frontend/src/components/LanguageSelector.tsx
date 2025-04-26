import React, { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Define the backend URL directly if config import fails
//
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

interface Language {
  code: string;
  name: string;
}

interface LanguageSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  value,
  onChange,
  disabled = false
}) => {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(`${BACKEND_URL}/available-languages`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch languages: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Handle the dictionary format from the backend
        // The backend now returns: { "en": "English", "es": "Spanish", ... }
        //const languagesList = Object.entries(data.languages).map(([code, name]) => ({
        //  code,
        //  name: String(name)
        //}));
        // Ignore frontend calling for list, this will not change much for launch
        const languagesList = [
          { code: "en", name: "English" },
          { code: "es", name: "Spanish" },
          { code: "fr", name: "French" },
          { code: "de", name: "German" },
          { code: "zh", name: "Chinese" },
          { code: "ja", name: "Japanese" }
        ];
        // Sort languages by name

        languagesList.sort((a, b) => a.name.localeCompare(b.name));
        setLanguages(languagesList);
        console.log("Loaded languages:", languagesList);
      } catch (err) {
        console.error("Error fetching languages:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
        
        // Fallback to common languages if API fails
        setLanguages([
          { code: "en", name: "English" },
          { code: "es", name: "Spanish" },
          { code: "fr", name: "French" },
          { code: "de", name: "German" },
          { code: "zh", name: "Chinese" },
          { code: "ja", name: "Japanese" }
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLanguages();
  }, []);

  return (
    <div className="language-selector-container">
      <label htmlFor="language-select" className="block text-sm font-medium mb-1">
        Target Language
      </label>
      
      <Select
        value={value}
        onValueChange={onChange}
        disabled={disabled || isLoading}
      >
        <SelectTrigger id="language-select" className="w-full">
          <SelectValue placeholder="Select language" />
        </SelectTrigger>
        <SelectContent>
          {error && (
            <div className="p-2 text-sm text-red-500">
              Error loading languages. Using limited list.
            </div>
          )}
          
          {languages.map((language) => (
            <SelectItem key={language.code} value={language.code}>
              {language.name}
            </SelectItem>
          ))}
          
          {languages.length === 0 && !isLoading && !error && (
            <div className="p-2 text-sm text-muted-foreground">
              No languages available
            </div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
};

export default LanguageSelector;
