import { Link } from "react-router-dom";
import { Blocks } from "lucide-react";

/**
 * Clickable badge showing which block a record was anchored in.
 * Deep-links into the Blockchain Explorer with that block already open.
 */
export default function BlockLink({ blockId }) {
  if (blockId === null || blockId === undefined) {
    return <span className="text-slate-400">—</span>;
  }

  return (
    <Link
      to={`/blockchain?block=${blockId}`}
      title={`View block #${blockId} on the chain`}
      className="badge bg-accent-500/10 text-accent-600 transition-colors hover:bg-accent-500/20 dark:text-accent-400"
    >
      <Blocks size={11} /> #{blockId}
    </Link>
  );
}
