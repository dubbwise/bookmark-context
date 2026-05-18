import { Search } from "lucide-react";
import { useState, useEffect } from "react";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";

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
    <div className="shrink-0 px-3 py-2">
      <InputGroup className="h-8 text-xs">
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        <InputGroupInput
          placeholder="Search collections…"
          value={internal}
          onChange={handleChange}
          autoFocus={autoFocus}
          onFocus={(e) => e.target.select()}
        />
      </InputGroup>
    </div>
  );
}
