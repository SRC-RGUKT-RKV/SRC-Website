import React, { useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useMemberIntro } from '../context/MemberIntroContext';

function getInitials(name = '') {
  return name
    .split(' ')
    .filter((w) => w && !w.startsWith('['))
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function MemberCard({
  member,
  variant = 'standard',
  className = '',
}) {
  const cardRef = useRef(null);
  const [imgError, setImgError] = useState(false);
  const { openMemberIntro } = useMemberIntro();

  const isFeatured = variant === 'featured';

  const handleOpen = () => {
    openMemberIntro(member, cardRef.current);
  };

  return (
    <button
      ref={cardRef}
      type="button"
      onClick={handleOpen}
      aria-label={`View cinematic introduction for ${member.name}, ${member.role}`}
      className={`src-interactive-card group relative flex w-full flex-col justify-end overflow-hidden border border-line/15 bg-navy-deep text-left hover:border-gold/75 focus-visible:border-gold ${
        isFeatured
          ? 'min-h-[380px] lg:min-h-[470px] rounded-xl'
          : 'min-h-[240px] lg:min-h-[225px] rounded-xl'
      } ${className}`}
    >
      {/* Portrait */}
      <div className="absolute inset-0 overflow-hidden bg-navy">
        {!imgError && member.image ? (
          <img
            src={member.image}
            alt={member.name}
            loading="lazy"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover object-[50%_18%] transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-navy to-navy-deep font-display text-4xl font-bold tracking-widest text-gold-light">
            {getInitials(member.name)}
          </div>
        )}
        {/* Editorial dark navy bottom readability veil */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-navy-dark/95 via-navy-dark/35 to-transparent transition-opacity duration-300 group-hover:from-navy-dark/90"
          aria-hidden="true"
        />
      </div>

      {/* Top Subtle Department Tag */}
      <div className="relative z-10 mb-auto flex items-center justify-between p-4 sm:p-5">
        <span className="rounded-sm border border-gold/30 bg-navy-dark/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-light backdrop-blur-xs">
          {member.dept}
        </span>
      </div>

      {/* Bottom Identity & Click Indicator */}
      <div className="relative z-10 flex items-end justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0">
          <h3
            className={`truncate font-display font-bold tracking-tight text-paper ${
              isFeatured ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg'
            }`}
          >
            {member.name}
          </h3>
          <p className="mt-0.5 text-xs font-medium uppercase tracking-[0.14em] text-gold-light">
            {member.role}
          </p>
        </div>

        <span
          className={`flex shrink-0 items-center justify-center rounded-full border border-paper/30 bg-navy-dark/60 text-paper transition-all duration-300 group-hover:border-gold group-hover:bg-gold group-hover:text-navy-dark ${
            isFeatured ? 'h-10 w-10' : 'h-8 w-8'
          }`}
          aria-hidden="true"
        >
          <ArrowRight className={isFeatured ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
        </span>
      </div>
    </button>
  );
}
