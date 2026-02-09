"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/lib/navigation";
import Image from "next/image";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function LanguageSelect() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("Common");

  const handleChange = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <Select value={locale} onValueChange={handleChange}>
      <SelectTrigger className="w-[140px]">
        <SelectValue placeholder={t("language")} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en">
          <div className="flex items-center gap-2">
            <Image 
              src="/flags/us.svg" 
              alt="US Flag" 
              width={20} 
              height={15} 
              className="rounded-sm object-cover"
            />
            <span>English</span>
          </div>
        </SelectItem>
        <SelectItem value="tr">
          <div className="flex items-center gap-2">
            <Image 
              src="/flags/tr.svg" 
              alt="TR Flag" 
              width={20} 
              height={15} 
              className="rounded-sm object-cover"
            />
            <span>Türkçe</span>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}