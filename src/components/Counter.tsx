import { useState, useEffect, useRef } from "react";

interface CounterProps {
    end: number;
    duration?: number;
    suffix?: string;
    prefix?: string;
}

const Counter = ({ end, duration = 2000, suffix = "", prefix = "" }: CounterProps) => {
    const [count, setCount] = useState(0);
    const countRef = useRef(0);
    const startTimeRef = useRef<number | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const elementRef = useRef<HTMLParagraphElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                }
            },
            { threshold: 0.1 }
        );

        if (elementRef.current) {
            observer.observe(elementRef.current);
        }

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!isVisible) return;

        const animate = (timestamp: number) => {
            if (!startTimeRef.current) startTimeRef.current = timestamp;
            const progress = timestamp - startTimeRef.current;
            const percentage = Math.min(progress / duration, 1);

            // Linear animation for constant speed
            const nextCount = Math.floor(percentage * end);

            setCount(nextCount);

            if (percentage < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }, [end, duration, isVisible]);

    return (
        <p ref={elementRef} className="font-heading text-4xl md:text-5xl font-bold text-gold mb-2">
            {prefix}{count}{suffix}
        </p>
    );
};

export default Counter;
