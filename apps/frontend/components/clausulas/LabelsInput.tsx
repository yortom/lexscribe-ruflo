'use client';
import { useState } from 'react';

interface LabelsInputProps {
  value: string[];
  onChange: (next: string[]) => void;
}

function normalize(raw: string): string {
  return raw.trim().toLowerCase();
}

export function LabelsInput({ value, onChange }: LabelsInputProps) {
  const [input, setInput] = useState('');

  function addLabel() {
    const label = normalize(input);
    if (label && !value.includes(label)) {
      onChange([...value, label]);
    }
    setInput('');
  }

  function removeLabel(label: string) {
    onChange(value.filter((l) => l !== label));
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {value.map((label) => (
          <span
            key={label}
            className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800"
          >
            {label}
            <button
              type="button"
              onClick={() => removeLabel(label)}
              className="text-blue-600 hover:text-blue-900"
              aria-label={`Eliminar label ${label}`}
            >
              x
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={input}
        placeholder="Anadir label y pulsar Enter"
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            addLabel();
          }
        }}
        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );
}
