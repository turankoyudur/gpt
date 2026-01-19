import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SettingsFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

export default function SettingsField({
  label,
  value,
  onChange,
}: SettingsFieldProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
