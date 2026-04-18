import { cn } from "@/lib/utils";

interface RiskMeterProps {
  score: number; // 0 to 100
  className?: string;
}

export function RiskMeter({ score, className }: RiskMeterProps) {
  let color = "bg-success";
  let label = "Low Risk";
  let textColor = "text-success";
  
  if (score >= 40 && score < 75) {
    color = "bg-warning";
    label = "Medium Risk";
    textColor = "text-warning";
  } else if (score >= 75) {
    color = "bg-danger";
    label = "High Risk";
    textColor = "text-danger";
  }

  // Width is percentage. We clamp it between 0 and 100
  const widthPercentage = Math.min(Math.max(score, 0), 100);

  return (
    <div className={cn("w-full flex flex-col gap-3", className)}>
      <div className="flex justify-between items-end text-[18px] font-bold">
        <span className="text-primary dark:text-primary-foreground">Risk Level</span>
        <div className={cn("px-3 py-1 rounded-full text-white text-[14px]", color)}>
          {label} ({Math.round(score)}/100)
        </div>
      </div>
      
      {/* Background track */}
      <div className="relative h-4 w-full rounded-full bg-border overflow-hidden">
        {/* Animated fill */}
        <div
          className={cn("absolute top-0 left-0 bottom-0 transition-all duration-1000 ease-out", color)}
          style={{ width: `${widthPercentage}%` }}
        />
      </div>
      
      <div className="flex justify-between text-[14px] font-semibold text-muted-foreground px-1">
        <span>0</span>
        <span>50</span>
        <span>100</span>
      </div>
    </div>
  );
}
