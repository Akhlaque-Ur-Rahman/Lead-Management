// src/utils/followUpStatusColors.ts
export const businessStatusColors: Record<string, string> = {
    Hot: "!bg-red-600 !text-white border border-red-700",
    Warm: "!bg-amber-500 !text-white border border-amber-600",
    Cold: "!bg-blue-600 !text-white border border-blue-700",
    Converted: "!bg-green-600 !text-white border border-green-700",
    Lost: "!bg-gray-700 !text-white border border-gray-800",
};

export const lifecycleStatusColors: Record<"active" | "updated", string> = {
    active: "!bg-indigo-600 !text-white border border-indigo-700",
    updated: "!bg-gray-500 !text-white border border-gray-600",
};

export const getFollowUpStatusClasses = (status: string) => {
    return businessStatusColors[status] || "!bg-gray-500 !text-white border border-gray-600";
};
