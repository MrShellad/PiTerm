import { CardSize, ViewMode } from "../domain/types";
import { ServerCardSkeleton } from "./ServerCardSkeleton";

const CARD_WIDTHS: Record<CardSize, string> = {
  sm: "290px",
  md: "350px",
  lg: "410px",
};

interface Props {
  viewMode: ViewMode;
  cardSize: CardSize;
}

export const ServerListSkeleton = ({ viewMode, cardSize }: Props) => {
  if (viewMode === "list") {
    return (
      <div className="h-full overflow-hidden rounded-xl border border-border/50 bg-card/35" aria-hidden="true">
        <div className="grid h-10 grid-cols-[2fr_1.4fr_1fr_1fr_96px] items-center gap-4 border-b border-border/50 bg-muted/30 px-4">
          {["w-24", "w-20", "w-14", "w-16", "w-12"].map((width, index) => (
            <div key={index} className={`h-2 rounded-full bg-muted-foreground/15 ${width}`} />
          ))}
        </div>
        <div className="animate-pulse">
          {Array.from({ length: 7 }).map((_, row) => (
            <div key={row} className="grid h-14 grid-cols-[2fr_1.4fr_1fr_1fr_96px] items-center gap-4 border-b border-border/35 px-4 last:border-0">
              <div className="flex items-center gap-3"><div className="h-7 w-7 rounded-lg bg-muted" /><div className="h-2.5 w-28 rounded-full bg-muted" /></div>
              <div className="h-2.5 w-24 rounded-full bg-muted" />
              <div className="h-5 w-14 rounded-full bg-muted" />
              <div className="h-2.5 w-16 rounded-full bg-muted" />
              <div className="h-7 w-20 rounded-md bg-muted" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="grid h-full content-start justify-center gap-5 overflow-hidden animate-pulse"
      style={{ gridTemplateColumns: `repeat(auto-fill, ${CARD_WIDTHS[cardSize]})` }}
      aria-hidden="true"
    >
      {Array.from({ length: 8 }).map((_, index) => (
        <ServerCardSkeleton key={index} size={cardSize} />
      ))}
    </div>
  );
};
