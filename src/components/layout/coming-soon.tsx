import { PageHeader } from "@/components/layout/page-header";

export function ComingSoon({ title, step }: { title: string; step: number }) {
  return (
    <>
      <PageHeader title={title} />
      <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted">
        This module is built in Step {step} of the roadmap.
      </div>
    </>
  );
}
