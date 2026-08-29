import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export default function Metric({ label, value, tooltip }: {label: string, value: string, tooltip: string}) {
    return (
        <div className="rounded-lg p-3">
            <Tooltip>
                <TooltipTrigger>
                    <p className="mb-1 flex items-center gap-1 cursor-help">
                        {label} <span className="text-[10px] rounded-full border border-border w-3.5 h-3.5 flex items-center justify-center leading-none ">
                            ?
                        </span>
                    </p>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{tooltip}</p>
                </TooltipContent>
            </Tooltip>
            <p className="text-xl font-medium">{value}</p>
        </div>
    )
}