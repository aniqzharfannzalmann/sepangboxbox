import { TableSkeleton } from "@/components/ui/Skeleton";

/*
 * /compare is dynamic and makes two upstream requests, so streaming a skeleton
 * is worth it here. It also never calls notFound(), which is what makes a
 * loading boundary safe on this route — see the note in Skeleton.tsx.
 */
export default function Loading() {
  return <TableSkeleton rows={9} />;
}
