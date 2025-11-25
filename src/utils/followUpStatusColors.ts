export const getFollowUpStatusClasses = (status: string) => {
    switch (status) {
        case "Hot": return "bg-red-500 text-white";
        case "Warm": return "bg-amber-400 text-black";
        case "Cold": return "bg-blue-500 text-white";
        case "Converted": return "bg-green-600 text-white";
        case "Lost": return "bg-gray-600 text-white";
        default: return "bg-gray-400 text-white";
    }
};
