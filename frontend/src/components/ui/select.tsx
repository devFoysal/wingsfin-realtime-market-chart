import * as React from "react";
import { cn } from "../../lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
}

export function Select({ className, label, children, ...props }: SelectProps) {
  return (
    <label className="grid gap-1 text-sm font-medium text-muted-foreground">
      {label}
      <select
        className={cn(
          "h-9 min-w-32 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring",
          className
        )}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}
