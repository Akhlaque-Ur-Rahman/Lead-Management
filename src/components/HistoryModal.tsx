// src/components/HistoryModal.tsx
import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { Search, ArrowUpDown, ChevronDown, ChevronUp } from "lucide-react";
import { Lead, FollowUp } from "./LeadsContext";
import { useAuth } from "./AuthContext";
import { useLeads } from "./LeadsContext";

interface HistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
  directorId?: string;
  directorName?: string;
}

export function HistoryModal({
  open,
  onOpenChange,
  lead,
  directorId,
  directorName,
}: HistoryModalProps) {
  const { users } = useAuth();
  const { getAllFollowUps } = useLeads();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Get all follow-ups for the director
  const allFollowUps = useMemo(() => {
    return getAllFollowUps(lead, directorId);
  }, [lead, directorId, getAllFollowUps]);

  // Filter by search query
  const filteredFollowUps = useMemo(() => {
    if (!searchQuery.trim()) return allFollowUps;
    
    const query = searchQuery.toLowerCase();
    return allFollowUps.filter(followUp => {
      const remarkMatch = followUp.remark.toLowerCase().includes(query);
      const dateMatch = followUp.date.includes(query);
      const creatorName = users.find(u => u.id === followUp.createdBy)?.name || "";
      const creatorMatch = creatorName.toLowerCase().includes(query);
      
      return remarkMatch || dateMatch || creatorMatch;
    });
  }, [allFollowUps, searchQuery, users]);

  // Apply sort order
  const sortedFollowUps = useMemo(() => {
    const sorted = [...filteredFollowUps];
    if (sortOrder === "desc") {
      sorted.reverse();
    }
    return sorted;
  }, [filteredFollowUps, sortOrder]);

  const toggleSort = () => {
    setSortOrder(prev => prev === "asc" ? "desc" : "asc");
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const getCreatorName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.name || "Unknown User";
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (timeStr: string) => {
    return timeStr;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const shouldTruncate = (text: string) => {
    return text.length > 120;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>
            Follow-Up History
            {directorName && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                for {directorName}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Search and Sort Controls */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by remark, date, or creator..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={toggleSort}
            title={sortOrder === "asc" ? "Oldest First" : "Newest First"}
          >
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        </div>

        {/* Timeline */}
        <ScrollArea className="h-[500px] pr-4">
          {sortedFollowUps.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? "No follow-ups match your search" : "No follow-ups found"}
            </div>
          ) : (
            <div className="space-y-4">
              {sortedFollowUps.map((followUp, index) => {
                const isActive = !followUp.status || followUp.status === "active";
                const isExpanded = expandedIds.has(followUp.id);
                const remarkNeedsTruncation = shouldTruncate(followUp.remark);
                const displayRemark = remarkNeedsTruncation && !isExpanded
                  ? followUp.remark.substring(0, 120) + "..."
                  : followUp.remark;

                return (
                  <div key={followUp.id} className="relative">
                    {/* Timeline connector */}
                    {index < sortedFollowUps.length - 1 && (
                      <div className="absolute left-[11px] top-8 bottom-0 w-0.5 bg-border" />
                    )}

                    {/* Timeline dot */}
                    <div className="flex gap-4">
                      <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 mt-1 ${
                        isActive 
                          ? "bg-blue-500 border-blue-600" 
                          : "bg-gray-400 border-gray-500"
                      }`} />

                      {/* Content */}
                      <div className={`flex-1 pb-6 ${isActive ? "bg-blue-50 dark:bg-blue-950/20" : ""} p-4 rounded-lg border`}>
                        {/* Header */}
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={isActive ? "default" : "secondary"} className={isActive ? "bg-blue-600" : "bg-gray-500"}>
                              {isActive ? "Active" : "Updated"}
                            </Badge>
                            {!isActive && (
                              <Badge variant="outline" className="text-xs">
                                Updated from earlier follow-up
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                            {formatTimestamp(followUp.createdAt)}
                          </span>
                        </div>

                        {/* Follow-up Details */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-4 text-sm">
                            <div>
                              <span className="font-semibold">Date:</span>{" "}
                              <span className="text-muted-foreground">{formatDate(followUp.date)}</span>
                            </div>
                            <div>
                              <span className="font-semibold">Time:</span>{" "}
                              <span className="text-muted-foreground">{formatTime(followUp.time)}</span>
                            </div>
                          </div>

                          {/* Remark */}
                          <div>
                            <span className="font-semibold text-sm">Remark:</span>
                            <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                              {displayRemark}
                            </p>
                            {remarkNeedsTruncation && (
                              <Button
                                variant="link"
                                size="sm"
                                onClick={() => toggleExpand(followUp.id)}
                                className="p-0 h-auto mt-1 text-xs"
                              >
                                {isExpanded ? (
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
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div>
                              <span className="font-semibold">Created by:</span>{" "}
                              {getCreatorName(followUp.createdBy)}
                            </div>
                            {followUp.directorName && (
                              <div>
                                <span className="font-semibold">Director:</span>{" "}
                                {followUp.directorName}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Summary */}
        <div className="text-sm text-muted-foreground border-t pt-4">
          Showing {sortedFollowUps.length} of {allFollowUps.length} follow-up{allFollowUps.length !== 1 ? "s" : ""}
          {searchQuery && ` (filtered)`}
        </div>
      </DialogContent>
    </Dialog>
  );
}
