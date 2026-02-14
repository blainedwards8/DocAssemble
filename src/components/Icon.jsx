import { icons } from "lucide-react";
import React from "react";

const Icon = ({ name, size = 18, className = "" }) => {
    const LucideIcon = icons[name];

    if (!LucideIcon) {
        return null;
    }

    return <LucideIcon size={size} className={className} />;
};

export default Icon;
