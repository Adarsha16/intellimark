import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    children: ReactNode;
}

export const Button = ({ className, variant = 'primary', children, ...props }: ButtonProps) => {
    const baseStyles = "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";

    const variants = {
        primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm",
        secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
        outline: "border border-slate-200 bg-transparent hover:bg-slate-100 text-slate-900",
        ghost: "bg-transparent hover:bg-slate-100 text-slate-700",
    };

    return (
        <button className={twMerge(baseStyles, variants[variant], className)} {...props}>
            {children}
        </button>
    );
};