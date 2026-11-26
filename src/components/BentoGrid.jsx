import React from 'react';
import MemberCard from './MemberCard';

/**
 * Asymmetric editorial Bento Grid for desktop viewports (1024px+).
 * Mixes card sizes and row/column spans so the panel feels art-directed and balanced.
 */
export default function BentoGrid({ members = [] }) {
  return (
    <div className="hidden grid-cols-12 gap-4 lg:grid lg:auto-rows-[285px]">
      {members.map((member, idx) => {
        const isFeatured = idx === 0;
        const spanClass = member.bentoSpan || 'lg:col-span-4 lg:row-span-1';

        return (
          <MemberCard
            key={member.id}
            member={member}
            variant={isFeatured ? 'featured' : 'standard'}
            className={`${spanClass} h-full !min-h-0`}
          />
        );
      })}
    </div>
  );
}
