import { type ReactNode } from 'react';
import { clsx } from 'clsx';

interface BadgeProps {
    children: ReactNode;
    variant?: 'success' | 'warning' | 'neutral' | 'error' | 'primary' | 'info';
}

export const Badge = ({ children, variant = 'neutral' }: BadgeProps) => {
    const styles = {
        success: "bg-emerald-50 text-emerald-700 border-emerald-200",
        warning: "bg-amber-50 text-amber-700 border-amber-200",
        error: "bg-red-50 text-red-700 border-red-200",
        neutral: "bg-slate-50 text-slate-700 border-slate-200",
        primary: "bg-violet-50 text-violet-700 border-violet-200",
        info: "bg-blue-50 text-blue-700 border-blue-200",
    };

    return (
        <span className={clsx("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", styles[variant])}>
            {children}
        </span>
    );
};