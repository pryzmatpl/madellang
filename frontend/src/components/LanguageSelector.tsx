import React from 'react';
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const languages = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
  { value: "pt", label: "Portuguese" },
  { value: "zh", label: "Chinese" },
  { value: "ja", label: "Japanese" },
  { value: "pl", label: "Polish" },
];

interface LanguageSelectorProps {
  value?: string;
  onChange?: (value: string) => void;
  selectedLanguage?: string;
  onLanguageChange?: (value: string) => void;
  disabled?: boolean;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ 
  value, 
  onChange, 
  selectedLanguage, 
  onLanguageChange,
  disabled = false
}) => {
  // Use selectedLanguage if provided, otherwise use value
  const languageValue = selectedLanguage || value || '';
  // Use onLanguageChange if provided, otherwise use onChange
  const handleChange = onLanguageChange || onChange || (() => {});
  
  const [open, setOpen] = React.useState(false);

  const selectedLanguageObj = languages.find(lang => lang.value === languageValue);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selectedLanguageObj ? selectedLanguageObj.label : "Select language..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 z-[100]">
        <Command className="w-full">
          <CommandInput placeholder="Search language..." />
          <CommandEmpty>No language found.</CommandEmpty>
          <CommandGroup className="max-h-[200px] overflow-auto">
            {languages.map((language) => (
              <CommandItem
                key={language.value}
                value={language.value}
                className="cursor-pointer hover:bg-accent"
                onSelect={(currentValue) => {
                  console.log("Language selected:", currentValue);
                  handleChange(currentValue);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    languageValue === language.value ? "opacity-100" : "opacity-0"
                  )}
                />
                {language.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default LanguageSelector;
