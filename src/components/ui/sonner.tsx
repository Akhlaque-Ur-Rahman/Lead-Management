"use client";

import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      style={{
        "--normal-bg": "var(--popover)",
        "--normal-text": "var(--popover-foreground)",
        "--normal-border": "var(--border)",
        "--close-button-bg": "transparent",
        "--close-button-hover-bg": "rgba(0, 0, 0, 0.1)",
      } as React.CSSProperties}
      closeButton
      {...props}
    />
  );
};

export { Toaster };
