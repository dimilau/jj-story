import { useState, useEffect } from "react";

interface SwitchProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
}

export const Switch = ({ checked = false, onCheckedChange, disabled = false }: SwitchProps) => {
  const [isChecked, setIsChecked] = useState(checked);

  useEffect(() => {
    setIsChecked(checked);
  }, [checked]);

  const handleChange = () => {
    const newChecked = !isChecked;
    setIsChecked(newChecked);
    onCheckedChange?.(newChecked);
  };

  return (
    <button
      role="switch"
      aria-checked={isChecked}
      onClick={handleChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        isChecked ? "bg-primary" : "bg-input"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          isChecked ? "translate-x-5" : "translate-x-1"
        }`}
      />
    </button>
  );
};
