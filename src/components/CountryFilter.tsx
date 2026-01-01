import { Globe2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface CountryOption {
  value: string;
  label: string;
  flag: string;
}

export const COUNTRY_OPTIONS: CountryOption[] = [
  { value: 'global', label: 'Global', flag: '🌍' },
  { value: 'saudi-arabia', label: 'Saudi Arabia', flag: '🇸🇦' },
  { value: 'uae', label: 'UAE', flag: '🇦🇪' },
  { value: 'usa', label: 'United States', flag: '🇺🇸' },
  { value: 'uk', label: 'United Kingdom', flag: '🇬🇧' },
  { value: 'china', label: 'China', flag: '🇨🇳' },
  { value: 'japan', label: 'Japan', flag: '🇯🇵' },
  { value: 'germany', label: 'Germany', flag: '🇩🇪' },
  { value: 'france', label: 'France', flag: '🇫🇷' },
  { value: 'india', label: 'India', flag: '🇮🇳' },
  { value: 'brazil', label: 'Brazil', flag: '🇧🇷' },
  { value: 'canada', label: 'Canada', flag: '🇨🇦' },
  { value: 'australia', label: 'Australia', flag: '🇦🇺' },
  { value: 'south-korea', label: 'South Korea', flag: '🇰🇷' },
  { value: 'singapore', label: 'Singapore', flag: '🇸🇬' },
  { value: 'hong-kong', label: 'Hong Kong', flag: '🇭🇰' },
  { value: 'switzerland', label: 'Switzerland', flag: '🇨🇭' },
  { value: 'netherlands', label: 'Netherlands', flag: '🇳🇱' },
  { value: 'sweden', label: 'Sweden', flag: '🇸🇪' },
  { value: 'spain', label: 'Spain', flag: '🇪🇸' },
  { value: 'italy', label: 'Italy', flag: '🇮🇹' },
  { value: 'russia', label: 'Russia', flag: '🇷🇺' },
  { value: 'mexico', label: 'Mexico', flag: '🇲🇽' },
  { value: 'indonesia', label: 'Indonesia', flag: '🇮🇩' },
  { value: 'turkey', label: 'Turkey', flag: '🇹🇷' },
  { value: 'egypt', label: 'Egypt', flag: '🇪🇬' },
  { value: 'south-africa', label: 'South Africa', flag: '🇿🇦' },
  { value: 'nigeria', label: 'Nigeria', flag: '🇳🇬' },
  { value: 'qatar', label: 'Qatar', flag: '🇶🇦' },
  { value: 'kuwait', label: 'Kuwait', flag: '🇰🇼' },
  { value: 'bahrain', label: 'Bahrain', flag: '🇧🇭' },
  { value: 'oman', label: 'Oman', flag: '🇴🇲' },
];

interface CountryFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export const formatCountryForQuery = (countryValue: string): string => {
  if (countryValue === 'global' || !countryValue) return '';
  
  const country = COUNTRY_OPTIONS.find(c => c.value === countryValue);
  if (!country) return '';
  
  return `Focus on ${country.label} market/region.`;
};

export const CountryFilter = ({ value, onChange }: CountryFilterProps) => {
  const selectedCountry = COUNTRY_OPTIONS.find(c => c.value === value);
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center">
            <Select value={value} onValueChange={onChange}>
              <SelectTrigger className="h-7 w-[140px] text-xs border-muted gap-1">
                <Globe2 className="w-3 h-3 text-muted-foreground" />
                <SelectValue>
                  {selectedCountry && (
                    <span className="flex items-center gap-1.5">
                      <span>{selectedCountry.flag}</span>
                      <span className="truncate">{selectedCountry.label}</span>
                    </span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {COUNTRY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-xs">
                    <div className="flex items-center gap-2">
                      <span>{option.flag}</span>
                      <span>{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="font-medium">Country/Region Filter</p>
          <p className="text-xs text-muted-foreground mt-1">
            Focus research on a specific country or market
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
