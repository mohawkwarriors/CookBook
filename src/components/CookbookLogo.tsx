import React from "react";

interface CookbookLogoProps {
  className?: string;
}

export default function CookbookLogo({ className = "w-6 h-6" }: CookbookLogoProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      {/* Rising saffron steam curves */}
      <path
        d="M25.5 24 C24 20.5, 27 17.5, 25.5 14"
        stroke="var(--primary)"
        strokeWidth="3.1"
        strokeLinecap="round"
      />
      <path
        d="M38.5 24 C37 20.5, 40 17.5, 38.5 14"
        stroke="var(--primary)"
        strokeWidth="3.1"
        strokeLinecap="round"
      />
      <path
        d="M32 21.8 C30.5 18.2, 33.5 15.2, 32 11.2"
        stroke="var(--primary)"
        strokeWidth="3.1"
        strokeLinecap="round"
        opacity="0.65"
      />
      {/* Clean geometric ceramic bowl */}
      <path
        d="M12.5 31 H51.5 C51.5 42.4, 42.9 50.5, 32 50.5 C21.1 50.5, 12.5 42.4, 12.5 31 Z"
        stroke="currentColor"
        strokeWidth="3.3"
        strokeLinejoin="round"
      />
      {/* Subtle foot ring */}
      <path
        d="M23.5 54.5 H40.5"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}
