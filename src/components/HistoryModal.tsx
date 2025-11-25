
import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { cn } from "./ui/utils";
import { getFollowUpStatusClasses, lifecycleStatusColors } from "../utils/followUpStatusColors";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { ArrowUpDown, ChevronDown, ChevronUp } from "lucide-react";
import { Lead, FollowUp, useLeads } from "./LeadsContext";
import { useAuth } from "./AuthContext";

interface HistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
  directorId?: string;
  directorName?: string;
  onAddFollowUp?: () => void;
  onViewCompany?: (companyId: string) => void;
}

export function HistoryModal({
  open,
  onOpenChange,
  lead,
  directorId,
  directorName,
  onAddFollowUp,
  onViewCompany,
}: HistoryModalProps) {
  const { users, user } = useAuth();
  const { getAllFollowUps } = useLeads();

  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const allFollowUps: FollowUp[] = useMemo(() => {
    try {
      return getAllFollowUps(lead, directorId) || [];
    } catch {
      return [];
    }
  }, [lead, directorId, getAllFollowUps]);

  const sortedFollowUps = useMemo(() => {
    const sorted = [...allFollowUps].sort((a, b) =>
      (a.createdAt || "").localeCompare(b.createdAt || "")
    );
    if (sortOrder === "desc") sorted.reverse();
    return sorted;
  }, [allFollowUps, sortOrder]);

  const toggleSort = () => setSortOrder((p) => (p === "asc" ? "desc" : "asc"));

  const toggleExpand = (id: string) =>
    setExpandedIds((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });

  const getCreatorName = (id?: string) => {
    const u = users.find((x) => x.id === id);
    return u?.name || "Unknown User";
  };

  const formatDate = (d?: string) =>
    d
      ? new Date(d).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "-";

  const formatTime = (t?: string) => t || "-";

  const formatTimestamp = (ts?: string) =>
    ts
      ? new Date(ts).toLocaleString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "-";

  const shouldTruncate = (text?: string) => (text || "").length > 120;

  // Permissions
  const canAddUpdate = !!user && user.role !== "super_admin";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
          max-w-6xl 
          w-[98vw] 
          h-screen 
          max-h-screen 
          flex 
          flex-col 
          p-0 
          overflow-y-auto
        "
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b scroll-mt-10">
          <DialogTitle className="text-lg sm:text-xl">
            <span className="block sm:inline mr-2">Follow-Up History</span>
            {directorName && (
              <span className="text-sm font-normal text-muted-foreground ml-2 block sm:inline">
                for {directorName}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Action Buttons */}
        <div className="px-6 py-4 border-b bg-background">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              {canAddUpdate && (
                <Button 
                  onClick={onAddFollowUp} 
                  className="h-9"
                >
                  Add / Update Follow-Up
                </Button>
              )}
              <Button 
                variant="outline" 
                onClick={() => onViewCompany?.(lead.companyId)} 
                className="h-9"
              >
                View Company Details
              </Button>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2 w-full sm:w-auto mt-3 sm:mt-0 justify-end">
              <Button
                variant="outline"
                size="icon"
                onClick={toggleSort}
                title={sortOrder === "asc" ? "Oldest First" : "Newest First"}
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-hidden px-6">
          <ScrollArea className="h-full pr-4">
            {sortedFollowUps.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No follow-ups found
              </div>
            ) : (
              <div className="space-y-4 py-4">
                {sortedFollowUps.map((fu, index) => {
                  const isActive = !fu.status || fu.status === "active";
                  const expanded = expandedIds.has(fu.id);
                  const needsTruncate = shouldTruncate(fu.remark);
                  const displayRemark =
                    needsTruncate && !expanded
                      ? `${fu.remark?.slice(0, 120)}...`
                      : fu.remark;

                  return (
                    <div key={fu.id} className="relative">
                      {index < sortedFollowUps.length - 1 && (
                        <div className="absolute left-[11px] top-8 bottom-0 w-0.5 bg-border" />
                      )}

                      <div className="flex gap-3 sm:gap-4">
                        <div
                          className={`flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 mt-1 ${
                            isActive
                              ? "bg-blue-500 border-blue-600"
                              : "bg-gray-400 border-gray-500"
                          }`}
                        />

                        <div
                          className={`flex-1 pb-6 ${
                            isActive ? "bg-blue-50 dark:bg-blue-950/20" : ""
                          } p-3 sm:p-4 rounded-lg border`}
                        >
                          {/* Header */}
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge
                                className={cn("text-xs hover:opacity-90", 
                                  isActive ? lifecycleStatusColors.active : lifecycleStatusColors.updated
                                )}
                              >
                                {isActive ? "Active" : "Updated"}
                              </Badge>
                              {!isActive && (
                                <Badge className="text-xs bg-slate-100 text-slate-700 border border-slate-300">
                                  Updated from earlier follow-up
                                </Badge>
                              )}
                              {fu.followUpStatus && (
                                <Badge className={cn("px-2 py-0.5 text-xs border-none shadow-none", getFollowUpStatusClasses(fu.followUpStatus))}>
                                  {fu.followUpStatus}
                                </Badge>
                              )}
                            </div>

                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatTimestamp(fu.createdAt)}
                            </span>
                          </div>

                          {/* Date & Time */}
                          <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-sm">
                            <div>
                              <span className="font-semibold">Date:</span>{" "}
                              <span className="text-muted-foreground">{formatDate(fu.date)}</span>
                            </div>
                            <div>
                              <span className="font-semibold">Time:</span>{" "}
                              <span className="text-muted-foreground">{formatTime(fu.time)}</span>
                            </div>
                          </div>

                          {/* Remark */}
                          <div className="mt-2">
                            <span className="font-semibold text-sm">Remark:</span>
                            <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                              {displayRemark}
                            </p>

                            {needsTruncate && (
                              <Button
                                variant="link"
                                size="sm"
                                onClick={() => toggleExpand(fu.id)}
                                className="p-0 h-auto mt-1 text-xs"
                              >
                                {expanded ? (
                                  <>
                                    <ChevronUp className="h-3 w-3 mr-1" />
                                    Show less
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="h-3 w-3 mr-1" />
                                    Show more
                                  </>
                                )}
                              </Button>
                            )}
                          </div>

                          <Separator className="my-2" />

                          {/* Footer */}
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-muted-foreground">
                            <div>
                              <span className="font-semibold">Created by:</span>{" "}
                              {getCreatorName(fu.createdBy)}
                            </div>

                            {fu.directorName && (
                              <div>
                                <span className="font-semibold">Director:</span>{" "}
                                {fu.directorName}
                              </div>
                            )}
                            
                            {fu.talkedTo && (
                              <div>
                                <span className="font-semibold text-primary">Talked To:</span>{" "}
                                {fu.talkedToName || fu.talkedTo}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Summary */}
        <div className="border-t px-6 py-4 text-sm text-muted-foreground">
          Showing {sortedFollowUps.length} of {allFollowUps.length} follow-up
          {allFollowUps.length !== 1 ? "s" : ""}
        </div>
      </DialogContent>
    </Dialog>
  );
}
