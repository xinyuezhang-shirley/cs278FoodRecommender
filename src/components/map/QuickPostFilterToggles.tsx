interface QuickPostFilterTogglesProps {
  photosOnly: boolean;
  campusOnly: boolean;
  onPhotosOnly: (value: boolean) => void;
  onCampusOnly: (value: boolean) => void;
}

export function QuickPostFilterToggles({
  photosOnly,
  campusOnly,
  onPhotosOnly,
  onCampusOnly,
}: QuickPostFilterTogglesProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onPhotosOnly(!photosOnly)}
        aria-pressed={photosOnly}
        className={[
          'rounded-full px-3 py-1.5 text-[11px] font-black border transition-all duration-200 active:scale-[0.97]',
          photosOnly
            ? 'bg-[#2f5fc4] text-white border-[#2f5fc4] shadow-[0_4px_14px_rgba(47,95,196,0.25)]'
            : 'bg-white text-[#6b7280] border-[#e5e7eb] hover:border-[#2f5fc4]/35',
        ].join(' ')}
      >
        📷 With photo
      </button>
      <button
        type="button"
        onClick={() => onCampusOnly(!campusOnly)}
        aria-pressed={campusOnly}
        className={[
          'rounded-full px-3 py-1.5 text-[11px] font-black border transition-all duration-200 active:scale-[0.97]',
          campusOnly
            ? 'bg-[#0f766e] text-white border-[#0f766e] shadow-[0_4px_14px_rgba(15,118,110,0.22)]'
            : 'bg-white text-[#6b7280] border-[#e5e7eb] hover:border-[#0f766e]/35',
        ].join(' ')}
      >
        🌲 Campus area
      </button>
    </div>
  );
}
