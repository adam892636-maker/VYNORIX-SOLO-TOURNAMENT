import { Ban, CheckCircle2, Clock, Lock, Radio, Trophy, XCircle } from 'lucide-react';

interface StatusLabelProps {
  status: string;
}

export function StatusLabel({ status }: StatusLabelProps) {
  switch (status) {
    case 'Approved':
    case 'Paid':
    case 'Resolved':
    case 'Registration Open':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 whitespace-nowrap shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>{status}</span>
        </span>
      );
    case 'Live':
    case 'Room Details Released':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-orange-400 whitespace-nowrap shrink-0">
          <Radio className="w-3.5 h-3.5 shrink-0" />
          <span>{status}</span>
        </span>
      );
    case 'Pending':
    case 'Upcoming':
    case 'Open':
    case 'In Review':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400 whitespace-nowrap shrink-0">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>{status}</span>
        </span>
      );
    case 'Registration Closed':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 whitespace-nowrap shrink-0">
          <Lock className="w-3.5 h-3.5 shrink-0" />
          <span>{status}</span>
        </span>
      );
    case 'Completed':
    case 'Closed':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-300 whitespace-nowrap shrink-0">
          <Trophy className="w-3.5 h-3.5 shrink-0" />
          <span>{status}</span>
        </span>
      );
    case 'Rejected':
    case 'Cancelled':
    case 'Banned':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-400 whitespace-nowrap shrink-0">
          {status === 'Banned' ? <Ban className="w-3.5 h-3.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 shrink-0" />}
          <span>{status}</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 whitespace-nowrap shrink-0">
          <span>{status}</span>
        </span>
      );
  }
}
