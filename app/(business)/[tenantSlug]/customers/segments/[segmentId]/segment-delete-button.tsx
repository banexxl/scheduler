"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Button from "@mui/material/Button";
import { deleteSegmentAction } from "@/features/segmentation/actions/segment-actions";

type Props = {
  tenantSlug: string;
  segmentId: string;
};

export default function SegmentDeleteButton({ tenantSlug, segmentId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!confirm("Delete this segment? This action cannot be undone.")) return;
    startTransition(async () => {
      const result = await deleteSegmentAction(tenantSlug, segmentId);
      if (result.success) {
        router.push(`/${tenantSlug}/customers/segments`);
      }
    });
  };

  return (
    <Button variant="outlined" color="error" size="small" onClick={handleDelete} disabled={pending}>
      Delete
    </Button>
  );
}
