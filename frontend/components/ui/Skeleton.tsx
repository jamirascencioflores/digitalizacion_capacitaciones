'use client';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'rect' | 'circle';
}

export default function Skeleton({ className = '', variant = 'rect' }: SkeletonProps) {
    const baseClass = "animate-pulse bg-slate-200 dark:bg-slate-800";

    const variantClasses = {
        text: "h-3 w-full rounded-md",
        rect: "h-full w-full rounded-xl",
        circle: "h-12 w-12 rounded-full"
    };

    return (
        <div className={`${baseClass} ${variantClasses[variant]} ${className}`} />
    );
}
