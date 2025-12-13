import { type ReactNode } from 'react';
import { clsx } from 'clsx';

interface BadgeProps {
    children: ReactNode;
    variant?: 'success' | 'warning' | 'neutral' | 'error';
}

export const Badge = ({ children, variant = 'neutral' }: BadgeProps) => {
    const styles = {
        success: "bg-emerald-50 text-emerald-700 border-emerald-200",
        warning: "bg-amber-50 text-amber-700 border-amber-200",
        error: "bg-red-50 text-red-700 border-red-200",
        neutral: "bg-slate-50 text-slate-700 border-slate-200",
    };

    return (
        <span className={clsx("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", styles[variant])}>
            {children}
        </span>
    );
};