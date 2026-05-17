import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useState, useEffect } from "react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}

export default function SearchBar({ value, onChange, autoFocus }: SearchBarProps) {
  const [internal, setInternal] = useState(value);

  useEffect(() => {
    setInternal(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setInternal(next);
    onChange(next);
  };

  return (
    <div className="px-3 py-2 flex-shrink-0">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search collections…"
          value={internal}
          onChange={handleChange}
          className="pl-8 h-8 text-xs bg-background border-transparent"
          autoFocus={autoFocus}
          onFocus={(e) => e.target.select()}
        />
      </div>
    </div>
  );
}
