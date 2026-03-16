import React from "react";

export const Spinner = ({ className }: { className?: string }) => {
  return (
    <div
      className={`animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
      style={{ borderRightColor: "transparent" }}
    />
  );
};
