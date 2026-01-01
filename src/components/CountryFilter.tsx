import { Globe2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export interface CountryOption {
  value: string;
  label: string;
  labelAr: string;
  flag: string;
}

export const COUNTRY_OPTIONS: CountryOption[] = [
  { value: 'global', label: 'Global', labelAr: 'عالمي', flag: '🌍' },
  { value: 'saudi-arabia', label: 'Saudi Arabia', labelAr: 'المملكة العربية السعودية', flag: '🇸🇦' },
  { value: 'uae', label: 'UAE', labelAr: 'الإمارات', flag: '🇦🇪' },
  { value: 'usa', label: 'United States', labelAr: 'الولايات المتحدة', flag: '🇺🇸' },
  { value: 'uk', label: 'United Kingdom', labelAr: 'المملكة المتحدة', flag: '🇬🇧' },
  { value: 'china', label: 'China', labelAr: 'الصين', flag: '🇨🇳' },
  { value: 'japan', label: 'Japan', labelAr: 'اليابان', flag: '🇯🇵' },
  { value: 'germany', label: 'Germany', labelAr: 'ألمانيا', flag: '🇩🇪' },
  { value: 'france', label: 'France', labelAr: 'فرنسا', flag: '🇫🇷' },
  { value: 'india', label: 'India', labelAr: 'الهند', flag: '🇮🇳' },
  { value: 'brazil', label: 'Brazil', labelAr: 'البرازيل', flag: '🇧🇷' },
  { value: 'canada', label: 'Canada', labelAr: 'كندا', flag: '🇨🇦' },
  { value: 'australia', label: 'Australia', labelAr: 'أستراليا', flag: '🇦🇺' },
  { value: 'south-korea', label: 'South Korea', labelAr: 'كوريا الجنوبية', flag: '🇰🇷' },
  { value: 'singapore', label: 'Singapore', labelAr: 'سنغافورة', flag: '🇸🇬' },
  { value: 'hong-kong', label: 'Hong Kong', labelAr: 'هونغ كونغ', flag: '🇭🇰' },
  { value: 'switzerland', label: 'Switzerland', labelAr: 'سويسرا', flag: '🇨🇭' },
  { value: 'netherlands', label: 'Netherlands', labelAr: 'هولندا', flag: '🇳🇱' },
  { value: 'sweden', label: 'Sweden', labelAr: 'السويد', flag: '🇸🇪' },
  { value: 'spain', label: 'Spain', labelAr: 'إسبانيا', flag: '🇪🇸' },
  { value: 'italy', label: 'Italy', labelAr: 'إيطاليا', flag: '🇮🇹' },
  { value: 'russia', label: 'Russia', labelAr: 'روسيا', flag: '🇷🇺' },
  { value: 'mexico', label: 'Mexico', labelAr: 'المكسيك', flag: '🇲🇽' },
  { value: 'indonesia', label: 'Indonesia', labelAr: 'إندونيسيا', flag: '🇮🇩' },
  { value: 'turkey', label: 'Turkey', labelAr: 'تركيا', flag: '🇹🇷' },
  { value: 'egypt', label: 'Egypt', labelAr: 'مصر', flag: '🇪🇬' },
  { value: 'south-africa', label: 'South Africa', labelAr: 'جنوب أفريقيا', flag: '🇿🇦' },
  { value: 'nigeria', label: 'Nigeria', labelAr: 'نيجيريا', flag: '🇳🇬' },
  { value: 'qatar', label: 'Qatar', labelAr: 'قطر', flag: '🇶🇦' },
  { value: 'kuwait', label: 'Kuwait', labelAr: 'الكويت', flag: '🇰🇼' },
  { value: 'bahrain', label: 'Bahrain', labelAr: 'البحرين', flag: '🇧🇭' },
  { value: 'oman', label: 'Oman', labelAr: 'عُمان', flag: '🇴🇲' },
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
  const { isRTL } = useLanguage();
  const selectedCountry = COUNTRY_OPTIONS.find(c => c.value === value);
  
  const getLabel = (option: CountryOption) => isRTL ? option.labelAr : option.label;
  
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
                      <span className="truncate">{getLabel(selectedCountry)}</span>
                    </span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {COUNTRY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-xs">
                    <div className="flex items-center gap-2">
                      <span>{option.flag}</span>
                      <span>{getLabel(option)}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="font-medium">{isRTL ? 'فلتر الدولة/المنطقة' : 'Country/Region Filter'}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {isRTL ? 'ركز البحث على دولة أو سوق معين' : 'Focus research on a specific country or market'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
