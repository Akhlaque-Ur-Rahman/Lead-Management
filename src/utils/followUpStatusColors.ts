// Shared utility for consistent follow-up status badge colors
// Ensures visibility in both light and dark modes

export const getFollowUpStatusClasses = (status: string): string => {
    switch (status) {
        case "Hot":
            return "bg-red-500 text-white";
        case "Warm":
            return "bg-amber-400 text-black"; // amber requires black text for visibility
        case "Cold":
            return "bg-blue-500 text-white";
        case "Converted":
            return "bg-green-600 text-white";
        case "Lost":
            return "bg-gray-600 text-white";
        default:
            return "bg-gray-400 text-white";
    }
};
