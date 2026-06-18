import { Button } from "./button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  isLoading?: boolean;
  itemLabel?: string;
}

export function PaginationControls({
  currentPage,
  totalPages,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  isLoading = false,
  itemLabel = 'items',
}: PaginationControlsProps) {
  const start = currentPage * pageSize + 1;
  const end = Math.min((currentPage + 1) * pageSize, totalCount);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Show</span>
        <Select
          value={pageSize.toString()}
          onValueChange={(val: string) => onPageSizeChange(Number(val))}
          disabled={isLoading}
        >
          <SelectTrigger className="h-8 w-[70px]">
            <SelectValue placeholder={pageSize.toString()} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
          </SelectContent>
        </Select>
        <span>
          entries. Showing {totalCount > 0 ? start : 0} – {end} of {totalCount} {itemLabel}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 0 || isLoading}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Prev
        </Button>
        <div className="flex items-center gap-1">
          {(() => {
            const pages = [];
            const maxVisiblePages = 5;
            
            if (totalPages <= maxVisiblePages) {
              // Show all pages if total is less than max
              for (let i = 0; i < totalPages; i++) {
                pages.push(
                  <Button
                    key={i}
                    variant={currentPage === i ? "default" : "outline"}
                    size="sm"
                    className="w-8 h-8 p-0"
                    onClick={() => onPageChange(i)}
                    disabled={isLoading}
                  >
                    {i + 1}
                  </Button>
                );
              }
            } else {
              // Show first page
              pages.push(
                <Button
                  key={0}
                  variant={currentPage === 0 ? "default" : "outline"}
                  size="sm"
                  className="w-8 h-8 p-0"
                  onClick={() => onPageChange(0)}
                  disabled={isLoading}
                >
                  1
                </Button>
              );

              // Show ellipsis if current page is far from start
              if (currentPage > 2) {
                pages.push(
                  <span key="ellipsis-start" className="px-2">...</span>
                );
              }

              // Show pages around current page
              const startPage = Math.max(1, currentPage - 1);
              const endPage = Math.min(totalPages - 2, currentPage + 1);
              
              for (let i = startPage; i <= endPage; i++) {
                pages.push(
                  <Button
                    key={i}
                    variant={currentPage === i ? "default" : "outline"}
                    size="sm"
                    className="w-8 h-8 p-0"
                    onClick={() => onPageChange(i)}
                    disabled={isLoading}
                  >
                    {i + 1}
                  </Button>
                );
              }

              // Show ellipsis if current page is far from end
              if (currentPage < totalPages - 3) {
                pages.push(
                  <span key="ellipsis-end" className="px-2">...</span>
                );
              }

              // Show last page
              pages.push(
                <Button
                  key={totalPages - 1}
                  variant={currentPage === totalPages - 1 ? "default" : "outline"}
                  size="sm"
                  className="w-8 h-8 p-0"
                  onClick={() => onPageChange(totalPages - 1)}
                  disabled={isLoading}
                >
                  {totalPages}
                </Button>
              );
            }
            
            return pages;
          })()}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages - 1 || isLoading}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
